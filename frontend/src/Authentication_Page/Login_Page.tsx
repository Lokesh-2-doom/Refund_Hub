import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://127.0.0.1:8000';

interface StudentLoginFormProps {
  onBack: () => void;
  onRegister: () => void;
  onSignIn: (user: {
    fullName: string;
    studentId: string;
    email: string;
    phone: string;
    bankDetails: object;
  }) => void;
}

export function StudentLoginForm({ onBack, onSignIn, onRegister }: StudentLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?:  string; password?: string; server?: string }>({});
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateForm = () => {
  const newErrors: { email?: string; password?: string } = {};
  if (!email.trim()) {
    // ✅ Change the key to 'email' and the text to 'University email'
    newErrors.email = 'University email is required'; 
  } else if (!EMAIL_REGEX.test(email.trim())) {
    newErrors.email = 'Please enter a valid email address';
  }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSignIn(data.user);
      } else {
        setErrors({ server: data.message || 'Login failed. Please try again.' });
      }
    } catch (error) {
      console.error('Network error:', error);
      setErrors({ server: 'Cannot connect to server. Check if backend is running.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Navigation */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Login Options</span>
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
              <Mail size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Enter your email and password</p>
          </div>

        {/* ✅ This makes the banner show the actual error (Email, Password, or Server) */}
{(errors.server || errors.email || errors.password) && (
  <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
    <p className="text-sm text-red-700 font-medium">
      {/* Priority: Server Error > Email Error > Password Error */}
      {errors.server ? errors.server : (errors.email || errors.password)}
    </p>
  </div>
)}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({ ...errors, email: undefined, server: undefined });
                  }}
                  placeholder="student@university.edu"
                  className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                  }`}
                />
              </div>
              {errors.email && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle size={16} />
                  <p className="text-sm">{errors.email}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({ ...errors, password: undefined, server: undefined });
                  }}
                  placeholder="Enter your password"
                  className={`w-full pl-11 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-green-600 hover:text-green-700">Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-md"
            >
              <LogIn size={20} />
              {isLoading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
            <span className="relative px-4 bg-white text-gray-500">or</span>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Note:</span> Your account must be verified.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={onRegister} className="font-semibold text-green-600 hover:underline">
            Register here
          </button>
        </div>
      </div>
    </div>
  );
}