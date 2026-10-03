import { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, IdCard, Lock, Eye, EyeOff, CreditCard, Building, AlertCircle, CheckCircle, Shield } from 'lucide-react';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

interface StudentRegistrationData {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  isSuperAdmin: boolean;
  isSecretary: boolean;
  department: string;
}

interface StudentRegistrationFormProps {
  onBack: () => void;
  onComplete: (data: StudentRegistrationData) => void;
}

// ✅ Roll number regex: matches pattern like 23CS01, 22AI12, etc.
// Format: YY + batch(0-3) + branch(2-letter code) + 2 digits
const ROLL_REGEX = /^[12][0-9][012][123](AI|CB|CE|CS|CT|EC|EE|ES|MC|ME|MM|PH|PR|CM|GT|MT|PC|ST|VL)[0-9]{2}$/i;

const ROLL_HINT = 'e.g. 23CS01 — Year(2) + Batch(0-3) + Branch(2 letters) + Roll(2 digits)';

export function StudentRegistrationForm({ onBack, onComplete }: StudentRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<StudentRegistrationData>({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    isSuperAdmin: false,
    isSecretary: false,
    department: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof StudentRegistrationData, string>>>({});

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof StudentRegistrationData, string>> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    } else if (!ROLL_REGEX.test(formData.studentId.trim())) {
      // ✅ FIX: Validate roll number with regex, show inline error
      newErrors.studentId = 'Invalid roll number. ' + ROLL_HINT;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be 8+ chars with 1 uppercase, 1 number, and 1 special char (@#$%)';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Partial<Record<keyof StudentRegistrationData, string>> = {};

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d{11,16}$/.test(formData.accountNumber)) {
      newErrors.accountNumber = 'Account number must be 11 to 16 digits because bank formats vary';
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}\d{7}$/.test(formData.ifscCode.toUpperCase())) {
      newErrors.ifscCode = 'Invalid format. Use 4 letters followed by 7 digits (e.g., PUNB0987654)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ FIX: Don't send confirmPassword to backend — not needed there
        body: JSON.stringify({
          fullName: formData.fullName,
          studentId: formData.studentId.toUpperCase(),
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          accountHolderName: formData.accountHolderName,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode.toUpperCase(),
          isSuperAdmin: false,
          isSecretary: false,
          department: '',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserEmail(formData.email);
        setShowSuccessModal(true);
      } else {
        // ✅ FIX: Show server error inline instead of alert
        setSubmitError(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Network error:', error);
      // ✅ FIX: Show friendly message inline, not browser alert
      setSubmitError('Cannot connect to server. Please check that the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof StudentRegistrationData, value: string) => {
    setFormData({ ...formData, [field]: value });
    // ✅ Clear field error and any server-level submit error on change
    setErrors({ ...errors, [field]: undefined });
    setSubmitError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Back Button */}
        <button
          onClick={currentStep === 1 ? onBack : () => setCurrentStep(1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">
            {currentStep === 1 ? 'Back to Registration Type' : 'Back to Profile Details'}
          </span>
        </button>

        {/* Main Registration Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Progress Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Student Registration</h2>
                <p className="text-gray-600 mt-1">Step {currentStep} of 2</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentStep === 1 ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}>
                  {currentStep > 1 ? <CheckCircle size={20} /> : '1'}
                </div>
                <div className={`w-12 h-1 ${currentStep === 2 ? 'bg-green-600' : 'bg-gray-300'}`} />
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentStep === 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  2
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentStep === 1 ? 'bg-green-600' : 'bg-blue-600'}`}>
                {currentStep === 1 ? <User className="text-white" size={24} /> : <CreditCard className="text-white" size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {currentStep === 1 ? 'Profile Information' : 'Bank Account Details'}
                </h3>
                <p className="text-sm text-gray-600">
                  {currentStep === 1
                    ? 'Enter your personal and account details'
                    : 'This information will be used for refund settlements'}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form
            onSubmit={currentStep === 1 ? (e) => { e.preventDefault(); handleNextStep(); } : handleSubmit}
            className="p-8"
          >
            {currentStep === 1 ? (
              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.fullName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </div>
                  {errors.fullName && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.fullName}</p>
                    </div>
                  )}
                </div>

                {/* Student ID / Roll Number — ✅ with regex validation inline */}
                <div>
                  <label htmlFor="studentId" className="block text-sm font-semibold text-gray-700 mb-2">
                    Student Roll Number *
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="studentId"
                      type="text"
                      maxLength={9} // Max possible length e.g. 23CS01 = 6, but allow uppercase branch codes
                      value={formData.studentId}
                      onChange={(e) => updateField('studentId', e.target.value.toUpperCase())}
                      placeholder="e.g. 23CS01"
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all uppercase font-mono tracking-widest ${errors.studentId ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </div>
                  {/* ✅ Hint text always visible below input */}
                  <p className="text-xs text-gray-400 mt-1 ml-1">{ROLL_HINT}</p>
                  {errors.studentId && (
                    <div className="flex items-center gap-2 mt-1 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.studentId}</p>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="your.email@university.edu"
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </div>
                  {errors.email && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.email}</p>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="phone"
                      type="tel"
                      maxLength={10}
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </div>
                  {errors.phone && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.phone}</p>
                    </div>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Create Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="At least 8 characters"
                      className={`w-full pl-11 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.password}</p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      className={`w-full pl-11 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.confirmPassword}</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg mt-6"
                >
                  Continue to Bank Details →
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Info Banner */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                  <Shield className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Secure Bank Information</p>
                    <p className="text-xs text-blue-700">
                      These details will be automatically saved to your Settings page and used for all refund settlements. Your data is encrypted and secure.
                    </p>
                  </div>
                </div>

                {/* ✅ Server-level submit error shown inline at top of step 2 */}
                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                    <p className="text-sm text-red-700 font-medium">{submitError}</p>
                  </div>
                )}

                {/* Account Holder Name */}
                <div>
                  <label htmlFor="accountHolderName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Holder Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="accountHolderName"
                      type="text"
                      value={formData.accountHolderName}
                      onChange={(e) => updateField('accountHolderName', e.target.value)}
                      placeholder="Name as per bank account"
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.accountHolderName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </div>
                  {errors.accountHolderName && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.accountHolderName}</p>
                    </div>
                  )}
                </div>

                {/* Bank Name */}
                <div>
                  <label htmlFor="bankName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Bank Name *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="bankName"
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => updateField('bankName', e.target.value)}
                      placeholder="e.g., State Bank of India"
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.bankName ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </div>
                  {errors.bankName && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.bankName}</p>
                    </div>
                  )}
                </div>

                {/* Account Number */}
                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Number *
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="accountNumber"
                      type="text"
                      maxLength={16}
                      value={formData.accountNumber}
                      onChange={(e) => updateField('accountNumber', e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter your bank account number"
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.accountNumber ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 ml-1">Accepted: 11 to 16 digits</p>
                  {errors.accountNumber && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.accountNumber}</p>
                    </div>
                  )}
                </div>

                {/* IFSC Code */}
                <div>
                  <label htmlFor="ifscCode" className="block text-sm font-semibold text-gray-700 mb-2">
                    IFSC Code *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="ifscCode"
                      type="text"
                      maxLength={11}
                      value={formData.ifscCode}
                      onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                      placeholder="e.g., PUNB0987654"
                      className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all uppercase ${errors.ifscCode ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                    />
                  </div>
                  {errors.ifscCode && (
                    <div className="flex items-center gap-2 mt-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm">{errors.ifscCode}</p>
                    </div>
                  )}
                </div>

                {/* ✅ Submit button shows loading state */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg mt-6"
                >
                  {isSubmitting ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer Note */}
        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-xl">
          <p className="text-sm text-gray-600 text-center">
            By registering, you agree to the{' '}
            <a href="#" className="text-green-600 hover:text-green-700 font-semibold">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-green-600 hover:text-green-700 font-semibold">Privacy Policy</a>
          </p>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-green-100 animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="text-green-600" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Verify Your Email</h3>
                <p className="text-gray-500 mt-2 text-sm">
                  We've sent a verification link to <br />
                  <span className="font-semibold text-gray-800">{userEmail}</span>
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-6">
                <div className="flex gap-3 text-emerald-800">
                  <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-xs leading-relaxed text-left font-medium">
                    Please check your inbox to activate your account.
                    <span className="block mt-1 font-bold text-emerald-900">
                      Login is disabled until you click the link.
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.location.href = '/login'}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 transition-all"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
