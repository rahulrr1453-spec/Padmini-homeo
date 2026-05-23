import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const PatientSelect = ({ patients, value, onChange, placeholder = "Search by name, ID, or mobile..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value) {
      const selectedPatient = patients.find(p => p.id === value);
      if (selectedPatient) {
        setSearchTerm(`${selectedPatient.name} (${selectedPatient.id})`);
      }
    } else {
      // Only clear if the dropdown is not open (i.e. parent form reset)
      if (!showDropdown) {
        setSearchTerm('');
      }
    }
  }, [value, patients, showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
        if (value) {
          const selectedPatient = patients.find(p => p.id === value);
          if (selectedPatient) {
            setSearchTerm(`${selectedPatient.name} (${selectedPatient.id})`);
          }
        } else {
          setSearchTerm('');
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, patients]);

  const filteredPatients = patients.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = p.name ? p.name.toLowerCase().includes(searchLower) : false;
    const idMatch = p.id ? p.id.toLowerCase().includes(searchLower) : false;
    const mobileMatch = p.mobile ? String(p.mobile).includes(searchTerm) : false;
    return nameMatch || idMatch || mobileMatch;
  });

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder={placeholder}
          value={searchTerm}
          onFocus={() => {
            setShowDropdown(true);
            if (value) setSearchTerm(''); 
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
            if (value) {
               onChange(''); 
            }
          }}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300 dark:text-white dark:placeholder-slate-500"
        />
      </div>
      
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filteredPatients.length > 0 ? (
            filteredPatients.map(p => (
              <div 
                key={p.id} 
                onClick={() => {
                  onChange(p.id);
                  setSearchTerm(`${p.name} (${p.id})`);
                  setShowDropdown(false);
                }}
                className="p-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <div className="font-medium text-slate-800 dark:text-slate-200">{p.name} <span className="text-emerald-600 dark:text-emerald-400 text-xs ml-1">({p.id})</span></div>
                <div className="text-xs text-slate-500">{p.age} yrs | {p.sex} | {p.mobile}</div>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-slate-500 text-center">No patients found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientSelect;
