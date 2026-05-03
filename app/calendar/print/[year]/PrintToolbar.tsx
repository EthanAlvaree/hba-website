// app/calendar/print/[year]/PrintToolbar.tsx
"use client"

export default function PrintToolbar() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#f37021] text-white font-semibold text-xs uppercase tracking-widest shadow-lg hover:brightness-110 transition"
    >
      Print this calendar
    </button>
  )
}
