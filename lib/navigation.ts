export interface NavColumn {
  heading: string
  links: string[]
}

export interface NavItem {
  title: string
  columns?: NavColumn[]
}

export const navigation: NavItem[] = [
  {
    title: "About",
    columns: [
      {
        heading: "Overview",
        links: ["Our Approach", "Our Students", "Our Teachers", "Leadership"],
      },
      {
        heading: "More",
        links: ["Campus", "History", "Employment"],
      },
    ],
  },
  {
    title: "Admissions",
  },
  {
    title: "Upper School",
  },
  {
    title: "Student Life",
  },
  {
    title: "Support HBA",
  },
]
