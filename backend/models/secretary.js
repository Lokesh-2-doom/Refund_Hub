const mongoose = require('mongoose');

const SecretarySchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },

  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    required: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  // ✅ Default flags
  isVerified: {
    type: Boolean,
    default: true
  },

  isSecretary: {
    type: Boolean,
    default: true
  },

  isSuperAdmin: {
    type: Boolean,
    default: false
  },

  // 🏢 Department control
  department: {
    type: String,
    enum: [
      'fest',
      'mess',
      'hospital',
      'account'
    ],
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model('Secretary', SecretarySchema);