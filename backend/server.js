// ============================================================
//  server.js  —  Refund Hub API
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const User = require('./models/user');
const RefundRequest = require('./models/refundRequest');
const { AuditLog, ServerSettings } = require('./models/superadmin_setting');
const { Fest, FestMember } = require('./models/fest');

const { registerRebateRoutes } = require('./rebateform');
const { registerVerifyRoutes } = require('./verifyrebate');

// ─── App (must be created BEFORE routes or middleware use it) ─
const app = express();

// ─── Cloudinary ───────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── CORS (must come FIRST before any other middleware) ───────
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  process.env.VITE_FRONTEND_URL,
].filter(Boolean));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Handle preflight OPTIONS for all routes
app.options('/{*path}', cors());

app.use(express.json());

// ─── DB ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('🚀 Connected to MongoDB Atlas!'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// ─── Rate-limiting middleware ──────────────────────────────────
const rateLimitMap = new Map();
app.use(async (req, res, next) => {
  if (req.path === '/' || req.path === '/api/health' || req.path === '/api/test') return next();
  try {
    const settings = await ServerSettings.getSettings();
    const limit = settings.rateLimitRequestsPerMin || 100;
    const key = req.ip;
    const now = Date.now();
    const windowMs = 60_000;
    if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
    const timestamps = rateLimitMap.get(key).filter(t => now - t < windowMs);
    timestamps.push(now);
    rateLimitMap.set(key, timestamps);
    if (timestamps.length > limit) {
      return res.status(429).json({ message: 'Too many requests. Please slow down.' });
    }
  } catch (_) { /* non-blocking — always fall through */ }
  next();
});

// ─── Serialization helpers ────────────────────────────────────
const serializeUser = (user) => {
  const raw = user?.toObject ? user.toObject() : user;
  const nb = raw?.studentProfile?.bankDetails || {};
  const fb = raw?.bankDetails || {};
  return {
    _id: raw._id,
    fullName: raw.fullName,
    studentId: raw.studentId,
    employeeId: raw.studentId,
    email: raw.email,
    role: raw.role || '',
    userType: raw.userType || '',
    isSuperAdmin: raw.isSuperAdmin || false,
    isSecretary: raw.isSecretary || false,
    isVerified: raw.isVerified ?? false,
    lastLogin: raw.lastLogin || null,
    department: raw.department || 'general',
    institution: raw.institution || '',
    phone: raw.phone || '',
    hostel: raw.hostel || '',
    block: raw.block || '',
    roomNumber: raw.roomNumber || '',
    admissionYear: raw.admissionYear || '',
    messName: raw.messName || '',
    profilePicUrl: raw.profilePicUrl || '',
    bankDetails: {
      accountHolderName: nb.accountHolderName || fb.accountHolderName || '',
      bankName:          nb.bankName          || fb.bankName          || '',
      accountNumber:     nb.accountNumber     || fb.accountNumber     || '',
      ifscCode:          nb.ifscCode          || fb.ifscCode          || '',
    },
  };
};

const normalizeClaim = (claimDoc) => {
  const claim = claimDoc.toObject ? claimDoc.toObject() : claimDoc;
  const attachments = Array.isArray(claim.attachments) ? claim.attachments : [];
  return { ...claim, attachments, receiptUrls: attachments.map(a => a.url).filter(Boolean) };
};

// ─── Email ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendVerificationEmail = async ({ email, fullName, token }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
    throw new Error('Email service not configured.');
  const base = process.env.BACKEND_URL || `http://127.0.0.1:${process.env.PORT || 8000}`;
  const url  = `${base.replace(/\/$/, '')}/api/verify/${token}`;
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to:      email,
    subject: 'Verify your Refund Hub account',
    text:    `Hello ${fullName}, verify your account: ${url}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="color:#166534">Verify your Refund Hub account</h2>
        <p>Hello ${fullName},</p>
        <p>Please confirm your email address to activate your account.</p>
        <a href="${url}" style="display:inline-block;padding:12px 18px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Verify Email
        </a>
        <p style="margin-top:16px">Or open: <a href="${url}">${url}</a></p>
      </div>
    `,
  });
};

transporter.verify(err => {
  if (err) console.error('❌ Nodemailer config error:', err.message);
  else     console.log('✅ Nodemailer ready');
});

// ─── Health ───────────────────────────────────────────────────
app.get('/',           (_req, res) => res.send('Refund Hub API is running! 🟢'));
app.get('/api/health', (_req, res) => res.status(200).json({ success: true, timestamp: new Date().toISOString() }));
app.get('/api/test',   (_req, res) => res.status(200).json({ message: 'Backend operational 🚀', timestamp: new Date().toISOString() }));

// ─── Register Routes ──────────────────────────────────────────
registerRebateRoutes(app);
registerVerifyRoutes(app);

// ─── STUDENT REGISTRATION ─────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, studentId, email, phone, password,
            accountHolderName, bankName, accountNumber, ifscCode } = req.body;

    const settings = await ServerSettings.getSettings();
    if (!settings.registrationOpen) {
      return res.status(403).json({ message: 'Student registration is currently closed.' });
    }

    const rollRegex = /^[12][0-9][012][123](AI|CB|CE|CS|CT|EC|EE|ES|MC|ME|MM|PH|PR|CM|GT|MT|PC|ST|VL)[0-9]{2}$/i;
    if (!rollRegex.test(studentId))
      return res.status(400).json({ message: 'Invalid roll number format!' });
    if (!/^\d{11,16}$/.test(String(accountNumber || '').trim()))
      return res.status(400).json({ message: 'Account number must be 11–16 digits.' });
    if (!/^[A-Z]{4}\d{7}$/i.test(String(ifscCode || '').trim()))
      return res.status(400).json({ message: 'Invalid IFSC code format.' });

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { studentId: studentId.toUpperCase() }],
    });
    if (existing) return res.status(400).json({ message: 'Email or Roll Number already exists!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      fullName, studentId: studentId.toUpperCase(), email: email.toLowerCase(),
      phone, password: hashedPassword, verificationToken: token,
      isVerified: false, userType: 'STUDENT', role: 'STUDENT',
      department: 'general',
      studentProfile: { bankDetails: { accountHolderName, bankName, accountNumber, ifscCode } },
    });

    await newUser.save();

    try {
      await sendVerificationEmail({ email: newUser.email, fullName: newUser.fullName, token });
    } catch (mailError) {
      await User.deleteOne({ _id: newUser._id });
      throw mailError;
    }

    res.status(201).json({ message: 'Registration successful! Check your email.' });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ message: err.message || 'Server error during registration.' });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const settings = await ServerSettings.getSettings();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const minutesLeft = Math.ceil((user.lockedUntil - now) / 60000);
      return res.status(403).json({
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateFields = { failedLoginAttempts: failedAttempts };
      if (failedAttempts >= settings.maxLoginAttempts) {
        const lockedUntil = new Date(now.getTime() + settings.lockoutDurationMinutes * 60000);
        updateFields.lockedUntil = lockedUntil;
        updateFields.failedLoginAttempts = 0;
        await User.updateOne({ _id: user._id }, { $set: updateFields });
        return res.status(403).json({
          message: `Too many failed attempts. Account locked for ${settings.lockoutDurationMinutes} minutes.`,
        });
      }
      await User.updateOne({ _id: user._id }, { $set: updateFields });
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isVerified)
      return res.status(403).json({ message: 'Please verify your email before logging in.' });

    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date(), failedLoginAttempts: 0 }, $unset: { lockedUntil: '' } },
    );

    res.status(200).json({ message: 'Login successful', user: serializeUser(user) });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ─── EMAIL VERIFICATION ───────────────────────────────────────
app.get('/api/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token, isVerified: false });
    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (!user) return res.redirect(`${FRONTEND}/verify?status=invalid`);
    user.isVerified = true;
    user.verificationToken = null;
    await user.save();
    res.redirect(`${FRONTEND}/verify?status=success`);
  } catch (err) {
    console.error('Verification Error:', err);
    res.status(500).send('<h2>Server error during verification.</h2>');
  }
});

// ─── UPDATE USER PROFILE ──────────────────────────────────────
app.put('/api/user/update', async (req, res) => {
  try {
    const { _id, studentId, fullName, email, phone, institution,
            department, hostel, block, roomNumber, admissionYear,
            messName, profilePicUrl, bankDetails } = req.body;

    if (phone && !/^\d{10}$/.test(phone))
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });

    let query = {};
    if (_id) {
      if (!mongoose.Types.ObjectId.isValid(_id))
        return res.status(400).json({ message: `Invalid Database ID: "${_id}".` });
      query = { _id };
    } else if (studentId) {
      query = { studentId: studentId.toUpperCase() };
    } else {
      return res.status(400).json({ message: 'ID or Student ID is required.' });
    }

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const u = {};
    if (typeof fullName      === 'string') u.fullName      = fullName;
    if (typeof phone         === 'string') u.phone         = phone;
    if (typeof institution   === 'string') u.institution   = institution;
    if (typeof department    === 'string') u.department    = department;
    if (typeof hostel        === 'string') u.hostel        = hostel;
    if (typeof block         === 'string') u.block         = block;
    if (typeof roomNumber    === 'string') u.roomNumber    = roomNumber;
    if (typeof admissionYear === 'string') u.admissionYear = admissionYear;
    if (typeof messName      === 'string') u.messName      = messName;
    if (typeof profilePicUrl === 'string') u.profilePicUrl = profilePicUrl;

    if (!user.isSuperAdmin && user.role !== 'SUPER_ADMIN')
      if (email) u.email = email.toLowerCase();

    if (bankDetails && typeof bankDetails === 'object') {
      if (bankDetails.accountNumber != null && !/^\d{11,16}$/.test(String(bankDetails.accountNumber)))
        return res.status(400).json({ message: 'Account number must be 11–16 digits.' });
      if (bankDetails.ifscCode != null && !/^[A-Z]{4}\d{7}$/i.test(String(bankDetails.ifscCode)))
        return res.status(400).json({ message: 'Invalid IFSC code format.' });
      if (typeof bankDetails.accountHolderName === 'string') u['studentProfile.bankDetails.accountHolderName'] = bankDetails.accountHolderName;
      if (typeof bankDetails.bankName          === 'string') u['studentProfile.bankDetails.bankName']          = bankDetails.bankName;
      if (typeof bankDetails.accountNumber     === 'string') u['studentProfile.bankDetails.accountNumber']     = bankDetails.accountNumber;
      if (typeof bankDetails.ifscCode          === 'string') u['studentProfile.bankDetails.ifscCode']          = bankDetails.ifscCode.toUpperCase();
    }

    const updated = await User.findOneAndUpdate(query, { $set: u }, { new: true, runValidators: true });
    res.status(200).json({ message: 'Profile updated!', user: serializeUser(updated) });
  } catch (err) {
    console.error('Update Error:', err.message);
    res.status(500).json({ message: 'Server error during profile update.' });
  }
});

// ─── USER PROFILE ─────────────────────────────────────────────
app.get('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID.' });
    const user = await User.findById(id).select('-password -verificationToken -resetPasswordToken');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.status(200).json(serializeUser(user));
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

app.get('/api/users/admin/profile', async (_req, res) => {
  try {
    const admin = await User.findOne({
      $or: [{ role: 'superadmin' }, { role: 'Super Administrator' }, { isSuperAdmin: true }],
    }).select('-password');
    if (!admin) return res.status(404).json({ message: 'Superadmin not found.' });
    res.status(200).json(admin);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching admin profile.' });
  }
});

app.get('/api/users/search', async (req, res) => {
  try {
    const q = req.query.query?.toString().trim();
    if (!q) return res.status(400).json({ message: 'Search query is required.' });
    const users = await User.find({
      $or: [
        { studentId: { $regex: q, $options: 'i' } },
        { email:     { $regex: q, $options: 'i' } },
        { fullName:  { $regex: q, $options: 'i' } },
      ],
    }).select('-password -verificationToken -resetPasswordToken').limit(10);
    if (!users.length) return res.status(404).json({ message: 'No user found.' });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error searching user.' });
  }
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────
app.post('/api/users/:id/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password.' });
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await user.save();
    res.status(200).json({ message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Change Password Error:', err);
    res.status(500).json({ message: 'Server error changing password.' });
  }
});

// ─── ROLE UPDATE ──────────────────────────────────────────────
app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!role?.toString().trim()) return res.status(400).json({ message: 'Role is required.' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid user ID.' });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { role: role.toString().trim() } }, { new: true })
      .select('-password -verificationToken -resetPasswordToken');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.status(200).json({ message: `Role updated to '${role}'!`, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating role.' });
  }
});

// ─── STUDENT DASHBOARD ────────────────────────────────────────
app.get('/api/dashboard/:studentId', async (req, res) => {
  try {
    const user = await User.findOne({ studentId: req.params.studentId.toUpperCase() });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const claimDocs = await RefundRequest.find({ student: user._id }).sort({ createdAt: -1 });
    const claims = claimDocs.map(normalizeClaim);

    let totalRefunded = 0, pendingCount = 0, approvedThisMonth = 0;
    const cm = new Date().getMonth(), cy = new Date().getFullYear();

    claims.forEach(c => {
      if (c.status === 'REFUNDED') totalRefunded += c.amount;
      if (['APPROVED', 'REFUNDED'].includes(c.status)) {
        const d = new Date(c.updatedAt);
        if (d.getMonth() === cm && d.getFullYear() === cy) approvedThisMonth++;
      }
      if (c.status.includes('PENDING')) pendingCount++;
    });

    res.status(200).json({
      stats: { totalRefunded, pendingCount, approvedThisMonth },
      recentClaims: claims,
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ message: 'Server error fetching dashboard data.' });
  }
});

// ─── PORTAL SETTINGS ──────────────────────────────────────────
app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await ServerSettings.getSettings();
    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching settings.' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const updated = await ServerSettings.findOneAndUpdate(
      { _singleton: 'GLOBAL' },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true },
    );
    res.status(200).json({ message: 'Settings deployed!', settings: updated });
  } catch (err) {
    console.error('Settings Error:', err);
    res.status(500).json({ message: 'Server error updating settings.' });
  }
});

// ─── FESTS ────────────────────────────────────────────────────
app.get('/api/fests', async (_req, res) => {
  try {
    const fests = await Fest.find({}).sort({ name: 1 });
    res.status(200).json(fests);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching fests.' });
  }
});

app.get('/api/fest-members/fcs', async (_req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const month = new Date().getMonth();
    const academicYear = month >= 6
      ? `${currentYear}-${String(currentYear + 1).slice(2)}`
      : `${currentYear - 1}-${String(currentYear).slice(2)}`;

    const members = await FestMember.find({ position: 'FEST_COORDINATOR', isActive: true, academicYear })
      .populate('user', 'fullName studentId email phone department')
      .populate('fest', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(members);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching FCs.' });
  }
});

app.post('/api/fest-members/assign-fc', async (req, res) => {
  try {
    const { userId, festId, festName, addedBy } = req.body;
    if (!userId || !festId || !festName) return res.status(400).json({ message: 'userId, festId, festName required.' });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid userId.' });
    if (!mongoose.Types.ObjectId.isValid(festId)) return res.status(400).json({ message: 'Invalid festId.' });

    const year = new Date().getFullYear();
    const m = new Date().getMonth();
    const academicYear = m >= 6 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;

    const existing = await FestMember.findOne({ user: userId, fest: festId, academicYear, isActive: true });
    if (existing) return res.status(400).json({ message: 'Already an FC for this fest.' });

    const count = await FestMember.countDocuments({ fest: festId, position: 'FEST_COORDINATOR', academicYear, isActive: true });
    if (count >= 2) return res.status(400).json({ message: 'Maximum 2 FCs already assigned.' });

    const newMember = new FestMember({
      user: userId, fest: festId, position: 'FEST_COORDINATOR', academicYear,
      addedBy: addedBy && mongoose.Types.ObjectId.isValid(addedBy) ? addedBy : null,
      isActive: true,
    });
    await newMember.save();
    await User.findByIdAndUpdate(userId, { $set: { role: `${festName}_FC` } });

    const populated = await FestMember.findById(newMember._id)
      .populate('user', 'fullName studentId email phone department')
      .populate('fest', 'name');

    res.status(201).json({ message: `${festName} FC assigned!`, member: populated });
  } catch (err) {
    console.error('Assign FC error:', err);
    if (err.code === 11000) return res.status(400).json({ message: 'Already assigned for this year.' });
    res.status(500).json({ message: 'Server error assigning FC.' });
  }
});

app.delete('/api/fest-members/:memberId/remove-fc', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.memberId))
      return res.status(400).json({ message: 'Invalid member ID.' });
    const member = await FestMember.findById(req.params.memberId).populate('user', '_id fullName');
    if (!member) return res.status(404).json({ message: 'FC record not found.' });
    member.isActive = false;
    await member.save();
    await User.findByIdAndUpdate(member.user._id, { $set: { role: 'STUDENT' } });
    res.status(200).json({ message: `FC removed. ${member.user.fullName} reverted to STUDENT.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error removing FC.' });
  }
});

app.get('/api/fest-members/my-fests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID.' });
    const members = await FestMember.find({ user: userId, isActive: true }).populate('fest', 'name festName academicYear');
    res.json(members.filter(m => m.fest).map(m => ({
      festId: m.fest._id,
      festName: m.fest.festName || m.fest.name || '',
      academicYear: m.fest.academicYear || m.academicYear || '',
      position: m.position,
      committee: m.committee,
      memberId: m._id,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/fest-members', async (req, res) => {
  try {
    const { festId } = req.query;
    if (!festId || !mongoose.Types.ObjectId.isValid(festId))
      return res.status(400).json({ message: 'Valid festId required.' });
    const members = await FestMember.find({ fest: festId, isActive: true }).populate('user', 'fullName email studentId');
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/fest-members', async (req, res) => {
  try {
    const { userId, festId, position, committee, addedBy, academicYear } = req.body;
    if (!userId || !festId || !position || !academicYear)
      return res.status(400).json({ message: 'userId, festId, position, academicYear required.' });
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(festId))
      return res.status(400).json({ message: 'Invalid userId or festId.' });

    const userModel = mongoose.model('User');
    const u = await userModel.findById(userId);
    if (!u || u.department?.toLowerCase() !== 'general')
      return res.status(403).json({ message: 'Only General dept students can join fest.' });

    const existing = await FestMember.findOne({ user: userId, fest: festId, academicYear, isActive: true });
    if (existing) return res.status(409).json({ message: 'Already a member.' });

    const member = await FestMember.create({
      user: userId, fest: festId, position, committee: committee || null, academicYear,
      addedBy: addedBy && mongoose.Types.ObjectId.isValid(addedBy) ? addedBy : null,
      isActive: true,
    });
    const populated = await FestMember.findById(member._id).populate('user', 'fullName email studentId');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already a member for this year.' });
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/fest-members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    if (memberId === 'remove-fc') return res.status(400).json({ message: 'Use the remove-fc endpoint.' });
    if (!mongoose.Types.ObjectId.isValid(memberId)) return res.status(400).json({ message: 'Invalid member ID.' });
    const member = await FestMember.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found.' });
    if (member.position === 'FEST_COORDINATOR')
      return res.status(400).json({ message: 'Use remove-fc endpoint for FCs.' });
    await member.deleteOne();
    res.json({ message: 'Member removed.', memberId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── ADMIN: CLAIMS ────────────────────────────────────────────
app.get('/api/admin/claims/:status', async (req, res) => {
  try {
    const claims = await RefundRequest.find({ status: req.params.status }).sort({ createdAt: 1 });
    res.status(200).json(claims);
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error.' });
  }
});

app.get('/api/admin/claims', async (req, res) => {
  try {
    const { status } = req.query;
    const statuses = status
      ? String(status).split(',').map(s => s.trim()).filter(Boolean)
      : ['VERIFIED_MESS', 'VERIFIED_MEDICAL', 'VERIFIED_FEST', 'APPROVED'];

    const claims = await RefundRequest.find({ status: { $in: statuses } })
      .populate('student', 'fullName email studentId phone')
      .sort({ updatedAt: -1, createdAt: -1 });

    res.status(200).json(claims);
  } catch (err) {
    console.error('Admin claims fetch error:', err);
    res.status(500).json({ message: 'Server error fetching admin claims.' });
  }
});

app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { secretaryName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { targetId: { $regex: search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      logs: logs.map(log => ({
        _id: log._id,
        secretaryId: log.secretaryId,
        secretaryName: log.secretaryName,
        action: log.action,
        targetCollection: log.targetCollection,
        targetId: log.targetId,
        details: log.details,
        ipAddress: log.ipAddress,
        status: log.status,
        timestamp: log.createdAt,
      })),
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error('Audit logs fetch error:', err);
    res.status(500).json({ message: 'Server error fetching audit logs.' });
  }
});

app.post('/api/admin/update-status', async (req, res) => {
  try {
    const { claimId, status, remarks } = req.body;
    const updated = await RefundRequest.findByIdAndUpdate(
      claimId,
      {
        status,
        $push: {
          history: {
            action: status,
            byUser: null,
            byName: 'System',
            comments: remarks || 'Processed by Verifier',
          },
        },
      },
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: 'Claim not found.' });
    res.status(200).json({ message: `Status updated to ${status}.`, claim: updated });
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error.' });
  }
});

// ─── ADMIN: SECRETARIES ───────────────────────────────────────
app.post('/api/admin/secretaries', async (req, res) => {
  try {
    const { fullName, employeeId, email, phone, password, department, isSuperAdmin } = req.body;
    if (!fullName?.trim()) return res.status(400).json({ message: 'Full name is required.' });
    if (!employeeId?.trim()) return res.status(400).json({ message: 'Employee ID is required.' });
    if (!email || !/^\S+@\S+\.\S+$/.test(String(email).trim()))
      return res.status(400).json({ message: 'Valid email is required.' });
    if (!/^\d{10}$/.test(String(phone || '').trim()))
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
    if (String(password || '').length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { studentId: employeeId }] });
    if (existing) return res.status(400).json({ message: 'Email or ID already exists!' });

    let role = 'TEAM_COORD';
    if (isSuperAdmin) role = 'VP';
    else if (department === 'mess') role = 'MESS_MANAGER';
    else if (department === 'fest') role = 'FEST_COORD';
    else if (department === 'hospital') role = 'ACADEMIC';

    const hashedPassword = await bcrypt.hash(password, 10);
    const newSecretary = new User({
      fullName, studentId: employeeId, email: email.toLowerCase(), phone,
      password: hashedPassword, department: department || 'general',
      userType: isSuperAdmin ? 'ADMIN' : 'SECRETARY',
      role, isVerified: true, isSecretary: true, isSuperAdmin: isSuperAdmin || false,
    });
    await newSecretary.save();
    res.status(201).json({ message: 'Secretary created!', secretary: newSecretary });
  } catch (err) {
    console.error('Create Secretary Error:', err);
    res.status(500).json({ message: 'Server error creating secretary.' });
  }
});

app.get('/api/admin/secretaries', async (_req, res) => {
  try {
    const secretaries = await User.find({ isSecretary: true })
      .select('-password -verificationToken -resetPasswordToken').sort({ createdAt: -1 });
    res.status(200).json(secretaries);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching secretaries.' });
  }
});

app.delete('/api/admin/secretaries/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Secretary not found.' });
    res.status(200).json({ message: 'Secretary removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting secretary.' });
  }
});

app.get('/api/admin/claims/all_secretaries', async (_req, res) => {
  try {
    const secretaries = await User.find({ isSecretary: true })
      .select('-password -verificationToken -resetPasswordToken').sort({ createdAt: -1 });
    res.status(200).json(secretaries);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching secretaries.' });
  }
});

app.get('/api/claims/my-fests/:studentId', async (req, res) => {
  try {
    const user = await User.findOne({ studentId: req.params.studentId.toUpperCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const memberships = await FestMember.find({ user: user._id, isActive: true }).populate('fest');
    const userFests = memberships.map(m => ({
      festId: m.fest._id,
      festName: m.fest.name,
      committee: m.committee || 'Member',
    }));
    res.json(userFests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => console.log(`📡 Server running on port ${PORT}`));