import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Edit2, Trash2, X, Save, Loader2, Download, Upload } from 'lucide-react';
import { generatePDF } from '../utils/pdfExport';
import * as XLSX from 'xlsx';
import PatientHistory from './PatientHistory';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const PatientsList = ({ currentAction, setCurrentAction, activeDoctor, doctors }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    sex: 'Male',
    age: '',
    marital_status: '',
    mobile: '',
    occupation: '',
    family_history: '',
    place: '',
    chief_complaints: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (currentAction === 'add_patient') {
      openAddModal();
      setCurrentAction(null);
    }
  }, [currentAction, setCurrentAction]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/patients`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      } else {
        throw new Error('Failed to fetch patients');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        const response = await fetch(`${API_URL}/patients/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchPatients();
        }
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPatients.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedPatients.length} selected patient(s)?`)) {
      try {
        const response = await fetch(`${API_URL}/patients/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedPatients })
        });
        if (response.ok) {
          setSelectedPatients([]);
          fetchPatients();
        }
      } catch (err) {
        console.error('Bulk delete failed:', err);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete ALL patients? This cannot be undone.')) {
      try {
        const response = await fetch(`${API_URL}/patients`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setSelectedPatients([]);
          fetchPatients();
        }
      } catch (err) {
        console.error('Delete all failed:', err);
      }
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPatients(filteredPatients.map(p => p.id));
    } else {
      setSelectedPatients([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedPatients(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const isEdit = !!editingPatient;
      const url = isEdit ? `${API_URL}/patients/${editingPatient.id}` : `${API_URL}/patients`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = { ...formData };
      if (!isEdit) {
        payload.id = `P${String(patients.length + 1).padStart(3, '0')}`;
        payload.doctor_name = activeDoctor?.name || 'Unknown';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowModal(false);
        setEditingPatient(null);
        fetchPatients();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      date: patient.date.split('T')[0],
      sex: patient.sex,
      age: patient.age,
      marital_status: patient.marital_status || '',
      mobile: patient.mobile,
      occupation: patient.occupation || '',
      family_history: patient.family_history || '',
      place: patient.place || ''
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingPatient(null);
    setFormData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      sex: 'Male',
      age: '',
      marital_status: '',
      mobile: '',
      occupation: '',
      family_history: '',
      place: '',
      chief_complaints: ''
    });
    setShowModal(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        // Determine safe ID start point
        const existingIds = patients.map(p => parseInt(p.id.substring(1)) || 0);
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;

        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const getVal = (...keys) => {
            for (const key of keys) {
              const rowKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
              if (rowKey && row[rowKey] !== undefined && row[rowKey] !== '') {
                return row[rowKey];
              }
            }
            return '';
          };

          const nameRaw = getVal('Name', 'Patient Name');
          if (!nameRaw) continue; // Skip empty rows

          let dateStr = new Date().toISOString().split('T')[0];
          const yearRaw = getVal('Year', 'Date of visit', 'Date');
          
          if (yearRaw instanceof Date) {
            if (!isNaN(yearRaw.getTime())) {
              dateStr = yearRaw.toISOString().split('T')[0];
            }
          } else if (yearRaw) {
            const strYear = String(yearRaw).trim();
            if (strYear.length === 4 && !isNaN(strYear)) {
              dateStr = `${strYear}-01-01`;
            } else {
              // Try basic parse
              const parsedDate = new Date(strYear);
              if (!isNaN(parsedDate.getTime())) {
                dateStr = parsedDate.toISOString().split('T')[0];
              } else {
                // Try parsing DD/MM/YY or DD/MM/YYYY
                const parts = strYear.split(/[/-]/);
                if (parts.length === 3) {
                  const day = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10) - 1;
                  let year = parseInt(parts[2], 10);
                  if (year < 100) year += 2000;
                  const d = new Date(year, month, day);
                  if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString().split('T')[0];
                  }
                }
              }
            }
          }

          let sexStr = 'Other';
          const genderRaw = String(getVal('M/ F', 'Gender', 'Sex')).trim().toUpperCase();
          if (genderRaw === 'M' || genderRaw === 'MALE') sexStr = 'Male';
          else if (genderRaw === 'F' || genderRaw === 'FEMALE') sexStr = 'Female';

          const ageRaw = getVal('Age');
          let age = parseInt(ageRaw);
          if (isNaN(age)) age = 0;

          const mobileRaw = getVal('Phone Number', 'Phone', 'Mobile');
          const mobileStr = String(mobileRaw).trim() || 'N/A'; // N/A prevents backend validation failure

          const placeRaw = getVal('Long Place', 'Place Short', 'Place', 'Address');
          const occRaw = getVal('Occupation');

          const payload = {
            id: `P${String(maxId + successCount + failCount + 1).padStart(3, '0')}`,
            name: String(nameRaw).trim() || 'Unknown',
            date: dateStr,
            sex: sexStr,
            age: age,
            marital_status: '',
            mobile: mobileStr,
            occupation: String(occRaw).trim() || '',
            family_history: '',
            place: String(placeRaw).trim() || ''
          };

          const response = await fetch(`${API_URL}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            const errData = await response.json().catch(() => ({}));
            errors.push(`Row ${i+2} (${nameRaw}): ${errData.error || 'Unknown error'}`);
          }
        }

        let msg = `Upload complete. Added ${successCount} patients.`;
        if (failCount > 0) {
          msg += `\nFailed to add ${failCount} patients.\nErrors:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) msg += `\n...and ${errors.length - 5} more.`;
        }
        alert(msg);
        fetchPatients();
      } catch (err) {
        console.error('Error parsing Excel:', err);
        alert('Failed to parse Excel file. Check console for details.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mobile.includes(searchTerm)
  );

  const handleDownloadPDF = () => {
    const columns = ['ID', 'Patient Name', 'Age', 'Sex', 'Mobile', 'Marital Status', 'Registration Date'];
    const data = filteredPatients.map(p => [
      p.id,
      p.name,
      p.age,
      p.sex,
      p.mobile,
      p.marital_status,
      new Date(p.date).toLocaleDateString()
    ]);
    generatePDF('Patient Directory', columns, data, 'Patients_List');
  };

  const handleDownloadSinglePDF = (p) => {
    const columns = ['Field', 'Details'];
    const data = [
      ['Patient ID', p.id],
      ['Full Name', p.name],
      ['Age / Sex', `${p.age} / ${p.sex}`],
      ['Mobile', p.mobile],
      ['Marital Status', p.marital_status],
      ['Occupation', p.occupation || 'N/A'],
      ['Family History', p.family_history || 'None'],
      ['Registration Date', new Date(p.date).toLocaleDateString()]
    ];
    generatePDF(`Patient Details - ${p.name}`, columns, data, `Patient_${p.id}`);
  };

  return (
    <div className="p-8 animate-fade-in transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white transition-colors duration-300">Patient Directory</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">Manage patient records and details.</p>
        </div>
        <div className="flex space-x-3 flex-wrap justify-end gap-y-2">
          {selectedPatients.length > 0 && (
            <button onClick={handleBulkDelete} className="btn-secondary text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/30">
              <Trash2 className="w-5 h-5" />
              <span>Delete Selected ({selectedPatients.length})</span>
            </button>
          )}
          <button onClick={handleDeleteAll} className="btn-secondary text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/30">
            <Trash2 className="w-5 h-5" />
            <span>Delete All</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="btn-secondary" 
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span>{isUploading ? 'Uploading...' : 'Upload Excel'}</span>
          </button>
          <button onClick={handleDownloadPDF} className="btn-secondary">
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-5 h-5" />
            <span>New Patient</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center transition-colors duration-300">
          <div className="relative w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, ID, or mobile..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300 dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Total: {filteredPatients.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors duration-300">
                <th className="p-4 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    onChange={handleSelectAll}
                    checked={filteredPatients.length > 0 && selectedPatients.length === filteredPatients.length}
                  />
                </th>
                <th className="p-4">ID</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Age/Sex</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Place</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 transition-colors duration-300">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500 dark:text-slate-400">Loading patients...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500 dark:text-slate-400">No patients found.</td></tr>
              ) : (
                filteredPatients.map(patient => (
                  <tr key={patient.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300 group ${selectedPatients.includes(patient.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : ''}`}>
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectedPatients.includes(patient.id)}
                        onChange={() => handleSelect(patient.id)}
                      />
                    </td>
                    <td className="p-4 font-medium text-emerald-700 dark:text-emerald-400">{patient.id}</td>
                    <td className="p-4 cursor-pointer" onClick={() => setSelectedPatientForHistory(patient)}>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{patient.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Reg: {new Date(patient.date).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{patient.age} / {patient.sex}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">{patient.mobile}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {patient.place || '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDownloadSinglePDF(patient)} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" title="Download Details">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(patient)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit Patient">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(patient.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete Patient">
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

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in-overlay">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-in border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 flex-shrink-0 transition-colors duration-300">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingPatient ? 'Edit Patient Details' : 'Register New Patient'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mobile Number *</label>
                  <input required type="tel" className="input-field" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Age *</label>
                  <input required type="number" className="input-field" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sex *</label>
                  <select className="input-field" value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Marital Status</label>
                  <select className="input-field" value={formData.marital_status} onChange={e => setFormData({...formData, marital_status: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Visit *</label>
                  <input required type="date" className="input-field" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Place</label>
                  <input type="text" className="input-field" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Occupation</label>
                  <input type="text" className="input-field" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
                </div>
                {!editingPatient && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chief Complaints (Initial Visit)</label>
                    <textarea rows="3" className="input-field resize-none" value={formData.chief_complaints} onChange={e => setFormData({...formData, chief_complaints: e.target.value})} placeholder="Symptoms, history..."></textarea>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Family Medical History</label>
                  <textarea rows="3" className="input-field resize-none" value={formData.family_history} onChange={e => setFormData({...formData, family_history: e.target.value})} placeholder="Any relevant family history..."></textarea>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSubmitting ? 'Saving...' : (editingPatient ? 'Update Patient' : 'Save Patient')}</span>
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedPatientForHistory && (
        <PatientHistory 
          patient={selectedPatientForHistory} 
          onClose={() => setSelectedPatientForHistory(null)}
          activeDoctor={activeDoctor}
          doctors={doctors}
        />
      )}
    </div>
  );
};

export default PatientsList;
