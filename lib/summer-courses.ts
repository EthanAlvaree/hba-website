// lib/summer-courses.ts
//
// Summer 2026 course catalogue. Update this file each year; the page renders
// directly from it. All courses link to the same enrollment URL — HBA's
// enrollment flow is a single application regardless of course.

import { siteConfig } from "@/lib/site"

export const ENROLLMENT_URL = siteConfig.external.enrollment

export type SummerCourse = {
  name: string
  dates: string
  time: string
  price: string
  /** Notes that override the default "Enroll" CTA: "Call for Availability", "On Demand Class Available Only", etc. */
  status?: string
  /** Indicates a six-week course (asterisk in the old catalogue). */
  sixWeek?: boolean
}

export type SummerCategory = {
  id: string
  label: string
  description: string
  courses: SummerCourse[]
}

export const summerCategories: SummerCategory[] = [
  {
    id: "lab-science",
    label: "Lab science",
    description:
      "AP and college-prep science with hands-on lab work. AP Physics, Chemistry, and Biology students earn a guaranteed seat at HBA's College Board AP testing site.",
    courses: [
      {
        name: "Chemistry: In the Earth System",
        dates: "June 8 – July 24",
        time: "11:30am – 2:30pm",
        price: "$2,800",
        sixWeek: true,
      },
      {
        name: "Biology: The Living Earth",
        dates: "June 8 – July 24",
        time: "8:00 – 11:00am",
        price: "$2,800",
        sixWeek: true,
      },
      {
        name: "Honors Chemistry: In the Earth System",
        dates: "June 8 – July 24",
        time: "8:00 – 11:00am",
        price: "$3,000",
      },
      {
        name: "AP Physics 1",
        dates: "June 8 – July 24",
        time: "8:00 – 11:00am",
        price: "$3,000",
      },
      {
        name: "AP Physics 2",
        dates: "June 8 – July 24",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
      {
        name: "Physics of the Universe",
        dates: "June 8 – July 24",
        time: "TBD",
        price: "On-demand only",
        status: "On-demand only",
        sixWeek: true,
      },
      {
        name: "AP Computer Science Principles",
        dates: "June 8 – July 24",
        time: "TBD",
        price: "On-demand only",
        status: "On-demand only",
      },
    ],
  },
  {
    id: "mathematics",
    label: "Mathematics",
    description:
      "Pre-algebra through AP Calculus BC and AP Statistics. An unofficial transcript is required with the application; some students may take a placement test.",
    courses: [
      {
        name: "Integrated Math 1",
        dates: "Private or self-paced online only",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
      {
        name: "Honors Integrated Math 1",
        dates: "June 8 – July 24",
        time: "8:00 – 10:30am",
        price: "$2,900",
      },
      {
        name: "Integrated Math 2",
        dates: "Private or self-paced online only",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
      {
        name: "Honors Integrated Math 2",
        dates: "June 8 – July 24",
        time: "10:30am – 1:00pm",
        price: "$2,900",
      },
      {
        name: "Integrated Math 3",
        dates: "June 8 – July 24",
        time: "11:30am – 2:00pm",
        price: "$2,800",
        sixWeek: true,
      },
      {
        name: "Honors Integrated Math 3",
        dates: "June 8 – July 24",
        time: "8:00 – 10:30am",
        price: "$2,900",
      },
      {
        name: "Honors Precalculus",
        dates: "June 8 – July 24",
        time: "8:00 – 10:30am",
        price: "$2,900",
      },
      {
        name: "Intro to Calculus",
        dates: "June 8 – July 24",
        time: "8:00 – 10:30am",
        price: "$2,900",
      },
      {
        name: "AP Precalculus",
        dates: "June 8 – July 24",
        time: "8:00 – 10:30am",
        price: "$3,000",
      },
      {
        name: "AP Calculus AB",
        dates: "June 8 – July 24",
        time: "10:30am – 1:00pm",
        price: "$3,000",
      },
      {
        name: "AP Calculus BC",
        dates: "June 8 – July 24",
        time: "1:30 – 3:30pm",
        price: "$3,000",
      },
      {
        name: "AP Statistics",
        dates: "June 8 – July 31",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
    ],
  },
  {
    id: "humanities",
    label: "Humanities",
    description:
      "AP and college-prep English, history, government, and economics — including AP Capstone (Seminar / Research) and the popular four-week AP Government and AP Macroeconomics intensives.",
    courses: [
      {
        name: "AP United States History",
        dates: "June 8 – July 31",
        time: "8:00 – 10:00am",
        price: "$3,000",
      },
      {
        name: "AP World History: Modern",
        dates: "June 8 – July 31",
        time: "10:00am – 12:00pm",
        price: "$3,000",
      },
      {
        name: "AP Seminar (S1, S2 in spring)",
        dates: "TBD",
        time: "TBD",
        price: "$3,500",
      },
      {
        name: "AP United States Government and Politics",
        dates: "June 8 – July 3",
        time: "12:30 – 2:30pm",
        price: "$1,800",
      },
      {
        name: "AP Macroeconomics",
        dates: "July 6 – July 31",
        time: "12:30 – 2:30pm",
        price: "$1,800",
      },
      {
        name: "AP English Language and Composition",
        dates: "Private or self-paced online only",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
      {
        name: "AP English Literature and Composition",
        dates: "Private or self-paced online only",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
      {
        name: "English 9",
        dates: "Private or self-paced online only",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
      {
        name: "English 10",
        dates: "Private or self-paced online only",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
      {
        name: "English 11",
        dates: "Private or self-paced online only",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
      {
        name: "English 12",
        dates: "Private or self-paced online only",
        time: "TBD",
        price: "Call for availability",
        status: "Call for availability",
      },
    ],
  },
  {
    id: "foreign-language",
    label: "Foreign language",
    description:
      "Spanish 1–4 in small group classes. Foreign-language students get conversational practice with HBA teachers — not a recorded-only experience.",
    courses: [
      {
        name: "Spanish 1",
        dates: "June 8 – July 24",
        time: "TBD",
        price: "On-demand only",
        status: "On-demand only",
        sixWeek: true,
      },
      {
        name: "Spanish 2",
        dates: "June 8 – July 24",
        time: "12:30 – 2:30pm",
        price: "$2,800",
        sixWeek: true,
      },
      {
        name: "Spanish 3",
        dates: "June 8 – July 24",
        time: "8:00 – 10:00am",
        price: "$2,800",
        sixWeek: true,
      },
      {
        name: "Spanish 4",
        dates: "June 8 – July 24",
        time: "10:00am – 12:00pm",
        price: "$2,800",
        sixWeek: true,
      },
    ],
  },
]
