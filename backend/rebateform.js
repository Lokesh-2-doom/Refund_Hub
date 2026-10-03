// ============================================================
//  rebateform.js
//  All claim submission logic (Mess, Fest, Medical).
//  Place this file in the same directory as server.js.
//
//  Admin settings enforced:
//    • messRebateRateDaily      → calculates rebate amount
//    • maxMessRebateDays        → rejects if days exceed limit
//    • maxFestReimbursement     → caps fest claim amount
//    • maxMedicalReimbursement  → caps medical claim amount
//    • maxFileUploadMB          → validated per-file on multer
//    • autoApproveBelow         → auto-sets status to APPROVED
//    • maxClaimsPerMonth        → limits submissions per student
//    • portalActive             → blocks all claims if false
//    • maintenanceMode          → blocks all claims if true
//    • claimExpiryDays          → (stored on claim for expiry jobs)
// ============================================================

const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { ServerSettings } = require('./models/superadmin_setting');
const RefundRequest = require('./models/refundRequest');
const User = require('./models/user');
const { FestMember } = require('./models/fest');

// ─── Cloudinary / Multer Setup (driven by admin settings) ────

/**
 * Build a fresh multer upload middleware using current admin settings.
 * Called once at startup; call again if settings are hot-reloaded.
 */
function buildUploadMiddleware(maxFileMB = 10) {
  const maxBytes = maxFileMB * 1024 * 1024;

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => ({
      folder: 'RefundHub_Receipts',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
      public_id: `${Date.now()}-${(file.originalname || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    }),
  });

  return multer({
    storage,
    limits: { fileSize: maxBytes, files: 5 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('Only JPG, JPEG, PNG, and PDF files are allowed.'));
      }
      cb(null, true);
    },
  });
}

// ─── Shared Helpers ───────────────────────────────────────────

const createClaimId = (prefix = 'CLM') => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${random}`;
};

const mapUploadedFilesToAttachments = (files = []) =>
  files.map((file) => ({
    filename: file.originalname || file.filename,
    url: file.secure_url || file.path || file.url,
    mimetype: file.mimetype,
    uploadedAt: new Date(),
  }));

const normalizeClaim = (claimDoc) => {
  const claim = claimDoc.toObject ? claimDoc.toObject() : claimDoc;
  const attachments = Array.isArray(claim.attachments) ? claim.attachments : [];
  return {
    ...claim,
    attachments,
    receiptUrls: attachments.map((a) => a.url).filter(Boolean),
  };
};

const getUploadErrorMessage = (err) => {
  if (!err) return 'File upload failed.';
  if (err.code === 'LIMIT_FILE_SIZE') return `Each file must be within the allowed size limit.`;
  if (err.code === 'LIMIT_FILE_COUNT') return 'You can upload at most 5 files.';
  if (err.message?.includes('aborted')) {
    return 'Upload was interrupted. Please retry with a stable connection or a smaller file.';
  }
  return `File upload failed: ${err.message}`;
};

/**
 * Guard: check portalActive and maintenanceMode from ServerSettings.
 * Returns { blocked: true, message } if blocked, else { blocked: false, settings }.
 */
async function checkPortalGuard() {
  const settings = await ServerSettings.getSettings();
  if (settings.maintenanceMode) {
    return { blocked: true, message: settings.maintenanceMessage || 'System is under maintenance.' };
  }
  if (!settings.portalActive) {
    return { blocked: true, message: 'The claims portal is currently inactive.' };
  }
  return { blocked: false, settings };
}

/**
 * Guard: check whether a student has exceeded maxClaimsPerMonth.
 */
async function checkMonthlyClaimLimit(userId, maxPerMonth) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await RefundRequest.countDocuments({
    student: userId,
    createdAt: { $gte: startOfMonth },
  });

  return count >= maxPerMonth;
}

// ─── Route Handlers ───────────────────────────────────────────

/**
 * POST /api/claims/mess
 * Body (multipart/form-data):
 *   studentId, fromDate, toDate, reason
 *   files: receiptFiles[] (optional)
 */
async function submitMessRebate(req, res) {
  // Portal guard
  const guard = await checkPortalGuard();
  if (guard.blocked) return res.status(503).json({ message: guard.message });

  const settings = guard.settings;

  // Dynamic multer using current maxFileUploadMB
  const upload = buildUploadMiddleware(settings.maxFileUploadMB);
  const uploadMiddleware = upload.array('receiptFiles', 5);

  // Wrap with timeout to prevent hanging on Cloudinary uploads
  const UPLOAD_TIMEOUT = 30000; // 30 seconds
  let uploadCompleted = false;
  const timeoutHandle = setTimeout(() => {
    if (!uploadCompleted && !res.headersSent) {
      console.error('[Mess] Upload timeout after 30 seconds');
      return res.status(408).json({ message: 'File upload timed out. Please check your connection and try again.' });
    }
  }, UPLOAD_TIMEOUT);

  uploadMiddleware(req, res, async function (err) {
    uploadCompleted = true;
    clearTimeout(timeoutHandle);
    
    if (err) {
      console.error('[Mess] Multer/Cloudinary Error:', err.code, err.message);
      return res.status(400).json({ message: getUploadErrorMessage(err) });
    }

    try {
      const { studentId, fromDate, toDate, reason } = req.body;

      const user = await User.findOne({ studentId: String(studentId).toUpperCase() });
      if (!user) return res.status(404).json({ message: 'User not found.' });

      // Monthly claim limit
      const overLimit = await checkMonthlyClaimLimit(user._id, settings.maxClaimsPerMonth);
      if (overLimit) {
        return res.status(429).json({
          message: `You have reached the monthly claim limit of ${settings.maxClaimsPerMonth} claims.`,
        });
      }

      const absenceFrom = fromDate ? new Date(fromDate) : null;
      const absenceTo = toDate ? new Date(toDate) : null;

      if (!absenceFrom || isNaN(absenceFrom.getTime()))
        return res.status(400).json({ message: 'Valid from date is required.' });
      if (!absenceTo || isNaN(absenceTo.getTime()))
        return res.status(400).json({ message: 'Valid to date is required.' });
      if (absenceFrom > absenceTo)
        return res.status(400).json({ message: 'To date must be after from date.' });

      const absenceDays = Math.floor((absenceTo - absenceFrom) / 86400000) + 1;

      if (absenceDays < 5)
        return res.status(400).json({ message: 'Mess rebate requires a minimum absence of 5 days.' });

      if (absenceDays > settings.maxMessRebateDays)
        return res.status(400).json({
          message: `Absence period exceeds the maximum allowed ${settings.maxMessRebateDays} days.`,
        });

      const calculatedAmount = absenceDays * settings.messRebateRateDaily;

      // Determine status: auto-approve if below threshold
      const status =
        calculatedAmount <= settings.autoApproveBelow ? 'APPROVED' : 'PENDING_MESS_MANAGER';

      const attachments = mapUploadedFilesToAttachments(req.files);

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + settings.claimExpiryDays);

      const newClaim = new RefundRequest({
        claimId: createClaimId('MESS'),
        student: user._id,
        studentRoll: user.studentId,
        requestType: 'MESS_REBATE',
        title: 'Mess Rebate Application',
        description: reason,
        amount: calculatedAmount,
        attachments,
        status,
        messAbsenceFrom: absenceFrom,
        messAbsenceTo: absenceTo,
        messAbsenceDays: absenceDays,
        expiresAt,
        history: [
          {
            action: 'SUBMITTED',
            byUser: user._id,
            byName: user.fullName,
            comments:
              status === 'APPROVED'
                ? `Auto-approved (amount ₹${calculatedAmount} below threshold ₹${settings.autoApproveBelow})`
                : 'Claim applied',
          },
        ],
      });

      await newClaim.save();
      res.status(201).json({ message: 'Mess rebate submitted!', claim: normalizeClaim(newClaim) });
    } catch (dbErr) {
      console.error('Database Error (mess):', dbErr);
      res.status(500).json({ message: 'Server error while saving mess rebate.' });
    }
  });
}

/**
 * POST /api/claims/fest
 * Body (multipart/form-data):
 *   studentId, festName, team, transactionId, expenseAmount, expenseDescription
 *   files: receiptFiles[] (required, min 1)
 *
 * Only accessible to fest members (validated server-side).
 */
async function submitFestClaim(req, res) {
  const guard = await checkPortalGuard();
  if (guard.blocked) return res.status(503).json({ message: guard.message });

  const settings = guard.settings;
  const upload = buildUploadMiddleware(settings.maxFileUploadMB);
  const uploadMiddleware = upload.array('receiptFiles', 5);

  uploadMiddleware(req, res, async function (err) {
    if (err) {
      console.error('Multer/Cloudinary Error (fest):', err);
      return res.status(400).json({ message: getUploadErrorMessage(err) });
    }

    try {
      const { studentId, festId, festMemberId, transactionId, expenseAmount, expenseDescription } = req.body;

      const user = await User.findOne({ studentId: String(studentId).toUpperCase() });
      if (!user) return res.status(404).json({ message: 'User not found.' });

      // ── Fest membership check (server-side guard) ──
      // Verify they belong to this specific fest and grab their committee
      let membership = null;
      if (festMemberId && mongoose.Types.ObjectId.isValid(festMemberId)) {
        membership = await FestMember.findOne({
          _id: festMemberId,
          user: user._id,
          fest: festId,
          isActive: true,
        }).populate('fest');
      }

      if (!membership) {
        const memberships = await FestMember.find({
          user: user._id,
          fest: festId,
          isActive: true,
        }).populate('fest');

        if (memberships.length === 1) {
          membership = memberships[0];
        } else if (memberships.length > 1) {
          return res.status(400).json({
            message: 'Please select the exact fest role before submitting this claim.',
          });
        }
      }

      if (!membership) {
        return res.status(403).json({
          message: 'You are not an active member of the selected fest.',
        });
      }

      // Auto-extract exact fest name and committee from the database
      const finalFestName = membership.fest.name;
      const finalCommitteeName = membership.committee || 'Member';

      // Monthly claim limit
      const overLimit = await checkMonthlyClaimLimit(user._id, settings.maxClaimsPerMonth);
      if (overLimit) {
        return res.status(429).json({ message: `Monthly claim limit of ${settings.maxClaimsPerMonth} reached.` });
      }

      // Amount cap
      const parsedAmount = parseFloat(expenseAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ message: 'Valid expense amount is required.' });
      if (parsedAmount > settings.maxFestReimbursement) {
        return res.status(400).json({ message: `Amount exceeds maximum fest reimbursement of ₹${settings.maxFestReimbursement.toLocaleString()}.` });
      }

      const attachments = mapUploadedFilesToAttachments(req.files);
      if (attachments.length === 0) return res.status(400).json({ message: 'At least one document is required for fest claims.' });

      const status = parsedAmount <= settings.autoApproveBelow ? 'APPROVED' : 'PENDING_COORD';
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + settings.claimExpiryDays);

      const newClaim = new RefundRequest({
        claimId: createClaimId('FEST'),
        student: user._id,
        studentRoll: user.studentId,
        requestType: 'FEST_REIMBURSEMENT',
        festId: membership.fest._id,
        festMember: membership._id,
        festName: finalFestName,         // Saved from DB
        committeeName: finalCommitteeName,
        submitterFestPosition: membership.position,
        teamName: finalCommitteeName,    // Saved from DB (Mapped to teamName in RefundRequest)
        title: `${finalFestName} Reimbursement`,
        amount: parsedAmount,
        transactionId,
        description: expenseDescription,
        attachments,
        status,
        expiresAt,
        history: [{
            action: 'SUBMITTED',
            byUser: user._id,
            byName: user.fullName,
            comments: status === 'APPROVED' ? `Auto-approved (₹${parsedAmount} ≤ ₹${settings.autoApproveBelow})` : 'Claim applied',
        }],
      });

      await newClaim.save();
      res.status(201).json({ message: 'Fest claim submitted!', claim: normalizeClaim(newClaim) });
    } catch (dbErr) {
      console.error('Database Error (fest):', dbErr);
      if (dbErr.code === 11000 && dbErr.keyPattern?.transactionId) {
        return res.status(400).json({ message: 'This Transaction ID has already been used.' });
      }
      res.status(500).json({ message: 'Server error while saving fest claim.' });
    }
  });
}

/**
 * POST /api/claims/hospital
 * Body (multipart/form-data):
 *   studentId, hospitalName, treatmentDate, amount, description
 *   files: receiptFiles[] (required, min 1)
 */
async function submitMedicalRebate(req, res) {
  req.on('aborted', () => {
    console.error('Medical claim upload aborted by client.');
  });

  const guard = await checkPortalGuard();
  if (guard.blocked) return res.status(503).json({ message: guard.message });

  const settings = guard.settings;
  const upload = buildUploadMiddleware(settings.maxFileUploadMB);
  const uploadMiddleware = upload.array('receiptFiles', 5);

  uploadMiddleware(req, res, async function (err) {
    if (err) {
      console.error('Multer/Cloudinary Error (medical):', err);
      return res.status(400).json({ message: getUploadErrorMessage(err) });
    }

    try {
      const { studentId, hospitalName, treatmentDate, amount, description } = req.body;

      const user = await User.findOne({ studentId: String(studentId).toUpperCase() });
      if (!user) return res.status(404).json({ message: 'User not found.' });

      // Monthly claim limit
      const overLimit = await checkMonthlyClaimLimit(user._id, settings.maxClaimsPerMonth);
      if (overLimit) {
        return res.status(429).json({
          message: `Monthly claim limit of ${settings.maxClaimsPerMonth} reached.`,
        });
      }

      if (!hospitalName?.trim())
        return res.status(400).json({ message: 'Hospital name is required.' });

      const treatmentDateParsed = treatmentDate ? new Date(treatmentDate) : null;
      if (!treatmentDateParsed || isNaN(treatmentDateParsed.getTime()))
        return res.status(400).json({ message: 'Valid treatment date is required.' });

      const parsedAmount = Number(amount);
      if (!parsedAmount || parsedAmount <= 0)
        return res.status(400).json({ message: 'Valid amount is required.' });

      if (parsedAmount > settings.maxMedicalReimbursement) {
        return res.status(400).json({
          message: `Amount exceeds maximum medical reimbursement of ₹${settings.maxMedicalReimbursement.toLocaleString()}.`,
        });
      }

      const attachments = mapUploadedFilesToAttachments(req.files);
      if (attachments.length === 0)
        return res.status(400).json({ message: 'At least one medical bill is required.' });

      const status = parsedAmount <= settings.autoApproveBelow ? 'APPROVED' : 'PENDING_ACADEMIC';

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + settings.claimExpiryDays);

      const treatmentDateText = treatmentDateParsed.toISOString().split('T')[0];
      const descText = description?.trim()
        ? `${hospitalName} | Treatment: ${treatmentDateText} | ${description.trim()}`
        : `${hospitalName} | Treatment: ${treatmentDateText}`;

      const newClaim = new RefundRequest({
        claimId: createClaimId('MED'),
        student: user._id,
        studentRoll: user.studentId,
        requestType: 'MEDICAL_REBATE',
        title: `Medical Rebate - ${hospitalName}`,
        description: descText,
        amount: parsedAmount,
        attachments,
        status,
        expiresAt,
        history: [
          {
            action: 'SUBMITTED',
            byUser: user._id,
            byName: user.fullName,
            comments:
              status === 'APPROVED'
                ? `Auto-approved (₹${parsedAmount} ≤ ₹${settings.autoApproveBelow})`
                : 'Claim applied',
          },
        ],
      });

      await newClaim.save();
      res.status(201).json({ message: 'Medical rebate submitted!', claim: normalizeClaim(newClaim) });
    } catch (dbErr) {
      console.error('Database Error (medical):', dbErr);
      res.status(500).json({ message: 'Server error while saving medical rebate.' });
    }
  });
}

// ─── Register all rebate routes on an Express app/router ─────

/**
 * Call this from server.js:
 *
 *   const { registerRebateRoutes } = require('./rebateform');
 *   registerRebateRoutes(app);
 */
function registerRebateRoutes(app) {
  app.post('/api/claims/mess', submitMessRebate);
  app.post('/api/claims/fest', submitFestClaim);
  app.post('/api/claims/hospital', submitMedicalRebate);
}

module.exports = {
  registerRebateRoutes,
  // Export individual handlers if you prefer manual registration
  submitMessRebate,
  submitFestClaim,
  submitMedicalRebate,
  // Export helpers for testing
  createClaimId,
  mapUploadedFilesToAttachments,
  normalizeClaim,
  checkPortalGuard,
  checkMonthlyClaimLimit,
  buildUploadMiddleware,
};