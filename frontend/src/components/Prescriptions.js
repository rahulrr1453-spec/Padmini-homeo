import React, { useState, useEffect } from 'react';
import { Pill, Plus, Trash2, FileText, Search } from 'lucide-react';
import { generatePrescriptionPDF } from '../utils/prescriptionPdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Prescriptions = ({ currentAction, setCurrentAction, activeDoctor, doctors }) => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [prescribingDoctor, setPrescribingDoctor] = useState(activeDoctor);

  useEffect(() => {
    if (activeDoctor) {
      setPrescribingDoctor(activeDoctor);
    }
  }, [activeDoctor]);
  
  const [patientInfo, setPatientInfo] = useState({
    id: '',
    name: '',
    age: '',
    sex: 'Male'
  });
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [pastComplaints, setPastComplaints] = useState([]);
  const [medicines, setMedicines] = useState([
    { medicineName: '', potency: '', quantity: '', instructions: '' }
  ]);
  
  const [notes, setNotes] = useState('');

  useEffect(() => {
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
    fetchPatients();
  }, []);

  const handlePatientSelect = async (patient) => {
    setPatientInfo({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      sex: patient.sex
    });
    setSearchTerm('');
    setShowDropdown(false);

    // Fetch past chief complaints for this patient
    try {
      const response = await fetch(`${API_URL}/patients/${patient.id}/visits`);
      if (response.ok) {
        const visits = await response.json();
        // Extract unique non-empty chief complaints
        const complaints = visits
          .map(v => v.chief_complaints)
          .filter(c => c && c.trim() !== '');
        const uniqueComplaints = [...new Set(complaints)];
        setPastComplaints(uniqueComplaints);
      }
    } catch (err) {
      console.error('Failed to fetch past visits', err);
    }
  };

  const handleAddMedicine = () => {
    setMedicines([...medicines, { medicineName: '', potency: '', quantity: '', instructions: '' }]);
  };

  const handleRemoveMedicine = (index) => {
    const newMedicines = [...medicines];
    newMedicines.splice(index, 1);
    if (newMedicines.length === 0) {
      newMedicines.push({ medicineName: '', potency: '', quantity: '', instructions: '' });
    }
    setMedicines(newMedicines);
  };

  const handleMedicineChange = (index, field, value) => {
    const newMedicines = [...medicines];
    newMedicines[index][field] = value;
    setMedicines(newMedicines);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!patientInfo.name) {
      alert('Please enter or select a patient name.');
      return;
    }
    if (!prescribingDoctor) {
      alert('Please select a prescribing doctor.');
      return;
    }
    const validMedicines = medicines.filter(m => m.medicineName.trim() !== '');
    if (validMedicines.length === 0) {
      alert('Please add at least one medicine.');
      return;
    }

    // Attempt to save to database
    try {
      if (patientInfo.id) {
        await fetch(`${API_URL}/visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_id: patientInfo.id,
            doctor_name: prescribingDoctor.name,
            chief_complaints: chiefComplaints,
            medicines: validMedicines,
            notes: notes,
            visit_date: visitDate
          })
        });
      }
    } catch (error) {
      console.error("Failed to save visit to database:", error);
      // We'll still generate the PDF even if DB save fails
    }

    generatePrescriptionPDF(patientInfo, validMedicines, notes, prescribingDoctor, chiefComplaints, visitDate);
  };

  const filteredPatients = patients.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = p.name ? p.name.toLowerCase().includes(searchLower) : false;
    const idMatch = p.id ? p.id.toLowerCase().includes(searchLower) : false;
    const mobileMatch = p.mobile ? String(p.mobile).includes(searchTerm) : false;
    return nameMatch || idMatch || mobileMatch;
  });

  return (
    <div className="p-8 animate-fade-in transition-colors duration-300 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white transition-colors duration-300">E-Prescription</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors duration-300">Generate and print digital prescriptions for patients.</p>
        </div>
        
        {doctors && doctors.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-colors duration-300">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prescribing Doctor:</label>
            <select 
              className="input-field max-w-xs"
              value={prescribingDoctor?.id || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                const doctor = doctors.find(d => d.id.toString() === selectedId);
                if (doctor && doctor.id !== activeDoctor?.id) {
                  const key = window.prompt(`Enter Secret Key for ${doctor.name} to prescribe on their behalf:`);
                  if (key === doctor.secret_key) {
                    setPrescribingDoctor(doctor);
                  } else if (key !== null) {
                    alert('Incorrect Secret Key!');
                  }
                } else if (doctor && doctor.id === activeDoctor?.id) {
                  setPrescribingDoctor(doctor);
                }
              }}
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name} {d.id === activeDoctor?.id ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        
        {/* Patient Selection Block */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors duration-300">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">1. Patient Details</h3>
          
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search Existing Patient (Optional)</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name or mobile to auto-fill..." 
                value={searchTerm}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300 dark:text-white dark:placeholder-slate-500"
              />
            </div>
            
            {showDropdown && searchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handlePatientSelect(p)}
                      className="p-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.age} yrs | {p.mobile}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-slate-500 text-center">No patients found</div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Patient Name *</label>
              <input required type="text" className="input-field" value={patientInfo.name} onChange={e => setPatientInfo({...patientInfo, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Age</label>
              <input type="number" className="input-field" value={patientInfo.age} onChange={e => setPatientInfo({...patientInfo, age: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sex</label>
              <select className="input-field" value={patientInfo.sex} onChange={e => setPatientInfo({...patientInfo, sex: e.target.value})}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 dark:border-slate-700 pt-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Visit Date</label>
              <input type="date" className="input-field" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chief Complaints</label>
              <textarea 
                rows="2" 
                className="input-field" 
                placeholder="Symptoms, history..." 
                value={chiefComplaints} 
                onChange={e => setChiefComplaints(e.target.value)}
              ></textarea>
              {pastComplaints.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pastComplaints.map((comp, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      onClick={() => setChiefComplaints(prev => prev ? prev + '\n' + comp : comp)}
                      className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                      title="Click to add"
                    >
                      + {comp.length > 30 ? comp.substring(0, 30) + '...' : comp}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Medicines Block */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
              <Pill className="w-5 h-5 mr-2 text-emerald-500" />
              2. Prescribed Medicines
            </h3>
          </div>

          <div className="space-y-4">
            {medicines.map((med, index) => (
              <div key={index} className="flex gap-3 items-start relative group bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Medicine / Remedy *</label>
                      <input required type="text" placeholder="e.g. Nux Vomica" className="input-field py-1.5" value={med.medicineName} onChange={e => handleMedicineChange(index, 'medicineName', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Potency</label>
                      <input type="text" className="input-field py-1.5" placeholder="e.g., 200CH" value={med.potency} onChange={e => handleMedicineChange(index, 'potency', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Quantity</label>
                      <input type="text" className="input-field py-1.5" placeholder="e.g., 1 Dram" value={med.quantity} onChange={e => handleMedicineChange(index, 'quantity', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Instructions</label>
                    <input type="text" className="input-field py-1.5" placeholder="Instructions (e.g., 2 drops 3 times a day)" value={med.instructions} onChange={e => handleMedicineChange(index, 'instructions', e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={() => handleRemoveMedicine(index)} className="mt-6 p-2 bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          
          <button type="button" onClick={handleAddMedicine} className="mt-4 flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
            <Plus className="w-4 h-4 mr-1" /> Add Another Medicine
          </button>
        </div>

        {/* Advice Block */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors duration-300">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">3. General Advice & Notes</h3>
          <textarea rows="3" placeholder="Enter dietary advice, next follow-up date, or general notes..." className="input-field resize-none" value={notes} onChange={e => setNotes(e.target.value)}></textarea>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary py-3 px-8 text-lg flex items-center shadow-emerald-500/30">
            <FileText className="w-5 h-5 mr-2" />
            Generate PDF Prescription
          </button>
        </div>

      </form>
    </div>
  );
};

export default Prescriptions;
