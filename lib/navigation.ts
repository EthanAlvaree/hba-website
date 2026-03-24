// lib/navigation.ts

export interface NavColumn {
  heading: string
  links: string[]
}

export interface NavItem {
  title: string
  align: "left" | "center" | "right"
  columns?: NavColumn[]
}

export const navigation: NavItem[] = [
  {
    title: "About",
    align: "left",
    columns: [
      {
        heading: "Overview",
        links: ["Mission and Approach", "Our Students", "Our Teachers", "School Leadership"],
      },
      {
        heading: "More",
        links: ["Campus", "History", "Employment"],
      },
    ],
  },
  {
    title: "Admissions",
    align: "left",
    columns: [
      {
        heading: "Get Started",
        links: ["Apply", "Tuition & Aid", "Visit Campus"],
      },
      {
        heading: "Learn More",
        links: ["Admissions Process", "FAQ"],
      },
    ],
  },
  {
    title: "Programs",
    align: "center",
    columns: [
      {
        heading: "Academics",
        links: ["Courses", "Departments", "Faculty"],
      },
      {
        heading: "Areas of Study",
        links: ["STEM", "Arts", "College Prep"],
      },
    ],
  },
  {
    title: "Student Life",
    align: "right",
    columns: [
      {
        heading: "Experience",
        links: ["Clubs", "Student Government (ASB)", "Model UN","Athletics", "Events"],
      },
      {
        heading: "Community",
        links: ["Community Service", "Academic Support & Advisory", "National Honor Society", "Community Partnerships"],
      },
    ],
  },
  {
    title: "Support HBA",
    align: "right",
    columns: [
      {
        heading: "Giving",
        links: ["Donate", "Annual Fund"],
      },
      {
        heading: "Community",
        links: ["Volunteering", "Alumni"],
      },
    ],
  },
]
