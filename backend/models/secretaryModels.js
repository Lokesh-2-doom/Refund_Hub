const mongoose = require('mongoose');

// ════════════════════════════════════════════════════════════════
//  models/FestCoordinator.js
//  Tracks which students are assigned as FC per fest
// ════════════════════════════════════════════════════════════════
const FestCoordinatorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Denormalised snapshot for fast display (no extra join)
  fullName:    { type: String, required: true },
  studentRoll: { type: String, required: true, uppercase: true, trim: true },
  email:       { type: String, required: true, lowercase: true, trim: true },

  festName: {
    type: String,
    required: true,
    enum: ['Celesta', 'Infinito', 'Anwesha', 'TedX'],
  },

  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',   // the fest secretary who appointed them
    required: true,
  },

  isActive: { type: Boolean, default: true },

  revokedAt: { type: Date, default: null },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

}, { timestamps: true });

// Max 2 active FCs per fest  (enforced at application layer, not DB)
FestCoordinatorSchema.index({ festName: 1, isActive: 1 });
FestCoordinatorSchema.index({ userId: 1, festName: 1 }, { unique: true }); // one record per student per fest

module.exports.FestCoordinator = mongoose.model('FestCoordinator', FestCoordinatorSchema);


// ════════════════════════════════════════════════════════════════
//  models/FestReimbursement.js
//  Claims submitted by students for fest reimbursements.
//  FC verifies first → Secretary approves → Accounts disburses.
// ════════════════════════════════════════════════════════════════
const FestReimbursementSchema = new mongoose.Schema({
  claimRefId: {
    type: String,
    required: true,
    unique: true,
    // Format: FEST-<YEAR>-<SEQ>  e.g. FEST-2026-001
  },

  // Submitter
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentRoll: { type: String, required: true, uppercase: true, trim: true },
  studentName: { type: String, required: true },
  studentEmail:{ type: String, required: true },

  festName: {
    type: String,
    required: true,
    enum: ['Celesta', 'Infinito', 'Anwesha', 'TedX'],
    index: true,
  },

  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  amount:      { type: Number, required: true, min: 0 },

  attachments: [{
    filename: String,
    url:      String,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  // Workflow stage
  status: {
    type: String,
    enum: ['pending', 'fc_verified', 'verified', 'approved', 'rejected', 'disbursed'],
    default: 'pending',
    index: true,
  },

  // FC Verification
  fcVerifiedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fcVerifiedAt:  { type: Date, default: null },
  fcComment:     { type: String, trim: true, default: null },

  // Secretary verification
  verifiedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt:      { type: Date, default: null },
  verifierComment: { type: String, trim: true, default: null },

  // Secretary final approval
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt:   { type: Date, default: null },

  // Rejection
  rejectedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedAt:      { type: Date, default: null },
  rejectionReason: { type: String, trim: true, default: null },

  // Accounts disbursement
  disbursedAt:     { type: Date, default: null },
  disbursedAmount: { type: Number, default: null },
  disbursementRef: { type: String, default: null },

  expiresAt: { type: Date, default: null },

}, { timestamps: true });

FestReimbursementSchema.index({ studentId: 1, createdAt: -1 });
FestReimbursementSchema.index({ festName: 1, status: 1 });

module.exports.FestReimbursement = mongoose.model('FestReimbursement', FestReimbursementSchema);


// ════════════════════════════════════════════════════════════════
//  models/MessRebate.js
//  Claims submitted directly by students for mess rebate.
//  Mess Secretary verifies → Secretary approves → Accounts disburses.
// ════════════════════════════════════════════════════════════════
const MessRebateSchema = new mongoose.Schema({
  claimRefId: { type: String, required: true, unique: true }, // MESS-<YEAR>-<SEQ>

  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentRoll: { type: String, required: true, uppercase: true, trim: true },
  studentName: { type: String, required: true },
  studentEmail:{ type: String, required: true },

  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  amount:      { type: Number, required: true, min: 0 },

  // Mess-specific
  messAbsenceFrom: { type: Date, required: true },
  messAbsenceTo:   { type: Date, required: true },
  messAbsenceDays: { type: Number, required: true, min: 1 },
  leaveType: {
    type: String,
    enum: ['home_leave', 'medical_leave', 'internship', 'event', 'other'],
    required: true,
  },

  attachments: [{
    filename: String, url: String, mimetype: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  status: {
    type: String,
    enum: ['pending', 'verified', 'approved', 'rejected', 'disbursed'],
    default: 'pending',
    index: true,
  },

  verifiedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt:      { type: Date, default: null },
  verifierComment: { type: String, trim: true, default: null },

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },

  rejectedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedAt:      { type: Date, default: null },
  rejectionReason: { type: String, trim: true, default: null },

  disbursedAt:     { type: Date, default: null },
  disbursedAmount: { type: Number, default: null },
  disbursementRef: { type: String, default: null },

  expiresAt: { type: Date, default: null },

}, { timestamps: true });

MessRebateSchema.index({ studentId: 1, createdAt: -1 });
MessRebateSchema.index({ status: 1 });

module.exports.MessRebate = mongoose.model('MessRebate', MessRebateSchema);


// ════════════════════════════════════════════════════════════════
//  models/MedicalClaim.js
//  Hospital / medical reimbursement claims.
//  Same flow: Medical Secretary verifies → approves → accounts.
// ════════════════════════════════════════════════════════════════
const MedicalClaimSchema = new mongoose.Schema({
  claimRefId: { type: String, required: true, unique: true }, // MED-<YEAR>-<SEQ>

  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentRoll:  { type: String, required: true, uppercase: true, trim: true },
  studentName:  { type: String, required: true },
  studentEmail: { type: String, required: true },

  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  amount:      { type: Number, required: true, min: 0 },

  // Medical-specific
  hospitalName:   { type: String, trim: true },
  treatmentDate:  { type: Date },
  treatmentType:  { type: String, enum: ['consultation', 'surgery', 'medicine', 'dental', 'vision', 'other'], default: 'other' },
  doctorName:     { type: String, trim: true },
  isEmpanelled:   { type: Boolean, default: false }, // is the hospital on campus empanelled list

  attachments: [{
    filename: String, url: String, mimetype: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  status: {
    type: String,
    enum: ['pending', 'verified', 'approved', 'rejected', 'disbursed'],
    default: 'pending',
    index: true,
  },

  verifiedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt:      { type: Date, default: null },
  verifierComment: { type: String, trim: true, default: null },

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },

  rejectedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedAt:      { type: Date, default: null },
  rejectionReason: { type: String, trim: true, default: null },

  disbursedAt:     { type: Date, default: null },
  disbursedAmount: { type: Number, default: null },
  disbursementRef: { type: String, default: null },

}, { timestamps: true });

MedicalClaimSchema.index({ studentId: 1, createdAt: -1 });
MedicalClaimSchema.index({ status: 1 });

module.exports.MedicalClaim = mongoose.model('MedicalClaim', MedicalClaimSchema);


// ════════════════════════════════════════════════════════════════
//  models/RefundRecord.js
//  Immutable ledger entry — created when Accounts marks a claim as disbursed.
//  Never updated or deleted.
// ════════════════════════════════════════════════════════════════
const RefundRecordSchema = new mongoose.Schema({
  // Source claim — polymorphic ref (could be from any of the 3 claim collections)
  claimId:          { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  claimRefId:       { type: String, required: true },
  claimCollection:  { type: String, enum: ['FestReimbursement', 'MessRebate', 'MedicalClaim'], required: true },

  // Student snapshot at time of refund (immutable)
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: { type: String, required: true },
  studentRoll: { type: String, required: true, uppercase: true },
  studentEmail:{ type: String, required: true },

  department: {
    type: String,
    enum: ['fest', 'mess', 'hospital', 'accounts'],
    required: true,
    index: true,
  },

  amount:          { type: Number, required: true, min: 0 },
  transactionRef:  { type: String, required: true, unique: true, trim: true },
  paymentMethod:   { type: String, enum: ['bank_transfer', 'upi', 'cheque', 'cash', 'other'], default: 'bank_transfer' },

  refundedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refundedAt:  { type: Date, required: true, default: Date.now },

  notes: { type: String, trim: true, default: null },

}, {
  timestamps: true,
  // Prevent accidental updates to this ledger
  strict: 'throw',
});

RefundRecordSchema.index({ department: 1, refundedAt: -1 });
RefundRecordSchema.index({ studentId: 1, refundedAt: -1 });
RefundRecordSchema.index({ refundedAt: -1 });

module.exports.RefundRecord = mongoose.model('RefundRecord', RefundRecordSchema);


// ════════════════════════════════════════════════════════════════
//  models/VerifiedFestReimbursement.js  (optional materialized view)
//  If you want a SEPARATE collection for "secretary-verified" fest
//  claims (as opposed to FC-verified), use this schema.
//  Otherwise just filter FestReimbursement by status === 'verified'.
// ════════════════════════════════════════════════════════════════
const VerifiedFestReimbursementSchema = new mongoose.Schema({
  originalClaimId: { type: mongoose.Schema.Types.ObjectId, ref: 'FestReimbursement', required: true, unique: true },
  claimRefId:      { type: String, required: true },
  studentId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName:     { type: String, required: true },
  studentRoll:     { type: String, required: true },
  festName:        { type: String, required: true },
  amount:          { type: Number, required: true },
  verifiedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verifiedAt:      { type: Date, default: Date.now },
  verifierComment: { type: String },
  currentStatus:   { type: String, enum: ['verified', 'approved', 'rejected', 'disbursed'], default: 'verified' },
}, { timestamps: true });

module.exports.VerifiedFestReimbursement = mongoose.model('VerifiedFestReimbursement', VerifiedFestReimbursementSchema);


// ════════════════════════════════════════════════════════════════
//  models/VerifiedMessRebate.js
//  Same pattern — separate verified-mess collection.
// ════════════════════════════════════════════════════════════════
const VerifiedMessRebateSchema = new mongoose.Schema({
  originalClaimId:  { type: mongoose.Schema.Types.ObjectId, ref: 'MessRebate', required: true, unique: true },
  claimRefId:       { type: String, required: true },
  studentId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName:      { type: String, required: true },
  studentRoll:      { type: String, required: true },
  amount:           { type: Number, required: true },
  messAbsenceDays:  { type: Number, required: true },
  verifiedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verifiedAt:       { type: Date, default: Date.now },
  verifierComment:  { type: String },
  currentStatus:    { type: String, enum: ['verified', 'approved', 'rejected', 'disbursed'], default: 'verified' },
}, { timestamps: true });

module.exports.VerifiedMessRebate = mongoose.model('VerifiedMessRebate', VerifiedMessRebateSchema);


// ════════════════════════════════════════════════════════════════
//  HELPER: Auto-generate claim reference IDs
//  Usage: const ref = await generateClaimRef('FEST');
// ════════════════════════════════════════════════════════════════
const CounterSchema = new mongoose.Schema({
  _id:  { type: String, required: true },   // e.g. "FEST-2026"
  seq:  { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', CounterSchema);

async function generateClaimRef(prefix) {
  const year = new Date().getFullYear();
  const key  = `${prefix}-${year}`;
  const doc  = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${key}-${String(doc.seq).padStart(3, '0')}`; // e.g. FEST-2026-001
}

module.exports.generateClaimRef = generateClaimRef;
module.exports.Counter = Counter;
