// lib/course-catalog.ts
//
// Single source of truth for HBA's canonical course catalog.
//
// Used by:
//   - /programs/courses (the public catalogue page renders categories from here)
//   - /programs (AP grid + pathways reference canonical names from here)
//   - lib/faculty.ts (every bio's coursesTaught list must use these exact names)
//   - lib/summer-courses.ts (summer offerings reference these names)
//   - db/migrations/0011-seed-courses.sql (mirrors this list as the initial
//     courses-table seed; after that, admins manage courses via
//     /admin/academics/courses)
//
// When updating: keep names in sync with the seed migration AND with what
// bios + marketing actually display. The "Seed teacher qualifications from
// bios" admin button matches by exact lowercased course name, so any drift
// breaks that flow silently.

export type CourseCategoryId =
  | "math"
  | "science"
  | "computer-science"
  | "social-science"
  | "english"
  | "world-languages"
  | "electives"
  | "pe"

export type CanonicalCourse = {
  /** Stable DB code. Uppercase letters / digits / hyphens only. */
  code: string
  name: string
  category: CourseCategoryId
  is_ap: boolean
  is_honors: boolean
  is_elective: boolean
  /** Carnegie credit. Year-long high-school course = 1.0. */
  credit_hours: number
  /** A–G letter or subject code, used for UC reporting. Optional. */
  ucCategory?: "A" | "B" | "C" | "D" | "E" | "F" | "G"
  grade_levels: string[]
  /** Short blurb shown nowhere yet — reserved for future per-course pages. */
  description?: string
  /** Retired from the active catalogue. Kept in this list so historical
   *  references (faculty bios, transcripts) still resolve by name, but
   *  hidden from the public catalogue page. Mirrors `active = false` on
   *  the SIS courses row. */
  retired?: boolean
}

export type CourseCategory = {
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

// ============================================================================
// Mathematics
// ============================================================================
const math: CanonicalCourse[] = [
  {
    code: "MATH-ALG1",
    name: "Algebra 1",
    category: "math",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["9", "10"],
    retired: true,
  },
  {
    code: "MATH-GEO",
    name: "Geometry",
    category: "math",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["9", "10", "11"],
    retired: true,
  },
  {
    code: "MATH-ALG2",
    name: "Algebra 2",
    category: "math",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["10", "11", "12"],
    retired: true,
  },
  {
    code: "MATH-IM1",
    name: "Integrated Math 1",
    category: "math",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["9"],
  },
  {
    code: "MATH-IM2",
    name: "Integrated Math 2",
    category: "math",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["10"],
  },
  {
    code: "MATH-IM3",
    name: "Integrated Math 3",
    category: "math",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11"],
  },
  {
    code: "MATH-HIM1",
    name: "Integrated Math 1 (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["9"],
  },
  {
    code: "MATH-HIM2",
    name: "Integrated Math 2 (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["10"],
  },
  {
    code: "MATH-HIM3",
    name: "Integrated Math 3 (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11"],
  },
  {
    code: "MATH-PRECALC",
    name: "Intro to Calculus",
    category: "math",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
  {
    code: "MATH-HPRECALC",
    name: "Precalculus (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["10", "11", "12"],
    retired: true,
  },
  {
    code: "MATH-APPRECALC",
    name: "AP Precalculus",
    category: "math",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "MATH-APSTATS",
    name: "AP Statistics",
    category: "math",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
  {
    code: "MATH-APCALCAB",
    name: "AP Calculus AB",
    category: "math",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
  {
    code: "MATH-APCALCBC",
    name: "AP Calculus BC",
    category: "math",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
  {
    code: "MATH-HLINALG",
    name: "Linear Algebra (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
  {
    code: "MATH-HMULTIVAR",
    name: "Multivariable Calculus (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
  {
    code: "MATH-HGROUP",
    name: "Group Theory and Abstract Algebra (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
  {
    code: "MATH-HSET",
    name: "Set Theory and Real Analysis (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
  {
    code: "MATH-HMLMATH",
    name: "Mathematics of Machine Learning (H)",
    category: "math",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
]

// ============================================================================
// Science
// ============================================================================
const science: CanonicalCourse[] = [
  {
    code: "SCI-BIO",
    name: "Biology: The Living Earth",
    category: "science",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["9", "10"],
  },
  {
    code: "SCI-HBIO",
    name: "Biology (H)",
    category: "science",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["9", "10"],
  },
  {
    code: "SCI-CHEM",
    name: "Chemistry: In the Earth System",
    category: "science",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["10", "11"],
  },
  {
    code: "SCI-HCHEM",
    name: "Chemistry: In the Earth System (H)",
    category: "science",
    is_ap: false,
    is_honors: true,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["10", "11"],
  },
  {
    code: "SCI-PHYS",
    name: "Physics of the Universe",
    category: "science",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SCI-ENVI",
    name: "Environmental Science",
    category: "science",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SCI-APBIO",
    name: "AP Biology",
    category: "science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["11", "12"],
  },
  {
    code: "SCI-APCHEM",
    name: "AP Chemistry",
    category: "science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["11", "12"],
  },
  {
    code: "SCI-APENVI",
    name: "AP Environmental Science",
    category: "science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SCI-APPHYS1",
    name: "AP Physics 1",
    category: "science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SCI-APPHYS2",
    name: "AP Physics 2",
    category: "science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["11", "12"],
  },
  {
    code: "SCI-APPHYSC-MECH",
    name: "AP Physics C: Mechanics",
    category: "science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["11", "12"],
  },
  {
    code: "SCI-APPHYSC-EM",
    name: "AP Physics C: Electricity and Magnetism",
    category: "science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "D",
    grade_levels: ["11", "12"],
  },
]

// ============================================================================
// Computer Science
// ============================================================================
const computerScience: CanonicalCourse[] = [
  {
    code: "CS-INTROPROG",
    name: "Intro to Programming",
    category: "computer-science",
    is_ap: false,
    is_honors: false,
    is_elective: true,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["9", "10", "11", "12"],
  },
  {
    code: "CS-INTROROBOT",
    name: "Intro to Robotic Engineering",
    category: "computer-science",
    is_ap: false,
    is_honors: false,
    is_elective: true,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["9", "10", "11", "12"],
  },
  {
    code: "CS-DIGITALART",
    name: "Digital Art",
    category: "computer-science",
    is_ap: false,
    is_honors: false,
    is_elective: true,
    credit_hours: 1,
    ucCategory: "F",
    grade_levels: ["9", "10", "11", "12"],
  },
  {
    code: "CS-APCSP",
    name: "AP Computer Science Principles",
    category: "computer-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "CS-APCSA",
    name: "AP Computer Science A",
    category: "computer-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "C",
    grade_levels: ["11", "12"],
  },
]

// ============================================================================
// Social science
// ============================================================================
const socialScience: CanonicalCourse[] = [
  {
    code: "SS-WORLD",
    name: "World History",
    category: "social-science",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "A",
    grade_levels: ["10"],
  },
  {
    // CA AB 101 one-semester ethnic studies graduation requirement.
    // ucCategory omitted — pending UC A-G approval.
    code: "SS-ETHNIC",
    name: "Ethnic Studies",
    category: "social-science",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 0.5,
    grade_levels: ["9", "10", "11", "12"],
  },
  {
    code: "SS-USHIST",
    name: "United States History",
    category: "social-science",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "A",
    grade_levels: ["11"],
  },
  {
    code: "SS-ECON",
    name: "Economics",
    category: "social-science",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 0.5,
    ucCategory: "G",
    grade_levels: ["12"],
  },
  {
    code: "SS-PERSFIN",
    name: "Personal Finance",
    category: "social-science",
    is_ap: false,
    is_honors: false,
    is_elective: true,
    credit_hours: 0.5,
    ucCategory: "G",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SS-PSYCH",
    name: "Psychology",
    category: "social-science",
    is_ap: false,
    is_honors: false,
    is_elective: true,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SS-APUSG",
    name: "AP United States Government and Politics",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "A",
    grade_levels: ["11", "12"],
  },
  {
    code: "SS-APCOMPG",
    name: "AP Comparative Government and Politics",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "A",
    grade_levels: ["11", "12"],
  },
  {
    code: "SS-APWORLD",
    name: "AP World History: Modern",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "A",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SS-APUSHIST",
    name: "AP United States History",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "A",
    grade_levels: ["11", "12"],
  },
  {
    code: "SS-APEUROHIST",
    name: "AP European History",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "A",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SS-APAAS",
    name: "AP African American Studies",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "A",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SS-APPSYCH",
    name: "AP Psychology",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["10", "11", "12"],
  },
  {
    code: "SS-APHUMGEO",
    name: "AP Human Geography",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["9", "10", "11", "12"],
  },
  {
    code: "SS-APMACRO",
    name: "AP Macroeconomics",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 0.5,
    ucCategory: "G",
    grade_levels: ["11", "12"],
  },
  {
    code: "SS-APMICRO",
    name: "AP Microeconomics",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 0.5,
    ucCategory: "G",
    grade_levels: ["11", "12"],
  },
  {
    code: "SS-APBUSFIN",
    name: "AP Business with Personal Finance",
    category: "social-science",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["10", "11", "12"],
  },
]

// ============================================================================
// English language arts
// ============================================================================
const english: CanonicalCourse[] = [
  {
    code: "ENG-SUPPORT",
    name: "English Support",
    category: "english",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    grade_levels: ["9", "10", "11", "12"],
    description: "ELD / ESL pull-out support for English-language learners.",
  },
  {
    code: "ENG-9",
    name: "English 9",
    category: "english",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "B",
    grade_levels: ["9"],
  },
  {
    code: "ENG-10",
    name: "English 10",
    category: "english",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "B",
    grade_levels: ["10"],
  },
  {
    code: "ENG-11",
    name: "English 11",
    category: "english",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "B",
    grade_levels: ["11"],
  },
  {
    code: "ENG-12",
    name: "English 12",
    category: "english",
    is_ap: false,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "B",
    grade_levels: ["12"],
  },
  {
    code: "ENG-APLANG",
    name: "AP English Language and Composition",
    category: "english",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "B",
    grade_levels: ["11", "12"],
  },
  {
    code: "ENG-APLIT",
    name: "AP English Literature and Composition",
    category: "english",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "B",
    grade_levels: ["12"],
  },
  {
    code: "ENG-APSEM",
    name: "AP Seminar",
    category: "english",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["10", "11"],
    description:
      "AP Capstone Diploma program. Live instructor only. Pairs with AP Research.",
  },
  {
    code: "ENG-APRES",
    name: "AP Research",
    category: "english",
    is_ap: true,
    is_honors: false,
    is_elective: false,
    credit_hours: 1,
    ucCategory: "G",
    grade_levels: ["11", "12"],
    description:
      "AP Capstone Diploma program. Live instructor only. Requires AP Seminar prerequisite.",
  },
]

// ============================================================================
// World languages
// ============================================================================
const worldLanguages: CanonicalCourse[] = [
  { code: "LANG-SPAN1", name: "Spanish 1", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["9", "10", "11", "12"] },
  { code: "LANG-SPAN2", name: "Spanish 2", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["9", "10", "11", "12"] },
  { code: "LANG-SPAN3", name: "Spanish 3", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["10", "11", "12"] },
  { code: "LANG-SPAN4", name: "Spanish 4", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["11", "12"] },
  { code: "LANG-APSPAN", name: "AP Spanish Language and Culture", category: "world-languages", is_ap: true, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["11", "12"] },
  { code: "LANG-FREN1", name: "French 1", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["9", "10", "11", "12"] },
  { code: "LANG-FREN2", name: "French 2", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["9", "10", "11", "12"] },
  { code: "LANG-FREN3", name: "French 3", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["10", "11", "12"] },
  { code: "LANG-FREN4", name: "French 4", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["11", "12"] },
  { code: "LANG-APFREN", name: "AP French Language and Culture", category: "world-languages", is_ap: true, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["11", "12"] },
  { code: "LANG-CHIN1", name: "Chinese 1", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["9", "10", "11", "12"] },
  { code: "LANG-CHIN2", name: "Chinese 2", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["9", "10", "11", "12"] },
  { code: "LANG-CHIN3", name: "Chinese 3", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["10", "11", "12"] },
  { code: "LANG-CHIN4", name: "Chinese 4", category: "world-languages", is_ap: false, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["11", "12"] },
  { code: "LANG-APCHIN", name: "AP Chinese Language and Culture", category: "world-languages", is_ap: true, is_honors: false, is_elective: false, credit_hours: 1, ucCategory: "E", grade_levels: ["11", "12"] },
]

// ============================================================================
// Electives (visual / performing arts, philosophy, journalism, health, etc.)
// ============================================================================
const electives: CanonicalCourse[] = [
  { code: "ELEC-STUDIOART", name: "Studio Art", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 1, ucCategory: "F", grade_levels: ["9", "10", "11", "12"] },
  { code: "ELEC-APARTHIST", name: "AP Art History", category: "electives", is_ap: true, is_honors: false, is_elective: true, credit_hours: 1, ucCategory: "F", grade_levels: ["10", "11", "12"] },
  { code: "ELEC-APMUSIC", name: "AP Music Theory", category: "electives", is_ap: true, is_honors: false, is_elective: true, credit_hours: 1, ucCategory: "F", grade_levels: ["10", "11", "12"] },
  { code: "ELEC-AP3DART", name: "AP 3D Art and Design", category: "electives", is_ap: true, is_honors: false, is_elective: true, credit_hours: 1, ucCategory: "F", grade_levels: ["10", "11", "12"] },
  { code: "ELEC-LOGIC", name: "Logic and Philosophy", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 1, ucCategory: "G", grade_levels: ["10", "11", "12"] },
  { code: "ELEC-CREATWRIT", name: "Creative Writing", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 1, ucCategory: "G", grade_levels: ["9", "10", "11", "12"] },
  { code: "ELEC-PUBSPEAK", name: "Public Speaking", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 0.5, ucCategory: "G", grade_levels: ["9", "10", "11", "12"] },
  { code: "ELEC-JOURNAL", name: "Journalism", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 1, ucCategory: "G", grade_levels: ["9", "10", "11", "12"] },
  { code: "ELEC-YEARBOOK", name: "Yearbook", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 1, grade_levels: ["9", "10", "11", "12"] },
  {
    code: "ELEC-APPMAG",
    name: "Art | Poetry | Prose Magazine",
    category: "electives",
    is_ap: false,
    is_honors: false,
    is_elective: true,
    credit_hours: 0.5,
    grade_levels: ["9", "10", "11", "12"],
    description: "HBA's student-run literary and arts magazine.",
  },
  { code: "ELEC-COMMSERV", name: "Community Service", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 0.5, grade_levels: ["9", "10", "11", "12"] },
  { code: "ELEC-MODELUN", name: "Model UN", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 0.5, grade_levels: ["9", "10", "11", "12"] },
  { code: "ELEC-COOKING", name: "Cooking", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 0.5, grade_levels: ["9", "10", "11", "12"] },
  { code: "ELEC-HEALTH", name: "Health", category: "electives", is_ap: false, is_honors: false, is_elective: true, credit_hours: 0.5, grade_levels: ["9", "10", "11", "12"] },
]

// ============================================================================
// Physical education
// ============================================================================
const pe: CanonicalCourse[] = [
  { code: "PE-FITNESS", name: "PE Fitness", category: "pe", is_ap: false, is_honors: false, is_elective: true, credit_hours: 0.5, grade_levels: ["9", "10", "11", "12"] },
  { code: "PE-GOLF", name: "PE Golf", category: "pe", is_ap: false, is_honors: false, is_elective: true, credit_hours: 0.5, grade_levels: ["9", "10", "11", "12"] },
  { code: "PE-HIKING", name: "PE Hiking", category: "pe", is_ap: false, is_honors: false, is_elective: true, credit_hours: 0.5, grade_levels: ["9", "10", "11", "12"] },
]

export const canonicalCourses: CanonicalCourse[] = [
  ...math,
  ...science,
  ...computerScience,
  ...socialScience,
  ...english,
  ...worldLanguages,
  ...electives,
  ...pe,
]

// ============================================================================
// Helpers
// ============================================================================

export function coursesByCategory(): Record<CourseCategoryId, CanonicalCourse[]> {
  const out = {
    math: [] as CanonicalCourse[],
    science: [] as CanonicalCourse[],
    "computer-science": [] as CanonicalCourse[],
    "social-science": [] as CanonicalCourse[],
    english: [] as CanonicalCourse[],
    "world-languages": [] as CanonicalCourse[],
    electives: [] as CanonicalCourse[],
    pe: [] as CanonicalCourse[],
  } satisfies Record<CourseCategoryId, CanonicalCourse[]>

  // Retired courses stay in `canonicalCourses` for name resolution but
  // are hidden from the public catalogue page.
  for (const course of canonicalCourses) {
    if (course.retired) continue
    out[course.category].push(course)
  }
  return out
}

const byName = new Map<string, CanonicalCourse>(
  canonicalCourses.map((c) => [c.name.toLowerCase().trim(), c])
)

/** Validates that every name in `names` matches a canonical course. Returns
 *  the misses. Useful for dev-time assertions or migration sanity checks. */
export function findMissingCourses(names: string[]): string[] {
  return names.filter((n) => !byName.has(n.toLowerCase().trim()))
}
