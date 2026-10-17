import { useState, useEffect, useRef } from 'react';
import { CalendarRange, X, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

const pad = (n: number) => String(n).padStart(2, '0');
/** First and last day (YYYY-MM-DD) of a month; month is 0-based. */
const monthBounds = (year: number, month: number): [string, string] => [
  `${year}-${pad(month + 1)}-01`,
  `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`,
];
/** The month covered by the range when it is exactly one whole month, else null. */
const wholeMonthOf = (from: string, to: string): { year: number; month: number } | null => {
  if (!from || !to) return null;
  const [y, m] = from.split('-').map(Number);
  const [first, last] = monthBounds(y, m - 1);
  return from === first && to === last ? { year: y, month: m - 1 } : null;
};

/** Human label for a range: "Oktober 2026" for a whole month, else DD/MM/YYYY – DD/MM/YYYY. */
export function formatDateRange(dateFrom: string, dateTo: string): string {
  const whole = wholeMonthOf(dateFrom, dateTo);
  if (whole) return `${MONTHS_ID[whole.month]} ${whole.year}`;
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };
  if (dateFrom && dateTo && dateFrom === dateTo) return fmt(dateFrom);
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `${fmt(dateFrom)} – ...`;
  if (dateTo) return `– ${fmt(dateTo)}`;
  return '';
}

export default function DateRangePicker({
  dateFrom, dateTo,
  onChange,
  isDefault = false,
  defaultLabel = 'Hari Ini',
}: {
  dateFrom: string; dateTo: string;
  onChange: (from: string, to: string) => void;
  isDefault?: boolean;
  /** Label shown while the page's default range is selected */
  defaultLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string>('');
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [mode, setMode] = useState<'day' | 'month'>('day');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayLabel = () => {
    if (isDefault) return defaultLabel;
    if (!dateFrom && !dateTo) return 'Pilih rentang tanggal';
    return formatDateRange(dateFrom, dateTo);
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
  const selectedMonth = wholeMonthOf(dateFrom, dateTo);

  const pickMonth = (month: number) => {
    const [from, to] = monthBounds(viewYear, month);
    onChange(from, to);
    setViewMonth(month);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors bg-white w-full ${
          isDefault
            ? 'border-gray-200 text-gray-600'
            : (dateFrom || dateTo)
            ? 'border-primary-400 text-primary-700 font-medium'
            : 'border-gray-200 text-gray-500'
        }`}
      >
        <CalendarRange className={`h-4 w-4 flex-shrink-0 ${isDefault ? 'text-gray-400' : (dateFrom || dateTo) ? 'text-primary-500' : 'text-gray-400'}`} />
        <span className="flex-1 text-left truncate">{displayLabel()}</span>
        {!isDefault && (dateFrom || dateTo) && (
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
          {/* Mode: pick a date range, or a whole month in one tap */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-3">
            {([['day', 'Tanggal'], ['month', 'Bulan']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                  mode === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'month' ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setViewYear(y => y - 1)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Tahun sebelumnya">
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-sm font-semibold text-gray-800">{viewYear}</span>
                <button type="button" onClick={() => setViewYear(y => y + 1)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Tahun berikutnya">
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS_ID.map((name, m) => {
                  const selected = selectedMonth?.year === viewYear && selectedMonth.month === m;
                  const current = today.getFullYear() === viewYear && today.getMonth() === m;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => pickMonth(m)}
                      className={`text-xs py-2.5 rounded-lg font-medium transition-colors ${
                        selected
                          ? 'bg-primary-600 text-white'
                          : current
                          ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-3">Pilih bulan untuk menampilkan 1 bulan penuh</p>
            </>
          ) : (
          <>
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => setMode('month')}
              className="text-sm font-semibold text-gray-800 px-2 py-0.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Pilih bulan"
            >
              {MONTHS_ID[viewMonth]} {viewYear}
            </button>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
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
          </>
          )}
        </div>
      )}
    </div>
  );
}
