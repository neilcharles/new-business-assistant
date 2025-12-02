import React from 'react';
import { GoogleIcon } from './icons/GoogleIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="text-center p-8">
        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center space-y-6 max-w-sm">
          <SparklesIcon className="w-12 h-12 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            New Business Assistant
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Sign in to access your AI-powered assistant for writing compelling client emails.
          </p>
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center space-x-3 p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            <GoogleIcon className="w-5 h-5" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
              Sign in with Google
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
