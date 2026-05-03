// lib/categories.ts

export type CategoryKey = "academics" | "holiday" | "faculty" | "community"

export interface CategoryMeta {
  key: CategoryKey
  label: string
  color: string
  description: string
}

export const categories: Record<CategoryKey, CategoryMeta> = {
  academics: {
    key: "academics",
    label: "Academics",
    color: "#f37021",
    description:
      "First and last day of class, semester boundaries, finals, and AP testing dates.",
  },
  holiday: {
    key: "holiday",
    label: "Holidays & breaks",
    color: "#64748b",
    description:
      "Federal holidays, fall and spring breaks, winter recess, and school-wide closures.",
  },
  faculty: {
    key: "faculty",
    label: "Faculty",
    color: "#1f3f66",
    description:
      "Teacher in-service days. Faculty are on campus; students do not attend.",
  },
  community: {
    key: "community",
    label: "Community",
    color: "#16a34a",
    description:
      "Graduation, family events, NHS induction, and all-school gatherings.",
  },
}

export const categoryList: CategoryMeta[] = Object.values(categories)
