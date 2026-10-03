import { CheckCircle, ArrowRight, Settings, Home } from 'lucide-react';

interface RegistrationSuccessProps {
  onGoToLogin: () => void;
  studentName: string;
  studentId: string;
}

export function RegistrationSuccess({ onGoToLogin, studentName, studentId }: RegistrationSuccessProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle size={48} className="text-green-600" />
          </div>

          {/* Success Message */}
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Registration Successful!
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Welcome to Refund Hub, {studentName}!
          </p>

          {/* Account Details */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Account Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Student ID</span>
                <span className="text-sm font-bold text-gray-900">{studentId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Account Status</span>
                <span className="text-sm font-bold text-green-700 flex items-center gap-1">
                  <CheckCircle size={16} />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Info Sections */}
          <div className="space-y-4 mb-8 text-left">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Settings className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Your Details are Saved
                  </p>
                  <p className="text-xs text-blue-700">
                    All your registration information has been automatically populated in your Settings page. You can update it anytime.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Home className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-1">
                    What's Next?
                  </p>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Login to access your dashboard</li>
                    <li>• Submit refund claims for mess, medical, or fest activities</li>
                    <li>• Track your claims in real-time</li>
                    <li>• Receive settlements directly to your bank account</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onGoToLogin}
            className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Proceed to Login
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Check your email for account confirmation and additional details
          </p>
        </div>
      </div>
    </div>
  );
}
