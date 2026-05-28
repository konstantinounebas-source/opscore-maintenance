import React from 'react';
import { base44 } from '@/api/base44Client';

const UserNotRegisteredError = () => {
  const handleLogout = () => {
    base44.auth.logout(window.location.href);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Restricted</h1>
          <p className="text-slate-600 mb-6">
            Your account is not registered for this application. Please contact the administrator to request access.
          </p>
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600 text-left mb-6">
            <p className="font-medium mb-2">What you can do:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Log out and sign in with a different account</li>
            </ul>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Sign Out &amp; Try Another Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;