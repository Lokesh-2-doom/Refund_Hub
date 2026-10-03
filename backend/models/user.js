const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- Core Fields for Everyone ---
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  
  // This is studentId/Roll No or Employee ID
  studentId: { type: String, required: true, unique: true },

  // --- Identity ---
  userType: { 
    type: String, 
    enum: ['STUDENT', 'SECRETARY', 'ADMIN'], 
    default: 'STUDENT' 
  },
  
  // These are the ONLY allowed roles in your database
  role: { 
    type: String, 
    enum: [
      'STUDENT', 'SUB_COORD', 'COORD', 'FEST_COORD', 
      'MESS_MANAGER', 'ACADEMIC_HEAD', 'ACCOUNTANT', 
      'VP', 'CHIEF_ADMIN', 'TEAM_COORD', 'ACADEMIC'
    ],
    default: 'STUDENT'
  },

  department: { type: String, default: 'general' },
  institution: { type: String, default: '' },
  hostel: { type: String, default: '' },
  block: { type: String, default: '' },
  roomNumber: { type: String, default: '' },
  admissionYear: { type: String, default: '' },
  messName: { type: String, default: '' },
  profilePicUrl: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  isSecretary: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
lastLogin: { type: Date, default: null }, 
  
  // --- Student Specific Profile ---
  studentProfile: {
    bankDetails: {
      accountHolderName: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String
    }
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
