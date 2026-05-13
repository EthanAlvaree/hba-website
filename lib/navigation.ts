// lib/navigation.ts

export type NavAudience = "all" | "students" | "parents" | "alumni"

export interface NavLink {
  label: string
  href: string
  description?: string
  external?: boolean
  audience?: NavAudience[]
}

export interface NavColumn {
  heading: string
  links: NavLink[]
}

export interface NavItem {
  title: string
  href?: string
  columns?: NavColumn[]
  align?: "left" | "center" | "right"
  audience?: NavAudience[]
}

export const navigation: NavItem[] = [
  {
    title: "About",
    href: "/about",
    columns: [
      {
        heading: "Overview",
        links: [
          { label: "Our approach", href: "/about#approach" },
          { label: "Our students", href: "/about#students" },
          { label: "Faculty and staff", href: "/faculty" },
          { label: "Leadership", href: "/about/leadership" },
        ],
      },
      {
        heading: "Campus & history",
        links: [
          { label: "Campus", href: "/about#campus" },
          { label: "History", href: "/about#history" },
          { label: "College acceptances", href: "/about/college-acceptances" },
        ],
      },
    ],
  },
  {
    title: "Admissions",
    href: "/admissions",
    columns: [
      {
        heading: "Enrollment",
        links: [
          { label: "How to apply", href: "/admissions#apply" },
          { label: "Tuition & aid", href: "/admissions#tuition" },
          { label: "Visit campus", href: "/contact" },
        ],
      },
      {
        heading: "Pathways",
        links: [
          { label: "International (F-1 visa)", href: "/admissions/international" },
          { label: "Online high school", href: "/programs/online" },
          { label: "Order a transcript", href: "/transcripts" },
        ],
      },
    ],
  },
  {
    title: "Programs",
    href: "/programs",
    align: "center",
    columns: [
      {
        heading: "Academics",
        links: [
          { label: "Courses", href: "/programs#courses" },
          { label: "AP courses", href: "/programs#ap" },
          { label: "Areas of study", href: "/programs#areas" },
          { label: "Course catalogue", href: "/programs/courses" },
          { label: "Graduation requirements", href: "/programs/graduation-requirements" },
        ],
      },
      {
        heading: "Pathways",
        links: [
          { label: "Summer 2026", href: "/summer-programs" },
          { label: "Online high school", href: "/programs/online" },
          { label: "Online pricing", href: "/programs/online#pricing" },
        ],
      },
    ],
  },
  {
    title: "Student life",
    href: "/student-life",
    columns: [
      {
        heading: "Experience",
        links: [
          { label: "Clubs & activities", href: "/student-life#clubs" },
          { label: "Athletics", href: "/student-life/athletics" },
          { label: "Events & field trips", href: "/student-life#events" },
        ],
      },
    ],
  },
  {
    title: "Community",
    href: "/community",
    align: "right",
    columns: [
      {
        heading: "Community",
        links: [
          { label: "Community service", href: "/community#service" },
          { label: "Academic support & advisory", href: "/community#advisory" },
          { label: "Partnerships", href: "/community/partnerships" },
          { label: "Reviews", href: "/reviews" },
        ],
      },
      {
        heading: "Resources",
        links: [
          { label: "Parent/Guardian", href: "/community/parents" },
          { label: "Alumni", href: "/community/alumni" },
          { label: "Order a transcript", href: "/transcripts" },
          { label: "School store", href: "/community/store" },
        ],
      },
    ],
  },
]
