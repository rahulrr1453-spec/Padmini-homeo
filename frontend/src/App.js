import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientsList from './components/PatientsList';
import Prescriptions from './components/Prescriptions';
import TestRecords from './components/TestRecords';
import Appointments from './components/Appointments';
import Admin from './components/Admin';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ClinicRecordsApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentAction, setCurrentAction] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [doctors, setDoctors] = useState([]);
  const [activeDoctor, setActiveDoctor] = useState(null);

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${API_URL}/doctors`);
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
        if (data.length > 0) {
          // If no active doctor is selected, default to the first one
          setActiveDoctor(prev => prev ? data.find(d => d.id === prev.id) || data[0] : data[0]);
        } else {
          setActiveDoctor(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

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
      />
      
      <main className="flex-1 h-screen overflow-y-auto relative dark:bg-slate-900 transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-64 bg-emerald-600/5 dark:bg-emerald-600/10 -z-10"></div>
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} setCurrentAction={setCurrentAction} />}
        {activeTab === 'patients' && <PatientsList currentAction={currentAction} setCurrentAction={setCurrentAction} activeDoctor={activeDoctor} doctors={doctors} />}
        {activeTab === 'prescriptions' && <Prescriptions currentAction={currentAction} setCurrentAction={setCurrentAction} activeDoctor={activeDoctor} doctors={doctors} />}
        {activeTab === 'tests' && <TestRecords currentAction={currentAction} setCurrentAction={setCurrentAction} activeDoctor={activeDoctor} />}
        {activeTab === 'appointments' && <Appointments currentAction={currentAction} setCurrentAction={setCurrentAction} activeDoctor={activeDoctor} />}
        {activeTab === 'admin' && <Admin doctors={doctors} fetchDoctors={fetchDoctors} />}
      </main>
    </div>
  );
};

export default ClinicRecordsApp;