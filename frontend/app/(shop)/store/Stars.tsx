"use client";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={i <= full ? "currentColor" : "none"}
          stroke="currentColor"
          className={i <= full ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}
        >
          <path strokeWidth="1.5" d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 00.95.69h4.4c.96 0 1.36 1.23.58 1.8l-3.56 2.58a1 1 0 00-.36 1.12l1.36 4.18c.3.92-.75 1.69-1.54 1.12l-3.56-2.58a1 1 0 00-1.18 0l-3.56 2.58c-.78.57-1.83-.2-1.53-1.12l1.36-4.18a1 1 0 00-.36-1.12L1.4 9.6c-.78-.57-.38-1.8.58-1.8h4.4a1 1 0 00.95-.69L9.05 2.93z" />
        </svg>
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className="p-0.5" aria-label={`${i} star`}>
          <svg width={28} height={28} viewBox="0 0 20 20" fill={i <= value ? "currentColor" : "none"} stroke="currentColor" className={i <= value ? "text-amber-400" : "text-slate-300 dark:text-slate-600 hover:text-amber-300"}>
            <path strokeWidth="1.5" d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 00.95.69h4.4c.96 0 1.36 1.23.58 1.8l-3.56 2.58a1 1 0 00-.36 1.12l1.36 4.18c.3.92-.75 1.69-1.54 1.12l-3.56-2.58a1 1 0 00-1.18 0l-3.56 2.58c-.78.57-1.83-.2-1.53-1.12l1.36-4.18a1 1 0 00-.36-1.12L1.4 9.6c-.78-.57-.38-1.8.58-1.8h4.4a1 1 0 00.95-.69L9.05 2.93z" />
          </svg>
        </button>
      ))}
    </span>
  );
}
