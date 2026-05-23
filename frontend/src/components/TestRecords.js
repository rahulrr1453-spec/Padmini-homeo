import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, FileText, Download, Trash2, X, Loader2 } from 'lucide-react';
import { generatePDF } from '../utils/pdfExport';
import PatientSelect from './PatientSelect';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TestRecords = ({ currentAction, setCurrentAction, activeDoctor }) => {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    test_date: new Date().toISOString().split('T')[0],
    test_name: '',
    test_type: 'Blood Test',
    result: '',
    doctor_name: activeDoctor ? activeDoctor.name : 'Dr. Padmini',
    notes: ''
  });

  useEffect(() => {
    fetchRecords();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (currentAction === 'add_test') {
      setShowModal(true);
      setCurrentAction(null);
    }
  }, [currentAction, setCurrentAction]);

  useEffect(() => {
    if (activeDoctor) {
      setFormData(prev => ({ ...prev, doctor_name: activeDoctor.name }));
    }
  }, [activeDoctor]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/test-records`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to fetch test records', err);
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
      const response = await fetch(`${API_URL}/test-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        fetchRecords();
        setFormData({
          patient_id: '',
          test_date: new Date().toISOString().split('T')[0],
          test_name: '',
          test_type: 'Blood Test',
          result: '',
          doctor_name: activeDoctor ? activeDoctor.name : 'Dr. Padmini',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this test record?')) {
      try {
        const response = await fetch(`${API_URL}/test-records/${id}`, { method: 'DELETE' });
        if (response.ok) fetchRecords();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const filteredRecords = records.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = r.patient_name ? r.patient_name.toLowerCase().includes(searchLower) : false;
    const testMatch = r.test_name ? r.test_name.toLowerCase().includes(searchLower) : false;
    const idMatch = r.patient_id ? r.patient_id.toLowerCase().includes(searchLower) : false;
    const mobileMatch = r.patient_mobile ? String(r.patient_mobile).includes(searchTerm) : false;
    return nameMatch || testMatch || idMatch || mobileMatch;
  });

  const handleDownloadPDF = () => {
    const columns = ['Date', 'Patient Name', 'Test Name', 'Test Type', 'Doctor', 'Result Summary'];
    const data = filteredRecords.map(r => [
      new Date(r.test_date).toLocaleDateString(),
      `${r.patient_name} (${r.patient_id})`,
      r.test_name,
      r.test_type,
      r.doctor_name,
      r.result || 'Pending...'
    ]);
    generatePDF('Laboratory Test Records', columns, data, 'Test_Records');
  };

  const handleDownloadSinglePDF = (r) => {
    const columns = ['Field', 'Details'];
    const data = [
      ['Date', new Date(r.test_date).toLocaleDateString()],
      ['Patient Name', `${r.patient_name} (${r.patient_id})`],
      ['Test Name', r.test_name],
      ['Test Type', r.test_type],
      ['Doctor', r.doctor_name],
      ['Result Summary', r.result || 'Pending...']
    ];
    generatePDF(`Test Record - ${r.patient_name}`, columns, data, `TestRecord_${r.id}`);
  };

  return (
    <div className="p-8 animate-fade-in transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white transition-colors duration-300">Laboratory & Tests</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">Manage patient lab reports and test results.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleDownloadPDF} className="btn-secondary">
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-5 h-5" />
            <span>Upload Result</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center transition-colors duration-300">
          <div className="relative w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by patient or test name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300 dark:text-white dark:placeholder-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors duration-300">
                <th className="p-4">Date</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Test Name & Type</th>
                <th className="p-4">Result Summary</th>
                <th className="p-4">Doctor</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 transition-colors duration-300">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400">Loading records...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400">No test records found.</td></tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300 group">
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                      {new Date(record.test_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      {record.patient_name} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">({record.patient_id})</span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{record.test_name}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 inline-block px-2 py-1 rounded-md mt-1">{record.test_type}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {record.result || 'Pending review...'}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">{record.doctor_name}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => handleDownloadSinglePDF(record)} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" title="Download Record">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(record.id)} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete Record">
                          <Trash2 className="w-4 h-4" />
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-in border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 flex-shrink-0 transition-colors duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Add Test Record</h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Patient *</label>
                  <PatientSelect 
                    patients={patients} 
                    value={formData.patient_id} 
                    onChange={val => setFormData({...formData, patient_id: val})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Test Date *</label>
                  <input required type="date" className="input-field" value={formData.test_date} onChange={e => setFormData({...formData, test_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Test Type *</label>
                  <select className="input-field" value={formData.test_type} onChange={e => setFormData({...formData, test_type: e.target.value})}>
                    <option>Blood Test</option>
                    <option>Urine Analysis</option>
                    <option>X-Ray</option>
                    <option>Ultrasound</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Test Name/Description *</label>
                  <input required type="text" className="input-field" placeholder="e.g. Complete Blood Count (CBC)" value={formData.test_name} onChange={e => setFormData({...formData, test_name: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Results Summary</label>
                  <textarea rows="3" className="input-field resize-none" value={formData.result} onChange={e => setFormData({...formData, result: e.target.value})} placeholder="Enter key findings..."></textarea>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700 transition-colors duration-300">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Save Record'}
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

export default TestRecords;
