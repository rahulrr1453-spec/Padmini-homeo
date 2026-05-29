import React, { useState, useEffect } from 'react';
import { Lock, User, Stethoscope, Sun, Moon, Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';

const Login = ({ doctors, onLogin, isDarkMode, toggleDarkMode }) => {
  const [loginMode, setLoginMode] = useState('doctor'); // 'doctor' or 'admin'
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [passkey, setPasskey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default selected doctor when doctors list changes
  useEffect(() => {
    if (doctors && doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id.toString());
    }
  }, [doctors, selectedDoctorId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simulate small latency for premium feels
    setTimeout(() => {
      if (loginMode === 'doctor') {
        if (!selectedDoctorId) {
          setError('Please select a doctor.');
          setIsSubmitting(false);
          return;
        }

        const selectedDoc = doctors.find((d) => d.id.toString() === selectedDoctorId);
        if (!selectedDoc) {
          setError('Invalid doctor selected.');
          setIsSubmitting(false);
          return;
        }

        if (passkey === selectedDoc.secret_key) {
          onLogin({ role: 'doctor', doctor: selectedDoc });
        } else {
          setError('Incorrect doctor passkey. Please try again.');
        }
      } else {
        // Admin login
        if (passkey === 'padmini@vittal') {
          onLogin({ role: 'admin' });
        } else {
          setError('Incorrect admin key. Please try again.');
        }
      }
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden transition-colors duration-500 p-4 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-gradient-to-tr from-slate-100 via-emerald-50/20 to-slate-50 text-slate-800'}`}>
      
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-emerald-400/10 dark:bg-emerald-500/5 blur-3xl animate-pulse duration-10000 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-emerald-600/10 dark:bg-emerald-700/5 blur-3xl animate-pulse duration-10000 pointer-events-none"></div>

      {/* Dark Mode Toggle */}
      <button 
        type="button"
        onClick={toggleDarkMode}
        className="absolute top-6 right-6 p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 shadow-md hover:scale-105"
        title="Toggle Appearance"
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-emerald-950" />}
      </button>

      {/* Login Card */}
      <div className="w-full max-w-lg relative z-10 glass-card rounded-3xl p-8 md:p-10 border border-white/20 dark:border-slate-800/80 shadow-2xl flex flex-col items-center">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-2 rounded-full border border-emerald-500/20 shadow-inner mb-4">
            <img src="/logo.png" alt="Padmini Homeo Clinic Logo" className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-emerald-500/50" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
            Padmini Homeo
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold tracking-wider uppercase mt-1">
            Clinic Management System
          </p>
        </div>

        {/* Tab Selector */}
        <div className="w-full grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-8 border border-slate-200/50 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setLoginMode('doctor');
              setError('');
              setPasskey('');
            }}
            className={`py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${loginMode === 'doctor' 
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md transform scale-[1.01]' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <Stethoscope className="w-4 h-4" />
            Doctor Login
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('admin');
              setError('');
              setPasskey('');
            }}
            className={`py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${loginMode === 'admin' 
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md transform scale-[1.01]' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <ShieldAlert className="w-4 h-4" />
            Admin Login
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="w-full flex items-center gap-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-2xl mb-6 border border-red-100 dark:border-red-900/30 text-sm font-medium animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          
          {/* Doctor Dropdown (Only visible in Doctor Login Mode) */}
          {loginMode === 'doctor' && (
            <div className="w-full">
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 px-1">
                Select Consulting Doctor
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User className="w-5 h-5" />
                </div>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300 dark:text-white"
                >
                  {doctors && doctors.length > 0 ? (
                    doctors.map((d) => (
                      <option key={d.id} value={d.id} className="dark:bg-slate-850">
                        {d.name} ({d.qualification})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No doctors registered</option>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Passkey Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 px-1">
              {loginMode === 'doctor' ? 'Doctor Passkey' : 'Admin Access Key'}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Lock className="w-5 h-5" />
              </div>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder={loginMode === 'doctor' ? '••••••••' : 'Enter admin security key'}
                className="w-full pl-12 pr-12 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 dark:from-emerald-500 dark:to-emerald-400 dark:hover:from-emerald-600 dark:hover:to-emerald-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/20 hover:shadow-xl dark:shadow-none hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-400/60 dark:text-slate-600 font-medium">
        © 2026 Padmini Homeo Clinic. All rights reserved.
      </div>
    </div>
  );
};

export default Login;
