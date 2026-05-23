import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, Loader2, UserPlus, Stethoscope, Mail, Phone } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Admin = ({ doctors, fetchDoctors }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    qualification: '',
    mobile: '',
    email: '',
    secret_key: ''
  });



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        fetchDoctors();
        setFormData({
          name: '',
          qualification: '',
          mobile: '',
          email: '',
          secret_key: ''
        });
      } else {
        const errorData = await response.json();
        alert(`Failed to add doctor: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('An error occurred while saving the doctor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        const response = await fetch(`${API_URL}/doctors/${id}`, { method: 'DELETE' });
        if (response.ok) {
          fetchDoctors();
        } else {
          alert('Failed to delete doctor.');
        }
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div className="p-8 animate-fade-in transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white transition-colors duration-300">Admin Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">Manage clinic doctors and staff access.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <UserPlus className="w-5 h-5" />
          <span>Add Doctor</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center transition-colors duration-300">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-500" />
            Registered Doctors
          </h3>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Total: {doctors.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors duration-300">
                <th className="p-4">Doctor Name</th>
                <th className="p-4">Highest Qualification</th>
                <th className="p-4">Contact Information</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 transition-colors duration-300">
              {doctors.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500 dark:text-slate-400">No doctors registered yet.</td></tr>
              ) : (
                doctors.map(doctor => (
                  <tr key={doctor.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300 group">
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{doctor.name}</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                        {doctor.qualification}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {doctor.mobile}</div>
                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {doctor.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDelete(doctor.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete Doctor">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in-overlay">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-in border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 flex-shrink-0 transition-colors duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Add New Doctor
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Doctor Name *</label>
                  <input required type="text" className="input-field" placeholder="e.g. Dr. Jane Smith" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Highest Qualification *</label>
                  <input required type="text" className="input-field" placeholder="e.g. MBBS, MD (Homeopathy)" value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mobile Number *</label>
                  <input required type="tel" className="input-field" placeholder="e.g. 9876543210" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                  <input required type="email" className="input-field" placeholder="e.g. doctor@clinic.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Secret Key (Password) *</label>
                  <input required type="password" className="input-field" placeholder="Create a secret key for this doctor" value={formData.secret_key} onChange={e => setFormData({...formData, secret_key: e.target.value})} />
                </div>
                
                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 dark:border-slate-700 transition-colors duration-300 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Doctor'}
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

export default Admin;
