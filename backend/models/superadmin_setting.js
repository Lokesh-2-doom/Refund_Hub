const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
//  models/AuditLog.js  — Secretary action audit trail
// ═══════════════════════════════════════════════════════════════
const AuditLogSchema = new mongoose.Schema({
  secretaryId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  secretaryName: { type: String, required: true },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
      'APPROVE_CLAIM', 'REJECT_CLAIM', 'REVERT_CLAIM',
      'CREATE_CLAIM', 'UPDATE_CLAIM', 'DELETE_CLAIM',
      'UPDATE_STUDENT', 'DELETE_STUDENT',
      'CREATE_SECRETARY', 'DELETE_SECRETARY', 'UPDATE_SECRETARY',
      'EXPORT_REPORT', 'BULK_UPDATE',
      'UPDATE_SETTINGS', 'TOGGLE_PORTAL',
      'PASSWORD_CHANGE', 'OTHER',
    ],
  },
  targetCollection: { type: String, required: true },
  targetId:         { type: String, default: null },
  details: { type: String, required: true, trim: true },
  ipAddress:  { type: String, default: null },
  userAgent:  { type: String, default: null },
  status: {
    type: String,
    enum: ['success', 'failed', 'warning'],
    default: 'success',
  },
  previousValue: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
  newValue:      { type: mongoose.Schema.Types.Mixed, default: null, select: false },
}, { timestamps: true });

AuditLogSchema.index({ status: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ secretaryId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════
//  models/ServerSettings.js  — Global portal configuration
// ═══════════════════════════════════════════════════════════════
const ServerSettingsSchema = new mongoose.Schema({
  _singleton: { type: String, default: 'GLOBAL', unique: true, immutable: true },
  portalActive:       { type: Boolean, default: true },
  registrationOpen:   { type: Boolean, default: true },
  maintenanceMode:    { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: 'System is under maintenance. Please check back shortly.' },
  messRebateRateDaily:      { type: Number, default: 150, min: 0 },
  maxFestReimbursement:     { type: Number, default: 5000, min: 0 },
  maxMedicalReimbursement:  { type: Number, default: 10000, min: 0 },
  maxAccountClaim:          { type: Number, default: 25000, min: 0 },
  maxMessRebateDays:        { type: Number, default: 30, min: 1, max: 180 },
  maxClaimsPerMonth:    { type: Number, default: 5, min: 1 },
  claimExpiryDays:      { type: Number, default: 90, min: 1 },
  maxFileUploadMB:      { type: Number, default: 10, min: 1, max: 100 },
  sessionTimeoutMinutes:{ type: Number, default: 60, min: 5 },
  emailNotificationsEnabled: { type: Boolean, default: true },
  smsNotificationsEnabled:   { type: Boolean, default: false },
  notifyOnNewClaim:          { type: Boolean, default: true },
  notifyOnApproval:          { type: Boolean, default: true },
  notifyOnRejection:         { type: Boolean, default: true },
  adminEmailCc:              { type: String, default: '' },
  maxLoginAttempts:       { type: Number, default: 5, min: 3, max: 10 },
  lockoutDurationMinutes: { type: Number, default: 30, min: 5 },
  requireTwoFactor:       { type: Boolean, default: false },
  passwordExpiryDays:     { type: Number, default: 90, min: 30 },
  allowMultipleSessions:  { type: Boolean, default: false },
  dbBackupEnabled:         { type: Boolean, default: true },
  dbBackupFrequencyHours:  { type: Number, default: 24, min: 1, max: 168 },
  logRetentionDays:        { type: Number, default: 365, min: 30 },
  rateLimitRequestsPerMin: { type: Number, default: 100, min: 10 },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

ServerSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ _singleton: 'GLOBAL' });
  if (!settings) settings = await this.create({ _singleton: 'GLOBAL' });
  return settings;
};

// ✅ SAFE EXPORTS (Notice Claim is gone from here!)
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
const ServerSettings = mongoose.models.ServerSettings || mongoose.model('ServerSettings', ServerSettingsSchema);

module.exports = { AuditLog, ServerSettings };