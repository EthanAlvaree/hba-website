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
          { label: "Our Approach", href: "/about#approach" },
          { label: "Our Students", href: "/about#students" },
          { label: "Our Teachers", href: "/faculty" },
          { label: "Leadership", href: "/about/leadership" },
        ],
      },
      {
        heading: "Campus & History",
        links: [
          { label: "Campus", href: "/about#campus" },
          { label: "History", href: "/about#history" },
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
          { label: "How to Apply", href: "/admissions#apply" },
          { label: "Tuition & Aid", href: "/admissions#tuition" },
          { label: "Visit Campus", href: "/contact" },
        ],
      },
    ],
  },
  {
    title: "Programs",
    href: "/programs",
    columns: [
      {
        heading: "Academics",
        links: [
          { label: "Courses", href: "/programs#courses" },
          { label: "AP Courses", href: "/programs#ap" },
          { label: "Areas of Study", href: "/programs#areas" },
        ],
      },
      {
        heading: "Summer",
        links: [
          { label: "Summer 2026", href: "/summer-programs" },
          { label: "Online Classes", href: "/programs/online" },
        ],
      },
    ],
  },
  {
    title: "Student Life",
    href: "/student-life",
    columns: [
      {
        heading: "Experience",
        links: [
          { label: "Clubs & ASB", href: "/student-life#clubs" },
          { label: "Athletics", href: "/student-life#athletics" },
          { label: "Events", href: "/student-life#events" },
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
          { label: "Community Service", href: "/community/service" },
          { label: "Academic Support & Advisory", href: "/community/support" },
        ],
      },
      {
        heading: "Resources",
        links: [
          { label: "Parent/Guardian", href: "/community/parents" },
          { label: "Alumni", href: "/community/alumni" },
          { label: "School Store", href: "/community/store" },
        ],
      },
    ],
  },
]
