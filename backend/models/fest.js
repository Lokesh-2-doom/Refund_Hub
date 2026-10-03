const mongoose = require('mongoose');

// ─── Fest Schema ─────────────────────────────────────────────
const FestSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

// ─── FestMember Schema ───────────────────────────────────────

const FestMemberSchema = new mongoose.Schema({

  // 🔗 Reference to User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // 🔗 Reference to Fest
  fest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fest',
    required: true,
  },

  // 🎭 Role inside fest
  position: {
    type: String,
    enum: ['FEST_COORDINATOR', 'COORDINATOR', 'SUB_COORDINATOR'],
    required: true,
  },

  // 🏢 Committee
  committee: {
    type: String,
    trim: true,
    default: null,
  },

  //Academic Year
  academicYear: {
    type: String, // "2025-26"
    required: true,
  },

  // 👤 Audit
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  isActive: { type: Boolean, default: true },

  

}, { timestamps: true });


FestMemberSchema.index(
  { user: 1, fest: 1, academicYear: 1, position: 1, committee: 1 },
  { unique: true }
);

// ─── Refund Schema ───────────────────────────────────────
const RefundSchema = new mongoose.Schema({

  // ── Core Identity ───────────────────────────
  claimId: { type: String, required: true, unique: true, index: true },

  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },

  studentRoll: { type: String, required: true, uppercase: true },

  // 🔥 FEST LINKING (now mandatory)
  fest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fest',
    required: true
  },

  academicYear: {
    type: String,
    required: true
  },

  festMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FestMember',
    required: true
  },

  festName: { type: String }, // optional (for fast UI)

  // ── Details ────────────────────────────────
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  amount:      { type: Number, required: true, min: 0 },

  // ── Transaction ID ─────────────────────────
  transactionId: { 
    type: String, 
    unique: true,
    sparse: true,
    match: /^\d{12}$/ // simplified validation
  },

  // ── Attachments ────────────────────────────
  attachments: [{
    filename:   String,
    url:        { type: String, required: true },
    mimetype:   String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  // ── Workflow ───────────────────────────────
  status: { 
    type: String, 
    enum: [
      'PENDING_TEAM_COORD', 
      'PENDING_FEST_COORD', 
      'APPROVED', 
      'REJECTED', 
      'REFUNDED'
    ],
    default: 'PENDING_TEAM_COORD',
    index: true
  },

  // ── History ────────────────────────────────
  history: [{
    action:   { type: String, required: true },
    byUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName:   String,
    date:     { type: Date, default: Date.now },
    comments: String
  }],

  // ── Disbursement ───────────────────────────
  disbursedAt:     { type: Date },
  disbursedAmount: { type: Number },
  disbursementRef: { type: String },

}, { timestamps: true });


// ── Indexes ─────────────────────────────────
RefundSchema.index({ fest: 1, academicYear: 1 });
RefundSchema.index({ student: 1, createdAt: -1 });

// ─── Models ────────────────────────────────────────────────

const Fest = mongoose.model('Fest', FestSchema);
const FestMember = mongoose.model('FestMember', FestMemberSchema);
const FestRefund = mongoose.model('FestRefund', RefundSchema);

module.exports = { Fest, FestMember, FestRefund };
