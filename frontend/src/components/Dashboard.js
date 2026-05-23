import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Users, FileText, Calendar, TrendingUp, Clock, AlertCircle, CalendarClock, X, ChevronRight, BarChart3, Filter } from 'lucide-react';
import { Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Dashboard = ({ setActiveTab, setCurrentAction }) => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalTests: 0,
    upcomingAppointments: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAnalytic, setSelectedAnalytic] = useState(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState('All');
  
  // Raw data for charts
  const [rawData, setRawData] = useState({
    patients: [],
    tests: [],
    appointments: []
  });

  const COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    if (seconds < 30) return "Just now";
    return Math.floor(seconds) + " seconds ago";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch(`${API_URL}/stats`);
        if (statsRes.ok) setStats(await statsRes.json());
        
        const [patientsRes, testsRes, appointmentsRes] = await Promise.all([
          fetch(`${API_URL}/patients`),
          fetch(`${API_URL}/test-records`),
          fetch(`${API_URL}/appointments`)
        ]);

        let patients = [];
        let tests = [];
        let appointments = [];
        let activities = [];

        if (patientsRes.ok) {
          patients = await patientsRes.json();
          const recentPatients = patients.slice(0, 5).map(p => ({
            id: `p-${p.id}`,
            title: `New patient registered: ${p.name}`,
            date: new Date(p.timestamp),
            color: 'bg-emerald-500'
          }));
          activities = [...activities, ...recentPatients];
        }

        if (testsRes.ok) {
          tests = await testsRes.json();
          const recentTests = tests.slice(0, 5).map(t => ({
            id: `t-${t.id}`,
            title: `Test record added for ${t.patient_name}: ${t.test_name}`,
            date: new Date(t.created_at || t.test_date),
            color: 'bg-purple-500'
          }));
          activities = [...activities, ...recentTests];
        }

        if (appointmentsRes.ok) {
          appointments = await appointmentsRes.json();
        }

        setRawData({
          patients,
          tests,
          appointments
        });

        activities.sort((a, b) => b.date - a.date);
        setRecentActivity(activities.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      id: 'patients',
      title: 'Total Patients',
      value: stats.totalPatients,
      icon: <Users className="w-8 h-8 text-blue-500" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-100 dark:border-blue-800/30',
      trend: '+12% this month',
      color: '#3b82f6'
    },
    {
      id: 'appointments',
      title: 'Upcoming Appointments',
      value: stats.upcomingAppointments,
      icon: <Calendar className="w-8 h-8 text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-100 dark:border-emerald-800/30',
      trend: '3 today',
      color: '#10b981'
    },
    {
      id: 'tests',
      title: 'Test Records',
      value: stats.totalTests,
      icon: <FileText className="w-8 h-8 text-purple-500" />,
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-100 dark:border-purple-800/30',
      trend: '+5% this week',
      color: '#a855f7'
    }
  ];

  const getChartData = useMemo(() => {
    if (!selectedAnalytic) return [];
    
    let data = [];
    let dateField = '';
    let categoryField = '';
    
    if (selectedAnalytic === 'patients') {
      data = rawData.patients;
      dateField = 'timestamp';
      categoryField = 'sex';
    } else if (selectedAnalytic === 'tests') {
      data = rawData.tests;
      dateField = 'test_date';
      categoryField = 'test_type';
    } else if (selectedAnalytic === 'appointments') {
      data = rawData.appointments;
      dateField = 'appointment_date';
      categoryField = 'status';
    }

    // Filter by year and month
    const filteredData = data.filter(item => {
      const date = new Date(item[dateField] || item.created_at);
      if (isNaN(date.getTime())) return false;
      
      const yearMatch = date.getFullYear().toString() === filterYear;
      const monthMatch = filterMonth === 'All' || date.toLocaleString('default', { month: 'long' }) === filterMonth;
      
      return yearMatch && monthMatch;
    });

    // Group by category
    const groups = filteredData.reduce((acc, item) => {
      const category = item[categoryField] || 'Unspecified';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [selectedAnalytic, rawData, filterYear, filterMonth]);

  const years = useMemo(() => {
    const allDates = [
      ...rawData.patients.map(p => new Date(p.timestamp)),
      ...rawData.tests.map(t => new Date(t.test_date)),
      ...rawData.appointments.map(a => new Date(a.appointment_date))
    ].filter(d => !isNaN(d.getTime()));
    
    const uniqueYears = [...new Set(allDates.map(d => d.getFullYear().toString()))];
    return uniqueYears.length > 0 ? uniqueYears.sort((a, b) => b - a) : [new Date().getFullYear().toString()];
  }, [rawData]);

  const months = ["All", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const renderChartModal = () => {
    if (!selectedAnalytic) return null;
    
    const card = statCards.find(c => c.id === selectedAnalytic);
    const data = getChartData;
    
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in-overlay">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-3xl">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${card.bg}`}>
                {React.cloneElement(card.icon, { className: 'w-6 h-6' })}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{card.title} Distribution</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Category breakdown for {filterMonth} {filterYear}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <select 
                  className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              
              <button 
                onClick={() => setSelectedAnalytic(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-8 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Records</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{data.reduce((sum, item) => sum + item.value, 0)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Categories</p>
                <p className="text-3xl font-bold text-emerald-500">{data.length}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Top Category</p>
                <p className="text-3xl font-bold text-blue-500 truncate" title={data.length > 0 ? data.sort((a, b) => b.value - a.value)[0].name : '-'}>
                  {data.length > 0 ? data.sort((a, b) => b.value - a.value)[0].name : '-'}
                </p>
              </div>
            </div>

            <div className="h-[400px] w-full bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative">
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        padding: '10px'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                  <p>No data available for the selected period</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
              <p>Breakdown by {
                selectedAnalytic === 'patients' ? 'Gender' : 
                selectedAnalytic === 'appointments' ? 'Status' : 'Test Type'
              }</p>
              <p>Showing synchronized results from database</p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="p-8 animate-fade-in transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white transition-colors duration-300">{getGreeting()}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors duration-300">Here's what's happening at your clinic today.</p>
        </div>
        
        <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 tracking-wider">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, idx) => (
          <div 
            key={idx} 
            onClick={() => setSelectedAnalytic(card.id)}
            className={`glass-card rounded-2xl p-6 border ${card.bg} ${card.border} hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none cursor-pointer transition-all duration-500 group`}
          >
            <div className="flex justify-between items-start">
              <div className="transform group-hover:scale-105 transition-transform duration-500">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{card.title}</p>
                <h3 className="text-4xl font-bold text-slate-800 dark:text-white transition-colors duration-300">
                  {loading ? '...' : card.value}
                </h3>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm transition-colors duration-300">
                {card.icon}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm transition-colors duration-300">
              <div className="flex items-center text-slate-600 dark:text-slate-300">
                <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" />
                <span>{card.trend}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {renderChartModal()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center transition-colors duration-300">
              <Clock className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
              Recent Activity
            </h3>
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading activity...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity found.</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors duration-300">
                  <div className={`w-2 h-2 rounded-full ${activity.color} mr-4`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors duration-300">{activity.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">{timeAgo(activity.date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center transition-colors duration-300">
              <AlertCircle className="w-5 h-5 mr-2 text-amber-500" />
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => { setActiveTab('patients'); setCurrentAction('add_patient'); }}
              className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-300 text-left group"
            >
              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-slate-800 dark:text-slate-200">Add New Patient</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Register a new profile</p>
            </button>
            <button 
              onClick={() => { setActiveTab('appointments'); setCurrentAction('add_appointment'); }}
              className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 text-left group"
            >
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-slate-800 dark:text-slate-200">Book Appointment</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Schedule a visit</p>
            </button>
            <button 
              onClick={() => { setActiveTab('tests'); setCurrentAction('add_test'); }}
              className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 text-left group"
            >
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-slate-800 dark:text-slate-200">Add Test Record</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload lab results</p>
            </button>
            <button 
              onClick={() => { setActiveTab('tests'); }}
              className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl hover:border-slate-500 dark:hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 text-left group"
            >
              <TrendingUp className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-slate-800 dark:text-slate-200">View Reports</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Generate analytics</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
