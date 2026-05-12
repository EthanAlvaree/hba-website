"use client"

export default function PrintButton({
  label = "Print / save as PDF",
}: {
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
    >
      {label}
    </button>
  )
}
