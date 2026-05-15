// Simple page header for the students section. The cross-page navigation
// and sign-out moved to the shared admin shell in app/admin/layout.tsx;
// this component now just renders the title + intro copy.
export default function StudentsHeader() {
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-extrabold text-brand-navy">Students</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
        All HBA students, their family contacts, and their section enrollments.
        Demographics come from the original application; admin fields (status,
        grade, notes) are editable here.
      </p>
    </header>
  )
}
