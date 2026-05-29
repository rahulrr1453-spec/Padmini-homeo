import React from 'react';
import { LayoutDashboard, Users, FileText, Calendar, Pill, Sun, Moon, ShieldAlert, LogOut } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isDarkMode, toggleDarkMode, doctors, activeDoctor, setActiveDoctor, userRole, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'patients', label: 'Patients', icon: <Users className="w-5 h-5" /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill className="w-5 h-5" /> },
    { id: 'tests', label: 'Test Records', icon: <FileText className="w-5 h-5" /> },
    { id: 'appointments', label: 'Appointments', icon: <Calendar className="w-5 h-5" /> },
    { id: 'admin', label: 'Admin', icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (item.id === 'admin' && userRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <div className="w-64 bg-emerald-900 text-white min-h-screen shadow-xl flex flex-col animate-slide-in relative z-10">
      {/* Clinic Logo Header */}
      <div className="p-6 flex items-center space-x-3 mb-6">
        <div className="bg-white/10 p-1 rounded-full backdrop-blur-sm shadow-sm flex-shrink-0 border border-white/20">
          <img src="/logo.png" alt="Clinic Logo" className="w-16 h-16 rounded-full object-cover" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wide leading-tight">Padmini Homeo</h1>
          <p className="text-emerald-300 text-xs uppercase tracking-wider font-semibold">Clinic System</p>
        </div>
      </div>

      {doctors && doctors.length > 0 && (
        <div className="px-4 mb-4">
          <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1 px-1">Active Doctor</label>
          <select 
            className="w-full bg-emerald-800/50 text-white border border-emerald-700/50 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            value={activeDoctor?.id || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              const doctor = doctors.find(d => d.id.toString() === selectedId);
              if (doctor) {
                if (userRole === 'admin') {
                  setActiveDoctor(doctor);
                } else {
                  const key = window.prompt(`Enter Secret Key for ${doctor.name}:`);
                  if (key === doctor.secret_key) {
                    setActiveDoctor(doctor);
                  } else if (key !== null) {
                    alert('Incorrect Secret Key!');
                  }
                }
              }
            }}
          >
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 px-4 space-y-2">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === item.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 transform scale-[1.02]'
                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
              }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer Area - Sign Out & Appearance */}
      <div className="p-4 mt-auto">
        <button
          onClick={onLogout}
          className="w-full mb-3 bg-emerald-950/40 hover:bg-red-800/20 text-emerald-100 hover:text-red-200 border border-emerald-800/30 hover:border-red-950/20 rounded-xl p-3 flex items-center justify-center gap-2.5 transition-all duration-300 font-bold text-sm group"
        >
          <LogOut className="w-4 h-4 text-emerald-400 group-hover:text-red-400 transition-colors" />
          <span>Sign Out</span>
        </button>

        <button
          onClick={toggleDarkMode}
          className="w-full bg-emerald-800 hover:bg-emerald-700 rounded-xl p-4 flex items-center justify-between transition-colors duration-300 group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 group-hover:bg-emerald-500 flex items-center justify-center text-white transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div className="text-left">
              <p className="font-medium text-sm text-white">Appearance</p>
              <p className="text-emerald-300 text-xs">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</p>
            </div>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-900/50'}`}>
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isDarkMode ? 'left-5' : 'left-1'}`}></div>
          </div>
        </button>
        
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-300/60 font-medium tracking-wide">
          <span>Designed and developed by</span>
          <a
            href="https://pixelcult.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            <img
              src="/bgtext.png"
              alt="PixelCult"
              className="h-[14px] w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
