import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Clock, Plus, CheckCircle, XCircle, Search, X, Loader2, Download } from 'lucide-react';
import { generatePDF } from '../utils/pdfExport';
import PatientSelect from './PatientSelect';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Appointments = ({ currentAction, setCurrentAction }) => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '09:00',
    reason: '',
    status: 'scheduled',
    notes: ''
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (currentAction === 'add_appointment') {
      setShowModal(true);
      setCurrentAction(null);
    }
  }, [currentAction, setCurrentAction]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/appointments`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch(`${API_URL}/patients`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (err) {
      console.error('Failed to fetch patients', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patient_id) {
      alert("Please select a patient.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        appointment_time: formData.appointment_time + ':00'
      };
      
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowModal(false);
        fetchAppointments();
        setFormData({
          patient_id: '',
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: '09:00',
          reason: '',
          status: 'scheduled',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id, newStatus, currentApt) => {
    try {
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentApt, status: newStatus })
      });
      if (response.ok) fetchAppointments();
    } catch (err) {
      console.error('Update status failed:', err);
    }
  };

  const filteredAppointments = appointments.filter(a => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = a.patient_name ? a.patient_name.toLowerCase().includes(searchLower) : false;
    const dateMatch = a.appointment_date ? a.appointment_date.includes(searchTerm) : false;
    const idMatch = a.patient_id ? a.patient_id.toLowerCase().includes(searchLower) : false;
    const mobileMatch = a.mobile ? String(a.mobile).includes(searchTerm) : false;
    return nameMatch || dateMatch || idMatch || mobileMatch;
  });

  const handleDownloadPDF = () => {
    const columns = ['Date', 'Time', 'Patient Name', 'Reason', 'Status'];
    const data = filteredAppointments.map(a => [
      new Date(a.appointment_date).toLocaleDateString(),
      a.appointment_time.slice(0, 5),
      a.patient_name,
      a.reason || 'General Checkup',
      a.status.toUpperCase()
    ]);
    generatePDF('Appointments List', columns, data, 'Appointments');
  };

  const handleDownloadSinglePDF = (a) => {
    const columns = ['Field', 'Details'];
    const data = [
      ['Date', new Date(a.appointment_date).toLocaleDateString()],
      ['Time', a.appointment_time.slice(0, 5)],
      ['Patient Name', a.patient_name],
      ['Status', a.status.toUpperCase()],
      ['Reason for Visit', a.reason || 'General Checkup'],
      ['Additional Notes', a.notes || 'None']
    ];
    generatePDF(`Appointment Details - ${a.patient_name}`, columns, data, `Appointment_${a.id}`);
  };

  return (
    <div className="p-8 animate-fade-in transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white transition-colors duration-300">Appointments</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">Schedule and manage clinic visits.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleDownloadPDF} className="btn-secondary">
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-5 h-5" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search appointments by patient name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm transition-all duration-300 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">Loading appointments...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">No appointments found.</div>
          ) : (
            filteredAppointments.map(apt => (
              <div key={apt.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center hover:shadow-md transition-all duration-300">
                <div className="flex-shrink-0 w-16 text-center border-r border-slate-100 dark:border-slate-700 pr-4 mr-4 transition-colors duration-300">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors duration-300">
                    {new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 transition-colors duration-300">
                    {new Date(apt.appointment_date).getDate()}
                  </p>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 transition-colors duration-300">{apt.patient_name}</h4>
                      <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1 transition-colors duration-300">
                        <Clock className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500" />
                        {apt.appointment_time.slice(0, 5)}
                        <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
                        <span>{apt.reason || 'General Checkup'}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
                        ${apt.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 
                          apt.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 
                          'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  </div>
                </div>

                {apt.status === 'scheduled' && (
                  <div className="ml-6 flex space-x-2">
                    <button onClick={() => handleDownloadSinglePDF(apt)} title="Download Appointment" className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-slate-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                    <button onClick={() => updateStatus(apt.id, 'completed', apt)} title="Mark Completed" className="p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors">
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button onClick={() => updateStatus(apt.id, 'cancelled', apt)} title="Cancel Appointment" className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg transition-colors">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-emerald-900 dark:bg-emerald-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CalendarIcon className="w-32 h-32" />
            </div>
            <h3 className="text-xl font-bold mb-2">Today's Overview</h3>
            <p className="text-emerald-200 text-sm mb-6">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-emerald-200 text-sm mb-1">Total</p>
                <p className="text-3xl font-bold">{appointments.filter(a => a.appointment_date.includes(new Date().toISOString().split('T')[0])).length}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-emerald-200 text-sm mb-1">Pending</p>
                <p className="text-3xl font-bold">{appointments.filter(a => a.appointment_date.includes(new Date().toISOString().split('T')[0]) && a.status === 'scheduled').length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in-overlay">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-slide-in border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 flex-shrink-0 transition-colors duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Book Appointment</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Patient *</label>
                  <PatientSelect 
                    patients={patients} 
                    value={formData.patient_id} 
                    onChange={val => setFormData({...formData, patient_id: val})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                    <input required type="date" className="input-field" value={formData.appointment_date} onChange={e => setFormData({...formData, appointment_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time *</label>
                    <input required type="time" className="input-field" value={formData.appointment_time} onChange={e => setFormData({...formData, appointment_time: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason for Visit</label>
                  <input type="text" className="input-field" placeholder="e.g. Follow up, Fever" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Additional Notes</label>
                  <textarea rows="2" className="input-field resize-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700 transition-colors duration-300">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting ? 'Booking...' : 'Book Now'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Appointments;
