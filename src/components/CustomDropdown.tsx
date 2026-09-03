'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Plus, Check } from 'lucide-react';

export interface DropdownOption {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onAdd?: (newLabel: string) => void; 
  addLabel?: string; 
  showSearch?: boolean; // Controls whether the search bar is rendered
}

export default function CustomDropdown({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  onAdd,
  addLabel = 'Create new',
  showSearch = true,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropUp, setIsDropUp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchTerm) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, showSearch]);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || '';

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Used when search is active
  const handleAddWithSearch = () => {
    if (onAdd && searchTerm.trim()) {
      onAdd(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Used when search is hidden
  const handleAddWithPrompt = () => {
    if (onAdd) {
      const newVal = window.prompt(`Enter ${addLabel.toLowerCase()}:`);
      if (newVal && newVal.trim()) {
        onAdd(newVal.trim());
        setIsOpen(false);
      }
    }
  };

  const toggleDropdown = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedDropdownHeight = 240; 

      if (spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow) {
        setIsDropUp(true);
      } else {
        setIsDropUp(false);
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative w-full text-slate-900 font-sans" ref={dropdownRef}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}

      <button
        type="button"
        onClick={toggleDropdown}
        className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all active:bg-slate-50"
      >
        <span className={`text-sm truncate ${!selectedLabel ? 'text-slate-400' : 'text-slate-900 font-medium'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-slate-400 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <div
        className={`absolute z-[999] w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ease-in-out ${
          isDropUp ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
        } ${
          isOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-0 invisible pointer-events-none'
        }`}
      >
        {showSearch && (
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                className="w-full h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        <ul className="max-h-48 overflow-y-auto overscroll-contain py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <li
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3.5 h-10 flex items-center justify-between cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-xs ${
                  value === opt.value ? 'bg-blue-50/50 text-blue-700 font-semibold' : 'text-slate-700'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check className="h-3.5 w-3.5 text-blue-600" />}
              </li>
            ))
          ) : (
            <li className="px-3.5 py-2.5 text-xs text-slate-500 text-center">
              No results found
            </li>
          )}
        </ul>

        {onAdd && (
          <div className="p-1.5 border-t border-slate-100 bg-slate-50">
            {showSearch && searchTerm.trim() ? (
              <button
                type="button"
                onClick={handleAddWithSearch}
                className="w-full h-9 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {addLabel}: "{searchTerm}"
              </button>
            ) : !showSearch ? (
              <button
                type="button"
                onClick={handleAddWithPrompt}
                className="w-full h-9 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {addLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}