"use client"

import { useId, useState } from "react"

type Variant = "danger" | "warning" | "primary"

const variantClasses: Record<Variant, { trigger: string; confirm: string }> = {
  danger: {
    trigger:
      "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
    confirm:
      "bg-rose-600 text-white shadow-md hover:brightness-110",
  },
  warning: {
    trigger:
      "border border-amber-300 bg-white text-amber-800 hover:bg-amber-50",
    confirm:
      "bg-amber-600 text-white shadow-md hover:brightness-110",
  },
  primary: {
    trigger:
      "border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50",
    confirm:
      "bg-emerald-700 text-white shadow-md hover:brightness-110",
  },
}

export type ConfirmActionProps = {
  // Server action passed straight to the inner form.
  action: (formData: FormData) => void | Promise<void>
  // Hidden fields appended to the form (e.g. {id: profileId}).
  fields?: Record<string, string>
  // Text on the button that opens the modal.
  triggerLabel: string
  // Title shown at the top of the modal.
  title: string
  // Body text. Plain string or pre-built JSX.
  description: React.ReactNode
  // Text on the destructive/confirm button inside the modal.
  confirmLabel: string
  // Visual tone.
  variant?: Variant
}

export function ConfirmAction({
  action,
  fields,
  triggerLabel,
  title,
  description,
  confirmLabel,
  variant = "danger",
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const classes = variantClasses[variant]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${classes.trigger}`}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(event) => {
            // Close when clicking the backdrop, but not when clicking inside.
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <h2
              id={titleId}
              className="text-lg font-extrabold text-brand-navy"
            >
              {title}
            </h2>
            <div className="mt-3 text-sm leading-relaxed text-slate-700">
              {description}
            </div>

            <form action={action} className="mt-6 flex flex-wrap justify-end gap-2">
              {fields &&
                Object.entries(fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${classes.confirm}`}
              >
                {confirmLabel}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
