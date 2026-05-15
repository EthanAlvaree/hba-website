// app/_schools/pci/people.ts
//
// Single source of truth for PCI's people: leadership, guest artists,
// and STEM/contest faculty. Used by the About page (condensed row) and
// the dedicated /faculty list + /faculty/[slug] detail pages.
//
// Why hardcoded TS instead of HBA's Supabase-backed faculty_bios:
// PCI's roster is small and stable (6 entries today). When that changes
// we can promote this to a DB-backed model, but for now a typed array
// is the right level of overhead.

export type PciPersonCategory = "leadership" | "artists" | "stem"

export type PciPerson = {
  slug: string
  name: string
  role: string
  category: PciPersonCategory
  image: string
  /** One-sentence summary for cards and the About row. */
  shortBio: string
  /** Multi-paragraph full bio (split on \n\n). */
  fullBio: string
}

export const pciPeople: PciPerson[] = [
  // ─── Leadership ──────────────────────────────────────────────────────
  {
    slug: "ethan-alvaree",
    name: "Ethan Alvarée",
    role: "CEO & Co-founder",
    category: "leadership",
    image: "/images/pci/people/ethan-alvaree.webp",
    shortBio:
      "CEO and co-founder. Leads curriculum, instruction, and technology, and teaches the Art Institute studio personally.",
    fullBio: `Ethan founded PCI to build the kind of weekend-deep, professionally-anchored programs the school week never has time for. They lead curriculum, instruction, and technology, manage the partnership with Floating Island Productions, and personally teach the Art Institute's flagship Saturday studio.

Beyond PCI, Ethan is a College Board curriculum writer for AP Precalculus and SpringBoard, with more than a decade teaching mathematics, statistics, and computer science. They hold a B.S. from Michigan State University and an M.S. from UC San Diego, and have published in the Journal of Statistics and Management Systems.

At PCI they teach the digital art studio directly — drawing fundamentals, light and color theory, software pipelines in Clip Studio Paint and Photoshop, and the production workflow that turns student work into printed hardcover pages.`,
  },
  {
    slug: "molly-sun",
    name: "Molly Sun",
    role: "Director of Marketing, Recruitment & Administration · Co-founder",
    category: "leadership",
    image: "/images/pci/people/molly-sun.webp",
    shortBio:
      "Co-founder and head of recruitment, marketing, and family-facing operations.",
    fullBio: `Molly leads PCI's recruitment, marketing, and family-facing operations — guiding new students and parents through every step from first inquiry to first class.

She holds a Master's in Higher Education Administration from Northeastern University, where she built a foundation in college access, student development, and enrollment management. She also holds California teaching credentials in Chinese and previously taught Chinese language courses at San Diego State University, where she worked with a diverse student population and participated in the university's military immersion program in collaboration with the Defense Language Institute.

At PCI she brings particular care to international and bilingual families, designs the onboarding workflows, oversees admissions communication, and builds the community programs that turn first-time visitors into long-term PCI families.`,
  },

  // ─── Guest artists & instructors ─────────────────────────────────────
  {
    slug: "ken-penders",
    name: "Ken Penders",
    role: "Author / Illustrator / Publisher",
    category: "artists",
    image: "/images/pci/bios/ken-penders.webp",
    shortBio:
      "Sonic the Hedgehog veteran. Founder of Floating Island Productions and PCI's publishing partner.",
    fullBio: `Ken Penders is a longtime author, illustrator, and publisher best known for his work on Sonic the Hedgehog from 1993 to 2006. He created many original characters and storylines, including writing every issue of Knuckles the Echidna (1997) and the Princess Sally (1995) miniseries.

Beyond Sonic, Ken has worked on titles such as Star Trek, King of the Hill, and The Legend of Zelda. He has also worked in animation, story development, filmmaking, and independent publishing.

His studio, Floating Island Productions, is currently releasing hardcover editions of his original stories — restored, recolored, and re-lettered for a new generation of readers. PCI students contribute directly to those books as part of the Art Institute studio, earning published credit alongside the working professionals on the team.`,
  },
  {
    slug: "scott-shaw",
    name: "Scott Shaw",
    role: "Penciller / Animator / Writer",
    category: "artists",
    image: "/images/pci/bios/scott-shaw.webp",
    shortBio:
      "Award-winning artist with 50+ years experience. First artist on Archie's Sonic series. Co-founder, San Diego Comic-Con.",
    fullBio: `Scott Shaw is an award-winning penciller, animator, and writer with over 50 years of experience. He was the first artist on Archie Comics' Sonic the Hedgehog series (1992), recently collected in Floating Island Productions' hardcover Scott Shaw's Sonic Days.

He has also worked as co-creator on The Simpsons comic books and on classic properties like The Flintstones. Scott has taught cartooning and animation at the college level and co-founded San Diego Comic-Con in 1970.

His expertise in visual humor, character design, and production pipelines offers PCI students an inspiring look into the professional art world during workshop visits and feedback sessions.`,
  },
  {
    slug: "kurt-michael-russell",
    name: "Kurt Michael Russell",
    role: "Professional Colorist",
    category: "artists",
    image: "/images/pci/bios/kurt-michael-russell.webp",
    shortBio:
      "Working colorist for DC, Image, Vault, IDW, and Dark Horse since 2011. Teaches digital coloring to thousands online.",
    fullBio: `Kurt Michael Russell has been working as a professional digital colorist since 2011, known for his work on comics published by DC, Image, Vault, IDW, Dark Horse, and other major publishers.

Since 2014 Kurt has also taught digital coloring through popular online courses and YouTube, helping thousands of artists learn the craft.

His expertise in lighting, mood, rendering, and digital workflow gives PCI students practical, industry-ready skills — exactly the toolset they'll use on the pages that ship to print.`,
  },

  // ─── STEM & contest faculty ─────────────────────────────────────────
  {
    slug: "will-anderson",
    name: "Will Anderson, Ph.D.",
    role: "Science · Olympiad Track",
    category: "stem",
    image: "/images/pci/people/will-anderson.webp",
    shortBio:
      "Ph.D. biochemist with nearly two decades in San Diego science education. Leads PCI's olympiad and AP-track instruction.",
    fullBio: `Dr. Will Anderson is a Ph.D. biochemist with nearly two decades of experience living, working, and teaching in San Diego. He earned his degree in Biochemistry and Molecular Biology from Cornell University and his Ph.D. in Chemistry from the University of California, San Diego.

He brings a broad background in scientific research to the classroom, having spent more than 10 years conducting academic research at Cornell University, UCSD, and The Scripps Research Institute. He has spent the past 13 years teaching high school, university, and graduate students.

At PCI he leads science-track instruction — AP biology and chemistry review, USABO and USNCO olympiad preparation, and the kind of deep-conceptual teaching that turns memorizers into thinkers. He is known for making complex scientific ideas accessible, engaging, and meaningful at every level.`,
  },
]

export function getPciPersonBySlug(slug: string): PciPerson | null {
  return pciPeople.find((p) => p.slug === slug) ?? null
}

export function getPciPeopleByCategory(category: PciPersonCategory): PciPerson[] {
  return pciPeople.filter((p) => p.category === category)
}

/** For prev/next navigation on detail pages — walks in the listed order. */
export function getPciNeighbors(slug: string) {
  const i = pciPeople.findIndex((p) => p.slug === slug)
  if (i === -1) return null
  const prev = pciPeople[(i - 1 + pciPeople.length) % pciPeople.length]
  const next = pciPeople[(i + 1) % pciPeople.length]
  return { prev, next }
}
