import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientsList from './components/PatientsList';
import Prescriptions from './components/Prescriptions';
import TestRecords from './components/TestRecords';
import Appointments from './components/Appointments';
import Admin from './components/Admin';
import Login from './components/Login';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ClinicRecordsApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'doctor'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentAction, setCurrentAction] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [doctors, setDoctors] = useState([]);
  const [activeDoctor, setActiveDoctor] = useState(null);
  const [pendingDoctorId, setPendingDoctorId] = useState(null);

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${API_URL}/doctors`);
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
        if (data.length > 0) {
          if (pendingDoctorId) {
            const matched = data.find(d => d.id.toString() === pendingDoctorId.toString());
            if (matched) {
              setActiveDoctor(matched);
              setPendingDoctorId(null);
              return;
            }
          }
          setActiveDoctor(prev => prev ? data.find(d => d.id === prev.id) || data[0] : data[0]);
        } else {
          setActiveDoctor(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  // Restore session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem('clinic_session');
    if (storedSession) {
      try {
        const { role, doctorId } = JSON.parse(storedSession);
        if (role === 'admin') {
          setIsLoggedIn(true);
          setUserRole('admin');
        } else if (role === 'doctor') {
          setIsLoggedIn(true);
          setUserRole('doctor');
          setPendingDoctorId(doctorId);
        }
      } catch (err) {
        console.error('Failed to parse clinic_session', err);
        localStorage.removeItem('clinic_session');
      }
    }
  }, []);

  // Fetch doctors list when isLoggedIn changes to ensure we have fresh data
  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Resolve pending doctor if doctors list loaded later
  useEffect(() => {
    if (doctors.length > 0 && pendingDoctorId) {
      const matched = doctors.find(d => d.id.toString() === pendingDoctorId.toString());
      if (matched) {
        setActiveDoctor(matched);
        setPendingDoctorId(null);
      }
    }
  }, [doctors, pendingDoctorId]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Prevent doctors from accessing the admin tab
  useEffect(() => {
    if (isLoggedIn && userRole === 'doctor' && activeTab === 'admin') {
      setActiveTab('dashboard');
    }
  }, [activeTab, userRole, isLoggedIn]);

  // Sync doctor changes to session storage
  useEffect(() => {
    if (isLoggedIn && userRole === 'doctor' && activeDoctor) {
      localStorage.setItem('clinic_session', JSON.stringify({ role: 'doctor', doctorId: activeDoctor.id }));
    }
  }, [activeDoctor, userRole, isLoggedIn]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleLogin = ({ role, doctor }) => {
    setIsLoggedIn(true);
    setUserRole(role);
    if (role === 'doctor') {
      setActiveDoctor(doctor);
      localStorage.setItem('clinic_session', JSON.stringify({ role: 'doctor', doctorId: doctor.id }));
    } else {
      localStorage.setItem('clinic_session', JSON.stringify({ role: 'admin' }));
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setActiveDoctor(null);
    setPendingDoctorId(null);
    localStorage.removeItem('clinic_session');
  };

  if (!isLoggedIn) {
    return (
      <Login 
        doctors={doctors} 
        onLogin={handleLogin} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
      />
    );
  }

  return (
    <div className={`min-h-screen flex overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
        doctors={doctors}
        activeDoctor={activeDoctor}
        setActiveDoctor={setActiveDoctor}
        userRole={userRole}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 h-screen overflow-y-auto relative dark:bg-slate-900 transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-64 bg-emerald-600/5 dark:bg-emerald-600/10 -z-10"></div>
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} setCurrentAction={setCurrentAction} />}
        {activeTab === 'patients' && <PatientsList currentAction={currentAction} setCurrentAction={setCurrentAction} activeDoctor={activeDoctor} doctors={doctors} userRole={userRole} />}
        {activeTab === 'prescriptions' && <Prescriptions currentAction={currentAction} setCurrentAction={setCurrentAction} activeDoctor={activeDoctor} doctors={doctors} />}
        {activeTab === 'tests' && <TestRecords currentAction={currentAction} setCurrentAction={setCurrentAction} activeDoctor={activeDoctor} />}
        {activeTab === 'appointments' && <Appointments currentAction={currentAction} setCurrentAction={setCurrentAction} activeDoctor={activeDoctor} />}
        {activeTab === 'admin' && <Admin doctors={doctors} fetchDoctors={fetchDoctors} />}
      </main>
    </div>
  );
};

export default ClinicRecordsApp;