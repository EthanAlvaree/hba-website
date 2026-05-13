// Shared gradebook setup UI (categories + assignments) used by both
// /admin/academics/sections/[id]/gradebook and /faculty-portal/sections/[id]/gradebook.
//
// The `surface` prop drives:
//   - the "← Back to section" href
//   - the "Grade this assignment →" href
//   - a hidden <input name="surface" /> that the server actions inspect to
//     decide which path tree to revalidate + redirect into.

import Link from "next/link"
import {
  totalCategoryWeight,
  type AssignmentCategoryRecord,
  type AssignmentWithCategory,
} from "@/lib/gradebook"
import type { CourseSectionRecord } from "@/lib/sis"
import { periodLabel } from "@/app/admin/academics/sections/SectionFormFields"
import {
  createAssignmentAction,
  createAssignmentCategoryAction,
  deleteAssignmentAction,
  deleteAssignmentCategoryAction,
  seedDefaultCategoriesAction,
  updateAssignmentAction,
  updateAssignmentCategoryAction,
} from "@/app/admin/academics/sections/[id]/gradebook/actions"

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function sectionHeadline(section: CourseSectionRecord): string {
  const base = `${section.course.name} — ${section.term.name}`
  return section.section_code ? `${base} (Section ${section.section_code})` : base
}

export type GradebookSurface = "admin" | "faculty"

type Props = {
  section: CourseSectionRecord
  categories: AssignmentCategoryRecord[]
  assignments: AssignmentWithCategory[]
  surface: GradebookSurface
}

function sectionBasePath(surface: GradebookSurface, sectionId: string): string {
  return surface === "faculty"
    ? `/faculty-portal/sections/${sectionId}`
    : `/admin/academics/sections/${sectionId}`
}

export function GradebookSetup({ section, categories, assignments, surface }: Props) {
  const totalWeight = totalCategoryWeight(categories)
  const weightOk = Math.abs(totalWeight - 100) < 0.01
  const basePath = sectionBasePath(surface, section.id)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={basePath}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to section
        </Link>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-2xl font-extrabold text-brand-navy">
          Gradebook setup
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {sectionHeadline(section)} &middot; {periodLabel(section.period)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Define how this section&rsquo;s grade is calculated: assignment
          categories with weights, then individual assignments.
        </p>
      </section>

      {/* Categories ----------------------------------------------------- */}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-brand-navy">Categories</h3>
            <p className="mt-1 text-sm text-slate-600">
              Buckets like Homework, Tests, Quizzes &mdash; each with a weight.
              Weights should sum to 100%.
            </p>
          </div>
          {categories.length > 0 && (
            <p
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                weightOk
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              Total weight: {totalWeight.toFixed(2)}%
              {weightOk ? " ✓" : " — should sum to 100%"}
            </p>
          )}
        </div>

        {categories.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
            <p>No categories yet.</p>
            <p className="mt-2">
              Start with the default grading scheme (Homework 20 / Quizzes 20 /
              Tests 40 / Projects 15 / Participation 5) and edit from there, or
              add categories manually below.
            </p>
            <form action={seedDefaultCategoriesAction} className="mt-4">
              <input type="hidden" name="section_id" value={section.id} />
              <input type="hidden" name="surface" value={surface} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Use default scheme
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                sectionId={section.id}
                surface={surface}
              />
            ))}
          </div>
        )}

        <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-brand-navy">
            + Add a category
          </summary>
          <form
            action={createAssignmentCategoryAction}
            className="space-y-3 border-t border-slate-200 px-5 py-4"
          >
            <input type="hidden" name="section_id" value={section.id} />
            <input type="hidden" name="surface" value={surface} />
            <CategoryFormFields />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Add category
            </button>
          </form>
        </details>
      </section>

      {/* Assignments ---------------------------------------------------- */}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-brand-navy">Assignments</h3>
            <p className="mt-1 text-sm text-slate-600">
              Drafts are visible to teachers and admins only; publish to make
              an assignment visible to students and parents.
            </p>
          </div>
          <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {assignments.length} on file &middot;{" "}
            {assignments.filter((a) => a.is_published).length} published
          </p>
        </div>

        {assignments.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">
            No assignments yet. Add one below.
          </p>
        ) : (
          <div className="mt-6 space-y-2">
            {assignments.map((assignment) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                sectionId={section.id}
                categories={categories}
                surface={surface}
              />
            ))}
          </div>
        )}

        {categories.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add at least one category above before creating assignments — the
            category controls how the assignment contributes to the final
            grade.
          </p>
        ) : (
          <details className="mt-6 rounded-2xl border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-brand-navy">
              + Add an assignment
            </summary>
            <form
              action={createAssignmentAction}
              className="space-y-3 border-t border-slate-200 px-5 py-4"
            >
              <input type="hidden" name="section_id" value={section.id} />
              <input type="hidden" name="surface" value={surface} />
              <AssignmentFormFields categories={categories} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Add assignment
              </button>
            </form>
          </details>
        )}
      </section>
    </div>
  )
}

// ============================================================================
// Category row
// ============================================================================

function CategoryRow({
  category,
  sectionId,
  surface,
}: {
  category: AssignmentCategoryRecord
  sectionId: string
  surface: GradebookSurface
}) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div>
            <p className="text-base font-semibold text-slate-900">{category.name}</p>
            <p className="text-xs text-slate-500">
              Sort order {category.sort_order}
              {category.drop_lowest_count
                ? ` · Drop lowest ${category.drop_lowest_count}`
                : ""}
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-700 sm:text-right">
            {Number(category.weight).toFixed(2)}%
          </p>
          <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Edit
          </span>
        </div>
      </summary>

      <div className="space-y-4 border-t border-slate-200 px-4 py-4">
        <form action={updateAssignmentCategoryAction} className="space-y-3">
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="surface" value={surface} />
          <CategoryFormFields defaults={category} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Save category
          </button>
        </form>

        <form action={deleteAssignmentCategoryAction}>
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="surface" value={surface} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Delete category
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Assignments under this category will keep their data but become
            uncategorized.
          </p>
        </form>
      </div>
    </details>
  )
}

function CategoryFormFields({
  defaults,
}: {
  defaults?: AssignmentCategoryRecord
} = {}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Name</span>
        <input
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="Homework"
          maxLength={80}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Weight (%)</span>
        <input
          name="weight"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={defaults?.weight ?? 0}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Drop lowest (optional)</span>
        <input
          name="drop_lowest_count"
          type="number"
          min="0"
          defaultValue={defaults?.drop_lowest_count ?? ""}
          placeholder="e.g. 1"
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Sort order</span>
        <input
          name="sort_order"
          type="number"
          min="0"
          defaultValue={defaults?.sort_order ?? 0}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>
    </div>
  )
}

// ============================================================================
// Assignment row
// ============================================================================

function AssignmentRow({
  assignment,
  sectionId,
  categories,
  surface,
}: {
  assignment: AssignmentWithCategory
  sectionId: string
  categories: AssignmentCategoryRecord[]
  surface: GradebookSurface
}) {
  const dueLine = assignment.due_date ? `Due ${formatDate(assignment.due_date)}` : "No due date"
  const categoryLabel = assignment.category?.name ?? "(uncategorized)"
  const base = sectionBasePath(surface, sectionId)

  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-900">{assignment.title}</p>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                {categoryLabel}
              </span>
              {assignment.is_published ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Published
                </span>
              ) : (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                  Draft
                </span>
              )}
              {assignment.is_extra_credit && (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                  Extra credit
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {dueLine} &middot; {Number(assignment.points_possible).toFixed(2)} pts
            </p>
          </div>
          <p className="text-sm text-slate-600">
            {assignment.assigned_date
              ? `Assigned ${formatDate(assignment.assigned_date)}`
              : "Not yet assigned"}
          </p>
          <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Edit
          </span>
        </div>
      </summary>

      <div className="space-y-4 border-t border-slate-200 px-4 py-4">
        <Link
          href={`${base}/gradebook/grade/${assignment.id}`}
          className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Grade this assignment →
        </Link>

        <form action={updateAssignmentAction} className="space-y-3">
          <input type="hidden" name="id" value={assignment.id} />
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="surface" value={surface} />
          <AssignmentFormFields categories={categories} defaults={assignment} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Save assignment
          </button>
        </form>

        <form action={deleteAssignmentAction}>
          <input type="hidden" name="id" value={assignment.id} />
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="surface" value={surface} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Delete assignment
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Deleting an assignment also removes every score recorded for it.
          </p>
        </form>
      </div>
    </details>
  )
}

function AssignmentFormFields({
  categories,
  defaults,
}: {
  categories: AssignmentCategoryRecord[]
  defaults?: AssignmentWithCategory
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-2">
        <span className="block">Title</span>
        <input
          name="title"
          required
          defaultValue={defaults?.title ?? ""}
          maxLength={200}
          placeholder="Chapter 4 reading response"
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Category</span>
        <select
          name="category_id"
          defaultValue={defaults?.category_id ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="">(uncategorized)</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({Number(category.weight).toFixed(0)}%)
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Assigned date</span>
        <input
          name="assigned_date"
          type="date"
          defaultValue={defaults?.assigned_date ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Due date</span>
        <input
          name="due_date"
          type="date"
          defaultValue={defaults?.due_date ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-1 text-sm font-medium text-slate-700">
        <span className="block">Points possible</span>
        <input
          name="points_possible"
          type="number"
          step="0.25"
          min="0"
          defaultValue={defaults?.points_possible ?? 0}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
        <span className="block">Description (optional)</span>
        <textarea
          name="description"
          rows={2}
          defaultValue={defaults?.description ?? ""}
          maxLength={4000}
          placeholder="Instructions or notes for the assignment."
          className="w-full rounded-3xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-6 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={defaults?.is_published ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Published (visible to students &amp; parents)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_extra_credit"
            defaultChecked={defaults?.is_extra_credit ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Extra credit</span>
        </label>
      </div>
    </div>
  )
}
