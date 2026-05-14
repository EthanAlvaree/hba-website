// lib/course-categories.ts
//
// Presentational metadata for the eight course-catalogue categories —
// the human label + marketing blurb shown on /programs/courses. The
// `id` matches the `department` column on the `courses` table, which is
// the single source of truth for the courses themselves.
//
// (This file is all that remains of the old lib/course-catalog.ts. The
// course list now lives in the DB and is queried via lib/sis listCourses.)

export type CourseCategoryId =
  | "math"
  | "science"
  | "computer-science"
  | "social-science"
  | "english"
  | "world-languages"
  | "electives"
  | "pe"

export type CourseCategory = {
  /** Matches courses.department in the DB. */
  id: CourseCategoryId
  label: string
  description: string
}

export const courseCategories: CourseCategory[] = [
  {
    id: "math",
    label: "Mathematics",
    description:
      "From Integrated Math 1 through Multivariable Calculus (H), with honors and AP tracks at every level.",
  },
  {
    id: "science",
    label: "Science",
    description: "NGSS-aligned lab science with honors and AP options.",
  },
  {
    id: "computer-science",
    label: "Computer Science",
    description:
      "From digital media and robotics to two AP computer science courses, including the rigorous Java-based AP CS A.",
  },
  {
    id: "social-science",
    label: "Social science",
    description:
      "World and U.S. history, government, economics, psychology, and the full slate of AP humanities.",
  },
  {
    id: "english",
    label: "English language arts",
    description:
      "Core English 9–12, AP literature and language, and AP Capstone Diploma program. AP Seminar and AP Research together earn the Capstone Diploma — a College Board credential not offered at most high schools.",
  },
  {
    id: "world-languages",
    label: "World languages",
    description:
      "Four years of Spanish, French, and Chinese with live conversational practice with HBA teachers — not a recorded-only experience.",
  },
  {
    id: "electives",
    label: "Electives",
    description:
      "Visual and performing arts, journalism and yearbook, philosophy, health, and student-life electives.",
  },
  {
    id: "pe",
    label: "Physical education",
    description: "Activity-based PE in small groups, plus our partner fitness program.",
  },
]
