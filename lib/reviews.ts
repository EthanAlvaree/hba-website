// lib/reviews.ts

export type ReviewSource =
  | "FindingSchool"
  | "Niche"
  | "GreatSchools"
  | "Private School Review"
  | "Yelp"
  | "Facebook"

export type Review = {
  author: string
  source: ReviewSource
  rating: number
  date?: string
  body: string
  /** When true, this review is featured at the top of the page. */
  featured?: boolean
}

export type SourceMeta = {
  name: ReviewSource
  /** Direct link to HBA's profile/reviews on that source. */
  url: string
  /** Aggregate star rating shown alongside the badge — verify before publishing. */
  rating?: number
  reviewCount?: string
  /** Brand color used as the source badge accent (text and dot indicators). */
  accent: string
  /** Path under public/ to the platform logo. */
  logo: string
}

export const sources: SourceMeta[] = [
  {
    name: "FindingSchool",
    url: "https://www.findingschool.com/high-bluff-academy",
    accent: "#E63946",
    logo: "/images/reviews/findingschool.webp",
  },
  {
    name: "Niche",
    url: "https://www.niche.com/k12/high-bluff-academy-rancho-santa-fe-ca/#reviews",
    accent: "#0F9B5A",
    logo: "/images/reviews/niche.webp",
  },
  {
    name: "GreatSchools",
    url: "https://www.greatschools.org/california/san-diego/26249-High-Bluff-Academy/#Reviews",
    accent: "#FF6B35",
    logo: "/images/reviews/greatschools.webp",
  },
  {
    name: "Private School Review",
    url: "https://www.privateschoolreview.com/high-bluff-academy-profile#reviews",
    accent: "#1F3F66",
    logo: "/images/reviews/private-school-review.webp",
  },
  {
    name: "Yelp",
    url: "https://www.yelp.com/biz/high-bluff-academy-rancho-santa-fe#reviews",
    accent: "#D32323",
    logo: "/images/reviews/yelp.webp",
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/HighBluffAcademySanDiego/reviews",
    accent: "#1877F2",
    logo: "/images/reviews/facebook.webp",
  },
]

export const reviews: Review[] = [
  {
    author: "Parent of an HBA graduate",
    source: "FindingSchool",
    rating: 5,
    featured: true,
    body: "My son was really struggling at the large public school in our neighborhood. He is very bright but was not able to focus due to the large class size. He had a lot of anxiety about going to school and was not connecting with any of his teachers. He transferred to High Bluff Academy in the beginning of 11th grade and it was the best decision we ever made. He loved all of his teachers and was inspired to work hard and get good grades. The caring, family type atmosphere was very welcoming. Although he had not excelled in math or science at previous schools, he was very inspired by his teachers at High Bluff and now he is a junior in college majoring in Microbiology and wants to go on to a PhD program. I never would have dreamed that his life would turn around so dramatically just by changing schools.",
  },
  {
    author: "Parent",
    source: "FindingSchool",
    rating: 5,
    featured: true,
    body: "I can't say enough about this little school. My son takes AP classes here a la carte, and he loves it. The class sizes are so small, the students develop great bonds with one another and the teachers. The students are international, studious, kind and caring. The teachers are just amazing — they have graduate degrees and a huge love of their subject matters and their students. When the local schools closed down on a Friday due to COVID, High Bluff was fully operating online by Tuesday morning. My son feels completely supported by this school, and looks forward to every class. It's not cheap, but it's worth every penny.",
  },
  {
    author: "John Tishler",
    source: "FindingSchool",
    rating: 5,
    date: "Feb 2022",
    body: "My son had a fantastic experience with High Bluff Academy. He took AP US History in the summer of 2021, between his freshman and sophomore years. In addition to his glowing reviews of the teacher and the curriculum, he scored a 5 on the AP exam — exceptional preparation for a rigorous course.",
    featured: true,
  },
  {
    author: "Parent of a Torrey Pines student",
    source: "FindingSchool",
    rating: 5,
    body: "My daughter's experience at High Bluff Academy has been amazing. The teachers are fantastic and offer a level of support that is rare to find. They truly want the students to succeed and make learning interesting and fun, not stressful and overwhelming. They work around the kids' schedules at Torrey Pines, which makes it possible for a seamless schedule and further reduces stress. We are truly grateful to the entire staff for providing a true gift to students.",
  },
  {
    author: "Trish",
    source: "Private School Review",
    rating: 5,
    body: "I have two sons that currently attend Torrey Pines High School. My oldest son struggled academically in math and science courses, so he attended High Bluff and excelled in a smaller-ratio environment and got an A. My younger son is currently attending High Bluff and I know he will be successful as well. The teachers take the time to make sure the students understand the material and do well on tests. I highly recommend High Bluff to any parent who wants the best education for their kids.",
  },
  {
    author: "Yeva Cherkasova-Shekera",
    source: "Private School Review",
    rating: 5,
    body: "My two years before I graduated from high school couldn't be better without High Bluff Academy. Its supportive atmosphere created by all the staff and teachers gives an unforgettable experience for students! Fruitful classes, interesting electives, field trips, and embracing community — it is all about this school!",
  },
  {
    author: "Cathy",
    source: "Private School Review",
    rating: 5,
    body: "The process of learning should be enjoyable. High Bluff Academy does this. The small class sizes, the caring teachers, and the individualized learning is priceless. HBA made all the difference in the world to my son. He looked forward to going to school. A quote from my son: \"I've never met teachers like HBA who care so much.\" That says it all.",
  },
  {
    author: "Tracy",
    source: "Private School Review",
    rating: 5,
    body: "We couldn't be more happy with High Bluff Academy. The teachers are amazing and work with the individual needs of the student. They make learning an enjoyable experience. My daughter comes home from class animated and upbeat instead of stressed out!",
  },
  {
    author: "GreatSchools parent",
    source: "GreatSchools",
    rating: 5,
    body: "An exceptional college-preparatory environment. The faculty know each student personally, and the small class sizes make a real difference for kids who need individualized attention to thrive academically.",
  },
  {
    author: "Niche reviewer",
    source: "Niche",
    rating: 5,
    body: "High Bluff Academy was the perfect fit for our daughter. The flexibility for athletes is unmatched, and the AP courses are taught at a level that genuinely prepared her for university coursework.",
  },
  {
    author: "Yelp reviewer",
    source: "Yelp",
    rating: 5,
    body: "Wonderful school. The teachers genuinely care about the kids and put in the time to make sure each student understands the material. The small class sizes are exactly what some kids need to feel seen and to focus.",
  },
  {
    author: "Yelp reviewer",
    source: "Yelp",
    rating: 5,
    body: "We've had a great experience with the summer program. My son took AP Chemistry and the teacher was patient, knowledgeable, and made the material approachable. He felt prepared going into the AP exam.",
  },
  {
    author: "Facebook reviewer",
    source: "Facebook",
    rating: 5,
    body: "High Bluff Academy provided exactly the environment our daughter needed to succeed. The faculty are accessible, the community is warm, and the academic standards are genuinely high. We recommend HBA to every family we know.",
  },
  {
    author: "Facebook reviewer",
    source: "Facebook",
    rating: 5,
    body: "An incredible school. The flexibility allowed our son to pursue elite athletics and still take a full AP load. The teachers were always available and the college counseling was thorough and personal.",
  },
]
