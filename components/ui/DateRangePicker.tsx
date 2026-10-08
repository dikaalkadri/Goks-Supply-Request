import { useState, useEffect, useRef } from 'react';
import { CalendarRange, X, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

export default function DateRangePicker({
  dateFrom, dateTo,
  onChange,
}: {
  dateFrom: string; dateTo: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string>('');
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayLabel = () => {
    if (!dateFrom && !dateTo) return 'Pilih rentang tanggal';
    const fmt = (d: string) => {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    };
    if (dateFrom && dateTo) return `${fmt(dateFrom)} - ${fmt(dateTo)}`;
    if (dateFrom) return `${fmt(dateFrom)} - ...`;
    return '';
  };

  const buildDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const m = String(viewMonth + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      cells.push(`${viewYear}-${m}-${day}`);
    }
    return cells;
  };

  const handleDayClick = (date: string) => {
    if (!dateFrom || (dateFrom && dateTo)) {
      onChange(date, '');
    } else {
      if (date < dateFrom) {
        onChange(date, dateFrom);
      } else {
        onChange(dateFrom, date);
      }
      setOpen(false);
    }
  };

  const isInRange = (date: string) => {
    const from = dateFrom;
    const to = dateTo || hoverDate;
    if (!from || !to) return false;
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    return date > lo && date < hi;
  };

  const isStart = (date: string) => date === dateFrom;
  const isEnd = (date: string) => (!!dateTo && date === dateTo) || (!dateTo && date === hoverDate && !!dateFrom);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const days = buildDays();

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors bg-white w-full ${
          (dateFrom || dateTo) ? 'border-primary-400 text-primary-700 font-medium' : 'border-gray-200 text-gray-500'
        }`}
      >
        <CalendarRange className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{displayLabel()}</span>
        {(dateFrom || dateTo) && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange('', ''); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-72 select-none">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTHS_ID[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS_ID.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((date, i) =>
              date === null ? (
                <div key={`empty-${i}`} />
              ) : (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleDayClick(date)}
                  onMouseEnter={() => { if (dateFrom && !dateTo) setHoverDate(date); }}
                  onMouseLeave={() => setHoverDate('')}
                  className={`text-xs py-1.5 rounded-lg transition-colors font-medium ${
                    isStart(date) || isEnd(date)
                      ? 'bg-primary-600 text-white'
                      : isInRange(date)
                      ? 'bg-primary-100 text-primary-800'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {parseInt(date.split('-')[2])}
                </button>
              )
            )}
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-3">
            {!dateFrom ? 'Pilih tanggal mulai' : !dateTo ? 'Pilih tanggal akhir' : displayLabel()}
          </p>
        </div>
      )}
    </div>
  );
}
