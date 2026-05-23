import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Stethoscope, Plus, FileText, Pill, Clock, Download, Loader2, Trash2 } from 'lucide-react';
import { generatePrescriptionPDF } from '../utils/prescriptionPdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const PatientHistory = ({ patient, onClose, activeDoctor, doctors }) => {
  const [visits, setVisits] = useState([]);
  const [testRecords, setTestRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visits'); // 'visits' or 'tests'
  const [showAddVisit, setShowAddVisit] = useState(false);
  
  // Add Visit Form State
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [medicines, setMedicines] = useState([{ medicineName: '', potency: '', quantity: '', instructions: '' }]);
  const [notes, setNotes] = useState('');
  const [prescribingDoctor, setPrescribingDoctor] = useState(activeDoctor);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchHistoryData();
  }, [patient.id]);

  useEffect(() => {
    if (activeDoctor) setPrescribingDoctor(activeDoctor);
  }, [activeDoctor]);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const [visitsRes, testsRes] = await Promise.all([
        fetch(`${API_URL}/patients/${patient.id}/visits`),
        fetch(`${API_URL}/test-records/patient/${patient.id}`)
      ]);
      
      if (visitsRes.ok) {
        setVisits(await visitsRes.json());
      }
      if (testsRes.ok) {
        setTestRecords(await testsRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMedicineChange = (index, field, value) => {
    const newMedicines = [...medicines];
    newMedicines[index][field] = value;
    setMedicines(newMedicines);
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

  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (!prescribingDoctor) {
      alert("Please select a prescribing doctor.");
      return;
    }

    const validMedicines = medicines.filter(m => m.medicineName.trim() !== '');

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.id,
          doctor_name: prescribingDoctor.name,
          chief_complaints: chiefComplaints,
          medicines: validMedicines,
          notes: notes
        })
      });

      if (response.ok) {
        if (validMedicines.length > 0) {
          generatePrescriptionPDF(patient, validMedicines, notes, prescribingDoctor);
        }
        setShowAddVisit(false);
        setChiefComplaints('');
        setMedicines([{ medicineName: '', potency: '', quantity: '', instructions: '' }]);
        setNotes('');
        fetchHistoryData();
      } else {
        alert('Failed to save visit');
      }
    } catch (err) {
      console.error('Save visit failed:', err);
      alert('An error occurred while saving the visit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadHistoricalPdf = (visit) => {
    let visitMedicines = [];
    try {
      if (typeof visit.medicines === 'string') {
        visitMedicines = JSON.parse(visit.medicines);
      } else {
        visitMedicines = visit.medicines;
      }
    } catch(e) {
      console.error("Could not parse medicines");
    }
    if (!visitMedicines || visitMedicines.length === 0) {
      alert("No medicines were prescribed during this visit.");
      return;
    }

    // Attempt to reconstruct the prescribing doctor object from the name
    let docObj = doctors?.find(d => d.name === visit.doctor_name);
    if (!docObj) {
      docObj = { name: visit.doctor_name, qualification: 'OP Doctor' };
    }

    generatePrescriptionPDF(patient, visitMedicines, visit.notes, docObj);
  };

  const handleDownloadTestPdf = (r) => {
    import('../utils/pdfExport').then(({ generatePDF }) => {
      const columns = ['Field', 'Details'];
      const data = [
        ['Date', new Date(r.test_date).toLocaleDateString()],
        ['Patient Name', `${patient.name} (${patient.id})`],
        ['Test Name', r.test_name],
        ['Test Type', r.test_type],
        ['Doctor', r.doctor_name],
        ['Result Summary', r.result || 'Pending...']
      ];
      generatePDF(`Test Record - ${patient.name}`, columns, data, `TestRecord_${r.id}`);
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in-overlay overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col my-auto border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 rounded-t-2xl transition-colors duration-300">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              {patient.name} - History
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-4">
              <span>ID: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{patient.id}</span></span>
              <span>Age/Sex: {patient.age} / {patient.sex}</span>
              <span>Mobile: {patient.mobile}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full max-h-[80vh]">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            {/* Tabs */}
            <div className="flex px-6 pt-4 border-b border-slate-200 dark:border-slate-700 gap-6">
              <button 
                onClick={() => setActiveTab('visits')}
                className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'visits' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Consultations & Prescriptions
              </button>
              <button 
                onClick={() => setActiveTab('tests')}
                className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'tests' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Lab Test Reports
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  {activeTab === 'visits' ? 'Visit Timeline' : 'Test Records'}
                </h4>
                {activeTab === 'visits' && !showAddVisit && (
                  <button onClick={() => setShowAddVisit(true)} className="btn-primary py-2 px-4 shadow-md shadow-emerald-500/20">
                    <Plus className="w-4 h-4 mr-1" /> New Visit
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center p-12 text-slate-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : activeTab === 'visits' ? (
                visits.length === 0 ? (
              <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No recorded visits for this patient.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {visits.map((visit, idx) => {
                  let meds = [];
                  try {
                    meds = typeof visit.medicines === 'string' ? JSON.parse(visit.medicines) : visit.medicines;
                  } catch(e){}

                  return (
                    <div key={visit.id} className="relative pl-8">
                      {/* Timeline Line & Dot */}
                      <div className="absolute left-0 top-2 bottom-[-24px] w-0.5 bg-emerald-200 dark:bg-emerald-900/50"></div>
                      <div className="absolute left-[-5px] top-2 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_0_4px_white] dark:shadow-[0_0_0_4px_#0f172a]"></div>
                      
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300 hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {new Date(visit.visit_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                              <Stethoscope className="w-3.5 h-3.5" /> {visit.doctor_name}
                            </span>
                          </div>
                          {meds && meds.length > 0 && (
                            <button onClick={() => handleDownloadHistoricalPdf(visit)} className="btn-secondary py-1.5 px-3 text-xs" title="Download E-Prescription">
                              <Download className="w-4 h-4 mr-1" /> PDF
                            </button>
                          )}
                        </div>

                        {visit.chief_complaints && (
                          <div className="mb-4 bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/20">
                            <span className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider mb-1 block">Chief Complaints</span>
                            <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{visit.chief_complaints}</p>
                          </div>
                        )}

                        {meds && meds.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2 block flex items-center gap-1">
                              <Pill className="w-3.5 h-3.5" /> Prescriptions
                            </span>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  <tr>
                                    <th className="p-2 font-medium">Medicine</th>
                                    <th className="p-2 font-medium">Potency</th>
                                    <th className="p-2 font-medium">Qty</th>
                                    <th className="p-2 font-medium">Instructions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                  {meds.map((m, i) => (
                                    <tr key={i}>
                                      <td className="p-2 text-slate-800 dark:text-slate-200">{m.medicineName}</td>
                                      <td className="p-2 text-slate-600 dark:text-slate-400">{m.potency || '-'}</td>
                                      <td className="p-2 text-slate-600 dark:text-slate-400">{m.quantity || '-'}</td>
                                      <td className="p-2 text-slate-600 dark:text-slate-400">{m.instructions || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {visit.notes && (
                          <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Notes:</span> {visit.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            testRecords.length === 0 ? (
                  <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No recorded lab tests for this patient.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testRecords.map(record => (
                      <div key={record.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h5 className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">{record.test_name}</h5>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{record.test_type}</span>
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-4">
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(record.test_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Stethoscope className="w-4 h-4" /> {record.doctor_name}</span>
                          </div>
                          {record.result && (
                            <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">Result: </span> {record.result}
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleDownloadTestPdf(record)} className="btn-secondary py-2 px-3">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Add Visit Panel */}
          {showAddVisit && (
            <div className="w-full md:w-5/12 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-500" />
                    Record New Visit
                  </h4>
                  <button onClick={() => setShowAddVisit(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveVisit} className="space-y-5">
                  {/* Doctor Override */}
                  {doctors && doctors.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Consulting Doctor</label>
                      <select 
                        className="input-field py-1.5 text-sm"
                        value={prescribingDoctor?.id || ''}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const doctor = doctors.find(d => d.id.toString() === selectedId);
                          if (doctor && doctor.id !== activeDoctor?.id) {
                            const key = window.prompt(`Enter Secret Key for ${doctor.name}:`);
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

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chief Complaints</label>
                    <textarea 
                      rows="3" 
                      className="input-field" 
                      placeholder="Symptoms, history, vitals..."
                      value={chiefComplaints}
                      onChange={(e) => setChiefComplaints(e.target.value)}
                    ></textarea>
                    {(() => {
                      const uniqueComplaints = [...new Set(visits.map(v => v.chief_complaints).filter(c => c && c.trim() !== ''))];
                      return uniqueComplaints.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {uniqueComplaints.map((comp, idx) => (
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
                      ) : null;
                    })()}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Prescriptions</label>
                    </div>
                    
                    <div className="space-y-3">
                      {medicines.map((med, index) => (
                        <div key={index} className="flex gap-2 items-start relative group">
                          <div className="flex-1 space-y-2">
                            <input 
                              type="text" 
                              placeholder="Medicine Name" 
                              className="input-field py-1.5 text-sm" 
                              value={med.medicineName} 
                              onChange={(e) => handleMedicineChange(index, 'medicineName', e.target.value)}
                            />
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="Potency" 
                                className="input-field py-1.5 text-sm w-1/2" 
                                value={med.potency} 
                                onChange={(e) => handleMedicineChange(index, 'potency', e.target.value)}
                              />
                              <input 
                                type="text" 
                                placeholder="Qty" 
                                className="input-field py-1.5 text-sm w-1/2" 
                                value={med.quantity} 
                                onChange={(e) => handleMedicineChange(index, 'quantity', e.target.value)}
                              />
                            </div>
                            <input 
                              type="text" 
                              placeholder="Instructions" 
                              className="input-field py-1.5 text-sm w-full" 
                              value={med.instructions} 
                              onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveMedicine(index)} 
                            className="mt-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={handleAddMedicine} className="text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:underline mt-2 flex items-center">
                      <Plus className="w-4 h-4 mr-0.5" /> Add Medicine
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes / Advice</label>
                    <textarea 
                      rows="2" 
                      className="input-field text-sm" 
                      placeholder="Diet restrictions, next visit date..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    <button type="button" onClick={() => setShowAddVisit(false)} className="btn-secondary flex-1">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 shadow-lg shadow-emerald-500/30">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Visit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PatientHistory;
