'use client';

import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

interface TopControlsProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterType: string;
  setFilterType: (val: string) => void;
  filterOptions: { label: string; value: string }[];
  sortOrder: string;
  setSortOrder: (val: string) => void;
  sortOptions: { label: string; value: string }[];
  searchPlaceholder?: string;
}

export function TopControls({
  searchTerm, setSearchTerm, filterType, setFilterType, filterOptions, sortOrder, setSortOrder, sortOptions, searchPlaceholder = "Search..."
}: TopControlsProps) {
  return (
    <div className="px-6 pt-6 space-y-3 z-10 relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input 
          type="text" 
          placeholder={searchPlaceholder} 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all" 
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 relative z-20">
          <CustomDropdown options={filterOptions} value={filterType} onChange={setFilterType} showSearch={false} />
        </div>
        <div className="flex-1 relative z-10">
          <CustomDropdown options={sortOptions} value={sortOrder} onChange={setSortOrder} showSearch={false} />
        </div>
      </div>
    </div>
  );
}

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  setCurrentPage: (val: number | ((prev: number) => number)) => void;
  totalItems: number;
}

export function PaginationControls({
  currentPage, totalPages, itemsPerPage, setItemsPerPage, setCurrentPage, totalItems
}: PaginationControlsProps) {
  // Only show pagination controls if total items are 20 or more
  if (totalItems < 20) return null;

  const perPageOptions = [
    { label: '20 per page', value: '20' },
    { label: '50 per page', value: '50' },
    { label: '100 per page', value: '100' },
  ];

  return (
    <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-200 mt-4 px-1">
      <div className="w-32 relative z-30">
        <div className="[&>button]:h-11 [&>button]:px-3.5 [&>button]:text-sm">
          <CustomDropdown 
            options={perPageOptions} 
            value={itemsPerPage.toString()} 
            onChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }} 
            showSearch={false} 
          />
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
          disabled={currentPage === 1} 
          className="h-11 w-11 flex items-center justify-center border border-slate-200 rounded-xl bg-white shadow-sm disabled:opacity-40 hover:bg-slate-50 transition-colors shrink-0"
        >
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </button>
        <span className="text-xs text-slate-700 font-bold whitespace-nowrap px-1">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
          disabled={currentPage === totalPages} 
          className="h-11 w-11 flex items-center justify-center border border-slate-200 rounded-xl bg-white shadow-sm disabled:opacity-40 hover:bg-slate-50 transition-colors shrink-0"
        >
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}