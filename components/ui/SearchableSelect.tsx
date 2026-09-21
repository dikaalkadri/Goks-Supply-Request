'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Option {
  value: string;
  label: string;
  sub?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: Option[];
  value?: string;
  onChange: (value: string, option?: Option) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export default function SearchableSelect({
  label,
  placeholder = 'Pilih...',
  options,
  value,
  onChange,
  error,
  required,
  disabled,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.sub?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          id={inputId}
          type="button"
          disabled={disabled}
          onClick={() => { setOpen(!open); setSearch(''); }}
          className={cn(
            'w-full px-4 py-3 rounded-xl border text-sm text-left flex items-center justify-between transition-all duration-200 bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            error ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}
                className="p-0.5 hover:bg-gray-200 rounded cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </span>
            )}
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari..."
                  className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700"
                />
              </div>
            </div>
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 text-center">Tidak ditemukan</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => { onChange(opt.value, opt); setOpen(false); setSearch(''); }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors',
                        opt.value === value && 'bg-primary-50 text-primary-700 font-medium'
                      )}
                    >
                      <div>{opt.label}</div>
                      {opt.sub && <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
