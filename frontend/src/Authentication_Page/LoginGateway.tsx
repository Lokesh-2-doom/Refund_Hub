import { DollarSign, LogIn, UserPlus } from 'lucide-react';

interface LoginGatewayProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export function LoginGateway({ onLoginClick, onRegisterClick }: LoginGatewayProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-2xl shadow-lg mb-4">
            <DollarSign className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Refund Hub</h1>
          <p className="text-gray-600 text-lg">Campus Refund & Rebate Portal</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">
              Access your refund claims and settlements
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Login Button */}
            <button
              onClick={onLoginClick}
              className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <LogIn size={22} />
              Login to Account
            </button>

            {/* Register Button */}
            <button
              onClick={onRegisterClick}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 px-6 py-4 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <UserPlus size={22} />
              Create New Account
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Quick Access</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-2xl font-bold text-green-700 mb-1">24/7</p>
              <p className="text-xs text-gray-600">Access Anytime</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-2xl font-bold text-green-700 mb-1">Secure</p>
              <p className="text-xs text-gray-600">Safe & Protected</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Need help? Contact{' '}
            <a href="#" className="text-green-600 hover:text-green-700 font-semibold">
              support@refundhub.edu
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
