const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
  // ── Submitter Info ──────────────────────────────────────────
  // Using ObjectId properly links this claim to the User document
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentRoll: { type: String, required: true, uppercase: true },

  // ── Details ─────────────────────────────────────────────────
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  amount:      { type: Number, required: true, min: 0 },

  // ── Mess-Specific (Optional fields) ─────────────────────────
  messAbsenceFrom: { type: Date, default: null },
  messAbsenceTo:   { type: Date, default: null },
  messAbsenceDays: { type: Number, default: null },

  // ── Supporting Documents (For your Cloudinary Uploads!) ─────
  attachments: [{
    filename:    { type: String },
    url:         { type: String }, // This is where the Cloudinary secure_url goes
    mimetype:    { type: String },
    uploadedAt:  { type: Date, default: Date.now },
  }],

  // ── Workflow Status ─────────────────────────────────────────
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'EXPIRED'],
    default: 'PENDING',
    index: true,
  },

  // ── Admin Review Trail ──────────────────────────────────────
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:   { type: Date, default: null },
  reviewNote:   { type: String, trim: true, default: null },

  // ── Final Disbursement Details ──────────────────────────────
  disbursedAt:     { type: Date, default: null },
  disbursedAmount: { type: Number, default: null },
  disbursementRef: { type: String, default: null }, // e.g., Bank UTR number

  // ── Auto-Expiry ─────────────────────────────────────────────
  expiresAt: { type: Date, default: null },

}, { timestamps: true }); // Automatically creates 'createdAt' and 'updatedAt'

// Indexes make your dashboard queries much faster when searching by status or student
ClaimSchema.index({ status: 1, department: 1 });
ClaimSchema.index({ studentId: 1, createdAt: -1 });

// ✅ The safe export pattern
module.exports = mongoose.models.Claim || mongoose.model('Claim', ClaimSchema);