import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { createClient } from "@supabase/supabase-js"
import {
  getProfileByEmail,
  listStudentsForParent,
} from "@/lib/sis"
import {
  listConferenceEvents,
  listSlotsForEvent,
  type ConferenceEvent,
  type ConferenceSlot,
} from "@/lib/conferences"
import {
  bookConferenceSlotAction,
  cancelConferenceSlotAction,
} from "./actions"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"
function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

type PageProps = {
  searchParams: Promise<{ saved?: string; cancelled?: string; error?: string }>
}

export default async function ParentConferencesPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")
  const isAdmin = session.isAdmin === true
  if (!isAdmin && !profile.roles.includes("parent")) redirect("/admin/sign-in")

  const raw = await searchParams
  const events = await listConferenceEvents({ activeOnly: true })

  const children = profile.roles.includes("parent")
    ? await listStudentsForParent(profile.id)
    : []

  // For each active event, load slots + filter to "teachers of my kids."
  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Build set of (teacherProfileId -> set of studentIds) for the parent.
  const teacherToStudents = new Map<string, Set<string>>()
  const teacherInfo = new Map<
    string,
    { display: string; courseNames: Set<string> }
  >()
  if (children.length > 0) {
    const studentIds = children.map((c) => c.student.id)
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select(
        `student_id, status,
         section:course_sections(
           teacher_profile_id,
           course:courses(name),
           teacher:profiles(first_name, last_name, display_name, email)
         )`
      )
      .in("student_id", studentIds)
      .in("status", ["enrolled", "audit"])
      .returns<
        Array<{
          student_id: string
          status: string
          section: {
            teacher_profile_id: string | null
            course: { name: string } | null
            teacher: {
              first_name: string | null
              last_name: string | null
              display_name: string | null
              email: string
            } | null
          } | null
        }>
      >()
    for (const e of enrolls ?? []) {
      const tid = e.section?.teacher_profile_id
      if (!tid) continue
      let set = teacherToStudents.get(tid)
      if (!set) {
        set = new Set()
        teacherToStudents.set(tid, set)
      }
      set.add(e.student_id)
      if (!teacherInfo.has(tid) && e.section?.teacher) {
        const t = e.section.teacher
        teacherInfo.set(tid, {
          display:
            `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() ||
            t.display_name ||
            t.email,
          courseNames: new Set([e.section.course?.name ?? ""]),
        })
      } else if (e.section?.course?.name) {
        teacherInfo.get(tid)!.courseNames.add(e.section.course.name)
      }
    }
  }

  // Slot data per event.
  const slotsByEvent = new Map<string, ConferenceSlot[]>()
  await Promise.all(
    events.map(async (ev) => {
      slotsByEvent.set(ev.id, await listSlotsForEvent(ev.id))
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/parent"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to family portal
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
          Parent-teacher conferences
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
          Book a time
        </h1>
        <p className="text-sm text-slate-600">
          Pick a slot with each of your kid&rsquo;s teachers. You can change or
          cancel before the event.
        </p>
      </header>

      {raw.saved === "1" && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
          Slot booked.
        </p>
      )}
      {raw.cancelled === "1" && (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
          Slot cancelled.
        </p>
      )}
      {raw.error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-900">
          {raw.error}
        </p>
      )}

      {events.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No conference events scheduled right now. We&rsquo;ll email you when
          the next one opens.
        </section>
      ) : (
        events.map((event) => (
          <EventSection
            key={event.id}
            event={event}
            slots={slotsByEvent.get(event.id) ?? []}
            children={children}
            teacherToStudents={teacherToStudents}
            teacherInfo={teacherInfo}
            parentEmail={session.user!.email!.toLowerCase()}
          />
        ))
      )}
    </div>
  )
}

function EventSection({
  event,
  slots,
  children,
  teacherToStudents,
  teacherInfo,
  parentEmail,
}: {
  event: ConferenceEvent
  slots: ConferenceSlot[]
  children: Awaited<ReturnType<typeof listStudentsForParent>>
  teacherToStudents: Map<string, Set<string>>
  teacherInfo: Map<string, { display: string; courseNames: Set<string> }>
  parentEmail: string
}) {
  const slotsByTeacher = new Map<string, ConferenceSlot[]>()
  for (const s of slots) {
    const list = slotsByTeacher.get(s.teacher_profile_id) ?? []
    list.push(s)
    slotsByTeacher.set(s.teacher_profile_id, list)
  }

  const myTeacherIds = [...teacherToStudents.keys()]

  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div>
        <h2 className="text-xl font-extrabold text-brand-navy">{event.name}</h2>
        <p className="text-sm text-slate-600">
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "long",
            timeZone: pacific,
          }).format(new Date(event.start_at))}
          {" — "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "long",
            timeZone: pacific,
          }).format(new Date(event.end_at))}{" "}
          · {event.slot_minutes} min per slot
        </p>
        {event.description && (
          <p className="mt-1 text-sm text-slate-700">{event.description}</p>
        )}
      </div>

      {myTeacherIds.length === 0 ? (
        <p className="text-sm text-slate-600">
          No active class enrollments — once your student is enrolled in a
          section, that teacher will appear here.
        </p>
      ) : (
        myTeacherIds.map((tid) => {
          const teacher = teacherInfo.get(tid)
          if (!teacher) return null
          const teacherSlots = slotsByTeacher.get(tid) ?? []
          const myBooking = teacherSlots.find(
            (s) => s.booked_by_parent_email === parentEmail && !s.cancelled_at
          )
          const openSlots = teacherSlots.filter(
            (s) => !s.booked_by_parent_email && !s.cancelled_at
          )
          const relevantStudents = children.filter((c) =>
            teacherToStudents.get(tid)?.has(c.student.id)
          )

          return (
            <div
              key={tid}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {teacher.display}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[...teacher.courseNames].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {myBooking && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Booked {formatTimestamp(myBooking.start_at)}
                  </span>
                )}
              </div>

              {myBooking ? (
                <form action={cancelConferenceSlotAction} className="mt-3">
                  <input type="hidden" name="slot_id" value={myBooking.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Cancel this booking
                  </button>
                </form>
              ) : openSlots.length === 0 ? (
                <p className="mt-2 text-xs text-slate-600">
                  All slots booked. Contact the teacher directly if you need
                  a time outside this window.
                </p>
              ) : (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-brand-navy">
                    Pick a slot ({openSlots.length} open)
                  </summary>
                  <form action={bookConferenceSlotAction} className="mt-2 space-y-2">
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      <span className="block">For which student?</span>
                      <select
                        name="student_id"
                        required
                        defaultValue={relevantStudents[0]?.student.id ?? ""}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        {relevantStudents.map(({ student }) => (
                          <option key={student.id} value={student.id}>
                            {student.preferred_name?.trim() || student.legal_first_name}{" "}
                            {student.legal_last_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      <span className="block">Slot</span>
                      <select
                        name="slot_id"
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        {openSlots.map((s) => (
                          <option key={s.id} value={s.id}>
                            {formatTimestamp(s.start_at)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      <span className="block">Topic / notes (optional)</span>
                      <input
                        name="parent_notes"
                        maxLength={2000}
                        placeholder="What you'd like to discuss"
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
                    >
                      Book slot
                    </button>
                  </form>
                </details>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}
