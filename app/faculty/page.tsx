// app/faculty/page.tsx
"use client"

import { Fragment, useState } from "react"
import Image from "next/image"
import { Dialog, Transition } from "@headlessui/react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

type FacultyMember = {
  name: string
  title: string
  image: string
  shortBio: string
  fullBio: string
  area: string
  /** Whether this person is part of the school's leadership team. */
  leadership?: boolean
}

const faculty: FacultyMember[] = [
  {
    name: "Kun Xuan",
    title: "Head of School",
    image: "/images/faculty/kun-xuan.webp",
    area: "Leadership",
    leadership: true,
    shortBio:
      "Head of School with 17+ years in education and investment, focused on innovative, student-centered learning environments.",
    fullBio:
      "Mr. Kun earned his Bachelor of Science in Physics and Master of Science in Electronic Engineering from Fudan University. He currently serves as an Industrial Advisor at the University of Nottingham and is also a member of Mensa.\n\nWith more than 17 years of experience in education and educational investment, Mr. Xuan is deeply committed to advancing innovative learning environments that empower students to achieve academic excellence and develop strong character. His work focuses on integrating rigorous academic standards with personalized learning approaches that nurture critical thinking, creativity, and intellectual curiosity.\n\nMr. Xuan believes that education should not only prepare students for university success but also cultivate global perspectives, ethical leadership, and a lifelong love of learning. Under his leadership, the school strives to provide a supportive and forward-thinking academic environment where students are encouraged to explore their potential, pursue meaningful goals, and become responsible contributors to society.\n\nDriven by a mission to bridge international educational opportunities, Mr. Xuan is dedicated to helping students develop the knowledge, resilience, and confidence needed to thrive in an increasingly interconnected world.",
  },
  {
    name: "George Humphreys",
    title: "Director & Principal",
    image: "/images/faculty/george-humphreys.webp",
    area: "Leadership · Science · Technology",
    leadership: true,
    shortBio:
      "Director and Principal known for Chemistry, AP Chemistry, Physics, and building lasting mentor relationships with students.",
    fullBio:
      "George first designed HBA’s lab science program in 2008. He has earned local fame among the TPHS community for teaching Chemistry, AP Chemistry and Physics. George can take the most complex information and make it seem easy.\n\nHe creates lasting relationships with his students who view him as a mentor and friend. George also teaches our technology and engineering classes.\n\nHe is also a talented chef and teaches our cooking class. George and his students provide lunch for the entire school every Friday. George graduated from the University of San Diego and has three children: Jase, Lucy and George. When not at HBA, George can be found on the golf course.",
  },
  {
    name: "Ethan Alvarée",
    title: "Director of Instruction and Curriculum",
    image: "/images/faculty/ethan-alvaree.webp",
    area: "Leadership · Mathematics · Technology",
    leadership: true,
    shortBio:
      "Math, statistics, and computer science educator, curriculum writer for College Board, and director of technology at HBA.",
    fullBio:
      "Ethan is an accomplished educator with more than ten years of teaching experience in mathematics, statistics, and computer science. They hold a B.S. from Michigan State University and an M.S. from UC San Diego. Since joining HBA in 2018, they have played a key role in implementing the integrated Common Core math curriculum and launching new courses in symbolic logic, linear algebra, and group theory.\n\nBeyond teaching, Ethan is an active writer and researcher in the field of mathematics. They are a writer at the College Board, developing curriculum for the new AP Precalculus course and crafting lessons for the SpringBoard textbooks. Ethan’s research has been featured in the Journal of Statistics and Management Systems, and they are currently authoring additional textbooks in mathematical subjects.\n\nOutside their professional endeavors, Ethan enjoys spending quality time with their two golden retrievers, Mister Fibonacci and Miss Ada.",
  },
  {
    name: "Molly Sun",
    title: "Director of Admissions and Operations",
    image: "/images/faculty/molly-sun.webp",
    area: "Leadership · Admissions · Operations",
    leadership: true,
    shortBio:
      "Admissions and operations leader with a background in higher education, language teaching, and cross-cultural communication.",
    fullBio:
      "Molly holds a Master’s degree in Higher Education Administration from Northeastern University, where she developed a strong foundation in the U.S. higher education system, including college access, student development, and enrollment management. She also holds California teaching credentials in Chinese, reflecting her commitment to both language education and cross-cultural communication.\n\nPrior to joining High Bluff Academy, Molly taught Chinese language courses at San Diego State University, where she worked with a diverse student population and helped foster global awareness through language learning. She was also involved in the university’s military immersion program in collaboration with the Defense Language Institute, supporting intensive language training and cultural competency development.\n\nAt HBA, Molly is deeply committed to guiding students and families through the admissions process with care and transparency. She is passionate about building meaningful relationships with families and creating a supportive, inclusive school community. Through her work, she strives to ensure that each student feels welcomed, understood, and empowered to succeed both academically and personally.\n\nOutside of her professional role, Molly enjoys spending quality time with her family. She loves cooking and exploring new recipes, staying active at her local Pilates studio, and taking walks with her family and their golden retriever, Turbo.",
  },
  {
    name: "Kristin O'Connor",
    title: "Office Manager & Student Activities Coordinator",
    image: "/images/faculty/kristin-oconnor.webp",
    area: "Student Support · Activities",
    shortBio:
      "Office manager and activities coordinator with a background in Child Development and a passion for student success.",
    fullBio:
      "Kristin is pleased to be joining the High Bluff Academy Administration team. She earned her bachelor’s degree in Child Development from San Diego State University, where she developed a strong foundation in understanding how students grow academically, socially, and emotionally. Her education, combined with her dedication to supporting young people, has shaped her passion for working closely with families to ensure every student is equipped to reach their highest potential in both high school and college.\n\nShe is deeply committed to helping students thrive by providing guidance, encouragement, and individualized support throughout their educational journey. Whether assisting currently enrolled students or welcoming future families, Kristin serves as a resource, advocate, and partner in helping each student succeed.\n\nOutside of work, Kristin lives in Oceanside with her two dogs, who keep life fun and active. She enjoys spending time outdoors, especially beach walks and scenic coastal hikes. She also loves trying new cuisines, exploring different restaurants, and occasionally treating herself to a fun shopping trip. These experiences help her stay balanced, energized, and connected to the vibrant community here in San Diego.",
  },
  {
    name: "Ishaan Mishra",
    title: "Academic & College Counselor",
    image: "/images/faculty/ishaan-mishra.webp",
    area: "Counseling · College Planning",
    shortBio:
      "Academic and college counselor focused on helping students navigate college, career pathways, and long-term goals.",
    fullBio:
      "Ishaan is happy to be joining the team at High Bluff Academy, striving to assist students with their college and career planning. He holds a Bachelor of Arts in Child Development from Point Loma Nazarene University and a Master of Arts in Education with an emphasis in College Counseling and Student Development. Ishaan’s prior experience in K-12 dual enrollment support, as well as university admissions has shaped his passion for college and career preparation.\n\nHe is committed to providing students with valuable skills and insights that can equip them for future success. At High Bluff Academy, he will strive to provide enriching experiences for learners and provide consistent communication with families as they navigate through the college admissions process.\n\nOutside of work, Ishaan enjoys reading, running, and trying new food places around San Diego County. He also enjoys learning more about current trends in the field of education so that he can constantly grow in his service.",
  },
  {
    name: "Ellen Sullivan",
    title: "English Department Chair",
    image: "/images/faculty/ellen-sullivan.webp",
    area: "English · Humanities",
    shortBio:
      "English and Social Science educator with a background in international affairs and a passion for literacy and communication.",
    fullBio:
      "After a career in international affairs, Ellen has been an English teacher since 2010 because it provides her the opportunity to work with young people to shape the reading, writing, and oral communication skills she knows are needed in today’s professional world. Encouraging and observing the growth in each of her students is one of Ellen’s greatest joys.\n\nEllen, who holds California teaching credentials in both English and Social Science, received her BA in International Relations at the College of Wooster in Ohio, and completed her courses in education at Old Dominion University in Virginia and journalism at the University of Texas, Austin. When not in school, Ellen is taking photos of her surfing kids; sitting in a beach chair with toes in sand and book in hand; practicing yoga; or finding new and interesting places in the world to visit.",
  },
  {
    name: "Alan Saltamachio",
    title: "Biology & Environmental Science Teacher",
    image: "/images/faculty/alan-saltamachio.webp",
    area: "Science",
    shortBio:
      "Veteran biology and environmental science teacher with 30+ years of experience and a passion for hands-on learning.",
    fullBio:
      "Alan earned his degree in Biology from Cal Poly SLO and received his teaching credential from SDSU. Alan has a California single subject teaching credential in Biology with supplemental authorization in introductory Chemistry.\n\nWith over 30 years of experience in teaching Biology, AP Biology, and Environmental Science, Alan Saltamachio has dedicated his life to inspiring the next generation of scientists and environmental stewards. After an extensive career at Fallbrook High School, where he made a lasting impact on countless students, Alan came out of retirement to share his wealth of knowledge and passion for the environment at High Bluff Academy in recent years.\n\nAlan is a strong advocate for sustainability and environmental consciousness, and he brings this passion into every lesson. His teaching philosophy is rooted in the idea of “learning by doing,” encouraging his students to step outside the classroom and engage with the world around them through hands-on activities, field research, and real-world projects. His classes are renowned for being interactive and engaging, providing students with practical experience that connects theory to the environment they see and live in.\n\nWhen Alan isn’t in the classroom, you’ll likely find him out on the waves—surfing is his favorite way to recharge and stay connected to nature.",
  },
  {
    name: "Fran Dickson",
    title: "Spanish Teacher",
    image: "/images/faculty/fran-dickson.webp",
    area: "World Languages",
    shortBio:
      "Spanish teacher from Chile who brings language, culture, and lived experience into every lesson.",
    fullBio:
      "Fran is a passionate Spanish teacher from Chile, with a deep love for her language and culture. She holds a degree in Spanish and a teaching credential, which enables her to inspire and educate students with a comprehensive understanding of the language. With years of experience in the classroom, Fran is dedicated to making Spanish come alive for her students, fostering not only language proficiency but also an appreciation for the rich traditions and history of the Spanish-speaking world.\n\nEach summer, Fran enjoys traveling back to her homeland of Chile, reconnecting with her roots and exploring new corners of the country. These travels enrich her teaching, providing firsthand experiences and stories that she shares with her students. Outside the classroom, Fran loves spending quality time with her son, David, cherishing family moments and creating lasting memories. Her passion for teaching, her cultural connection to Chile, and her devotion to her family make her an inspiring educator and a wonderful role model for her students.",
  },
  {
    name: "Tricia Tigli",
    title: "French & ESL Teacher",
    image: "/images/faculty/tricia-tigli.webp",
    area: "World Languages · ESL · Humanities",
    shortBio:
      "French and ESL teacher with a global background, deep linguistic training, and a love of travel and culture.",
    fullBio:
      "Growing up in a Polish-speaking family in Paris, Ms. Tigli’s exposure to language started young. She moved to the US at the age of 10 and perfected her third language, English. Tricia earned both her B.A. in French and Linguistics with a minor in Political Science and her M.A. in French Literature at San Diego State University. After earning her degrees and teaching credential, she spent a year and a half in Paris at the Sorbonne earning her Certificat de Litérature et Civilization Française. Before joining the staff at HBA, she taught French at La Jolla High, Patrick Henry, and University City High, and Language Academy Immersion School. She has also taught ESL and TOEFL prep.\n\nTricia Tigli is an inspiring ESL and history teacher known for her dynamic and culturally rich teaching style. With a passion for global exploration, she incorporates lessons from her extensive travels into her classroom, offering students a unique, immersive learning experience. Having visited numerous countries across the world, Tricia shares real-world insights from her journeys, blending personal stories and historical context to make lessons come alive.\n\nEvery school holiday, Tricia eagerly sets off to discover new destinations, continuously broadening her understanding of the world. These experiences not only shape her teaching methods but also help her foster a global perspective in her students. With an engaging and hands-on approach, she encourages students to appreciate cultural diversity and develop a deeper understanding of history and language.\n\nMs. Tigli is the proud parent of two children, Jonathan and Amanda.",
  },
  {
    name: "Kris Bunce",
    title: "Math & Science Teacher",
    image: "/images/faculty/kris-bunce.webp",
    area: "Math · Science",
    shortBio:
      "Former nuclear engineer and research scientist teaching math, chemistry, and physics with real-world rigor.",
    fullBio:
      "Kris is a former Nuclear Engineer/Research Scientist that currently teaches math, chemistry, and physics. He has been a teacher since 2010, teaching math and science courses for High Tech High, SDSU, and University of Phoenix. Kris also helps develop curriculum. In fact, he led two teams of instructional designers in reconstructing the math program at University of Phoenix.\n\nHe was recently awarded Distinguished Faculty of the Year for outstanding teaching practices and for creating and facilitating faculty development workshops. In addition to teaching at High Bluff Academy, Kris helps the US Academic Decathlon develop exams, runs a tutoring business, and occasionally gives guest lectures at SDSU.",
  },
  {
    name: "Will Anderson, Ph.D.",
    title: "Science Teacher",
    image: "/images/faculty/will-anderson.webp",
    area: "Science",
    shortBio:
      "Ph.D. biochemist and longtime San Diego educator making advanced science accessible and exciting for students.",
    fullBio:
      "Dr. Will Anderson is a Ph.D. biochemist with nearly two decades of experience living, working, and teaching in San Diego. He earned his degree in Biochemistry and Molecular Biology from Cornell University and his Ph.D. in Chemistry from the University of California, San Diego. He brings a broad background in scientific research to the classroom, having spent over 10 years conducting academic research at Cornell University, UCSD, and The Scripps Research Institute.\n\nIn addition to his research career, Dr. Will has spent the past 13 years teaching high school, university, and graduate students. He has taught all levels of Chemistry, Biology, Environmental Science, and Psychology at High Bluff Academy, where he is known for making complex scientific ideas accessible, engaging, and meaningful for students at every level. He continues to mentor former students as they navigate college, graduate school, and professional pathways.\n\nOutside of the classroom, Dr. Will is an ardent supporter of the San Diego Zoo Wildlife Association. He enjoys spending time with the magnificent animals for which they care. He also spends an inordinate amount of time reading for fun, knows way too much about Star Wars, and has two cats named Luke & Leia.",
  },
  {
    name: "Lindy Benson",
    title: "Economics Teacher",
    image: "/images/faculty/lindy-benson.webp",
    area: "Social Science · Economics",
    shortBio:
      "Economics teacher with deep academic training, a global background, and a passion for both students and animals.",
    fullBio:
      "Born and raised in South Africa, Lindy holds a Bachelor of Commerce degree with majors in Accounting and Economics, as well as an Honours degree in Economics, from the University of South Africa. She is happily married with four children, and their lively home includes two dogs and five cats. A passionate long-distance runner, she has completed numerous half, full, and ultra marathons, balancing her love of family life with time on the road.\n\nDeeply committed to animal welfare, she fosters cats and kittens for a local rescue organization, opening her home and heart to animals in need. She has been teaching for many years at both school and college level, where she loves sharing her enthusiasm for economics with her students.",
  },
  {
    name: "Judy Beck",
    title: "Studio Art Teacher",
    image: "/images/faculty/judy-beck.webp",
    area: "Visual Arts",
    shortBio:
      "Artist, designer, and educator with a rich career in art, design, philanthropy, and global travel.",
    fullBio:
      "Judy attended Massachusetts College of Art, was a toy designer for Hasbro Toys, and went on a career in advertising and design, first with Doyle Dane & Bernbach, and then as the principal partner of Chambers of Design in Santa Monica, which specialized in tourism and travel clients. She also owned an interior design firm for many years.\n\nJudy is an accomplished painter, whose work is in the permanent collection of UCLA at the Eli Broad Bio-Medical Research Center, and in many private collections, and who exhibits her work frequently in shows. She volunteered for many years as an Art Angel at Santa Monica High School with the AP art students.\n\nJudy has a long history of chairing many charitable fundraisers, serves on the Los Angeles Region Red Cross Board, is the Co-chair of the LA Centennial Circle, and has been a member of the Red Cross Tiffany Circle National Council since 2009. She has won the Spirit of the Red Cross Award and the Red Cross Star Award. Judy served on the Board of Trustees for Otis College from 2017–2022 and joined the Board of Governors in September 2022, serving on the Board Affairs Committee. She is involved in many other nonprofits, serving on the board of the IDG Guild at Saint John’s Health Center where she also volunteers.\n\nJudy and her husband, Charles, live in Brentwood, love to travel, and have visited 44 countries so far.",
  },
]

function FacultyCard({
  member,
  onClick,
}: {
  member: FacultyMember
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-300 border border-gray-100 flex flex-col"
    >
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>
      <div className="p-5 flex flex-col gap-2 flex-grow">
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-[#f37021]">
          {member.area}
        </div>
        <h3 className="text-lg font-semibold text-[#1f3f66]">{member.name}</h3>
        <p className="text-sm text-gray-600">{member.title}</p>
        <p className="mt-2 text-sm text-gray-700 line-clamp-3">{member.shortBio}</p>
        <span className="mt-auto pt-3 text-xs font-semibold text-[#1f3f66] group-hover:text-[#f37021]">
          Read full bio →
        </span>
      </div>
    </button>
  )
}

export default function FacultyPage() {
  const [selected, setSelected] = useState<FacultyMember | null>(null)

  const leadership = faculty.filter((m) => m.leadership)
  const teachers = faculty.filter((m) => !m.leadership)

  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Faculty and staff"
        subtitle="Exceptional educators, mentors, and leaders dedicated to every student’s success."
        image="/images/faculty/faculty-hero.webp"
      />

      <Breadcrumbs />

      {/* Intro */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66]">
            Meet the people behind High Bluff Academy.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            Our faculty bring deep expertise, warmth, and a shared commitment to personalized
            education. They are scholars, professionals, artists, and mentors who know their
            students well and care deeply about their growth—both in and out of the classroom.
          </p>
        </div>
      </section>

      {/* Leadership */}
      <section id="leadership" className="pb-12 bg-gray-50 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-8 pt-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Leadership
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              School leadership
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((member) => (
              <FacultyCard
                key={member.name}
                member={member}
                onClick={() => setSelected(member)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="border-t border-gray-200" />
        </div>
      </div>

      {/* Teachers */}
      <section id="teachers" className="pb-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Faculty
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Teachers and staff
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {teachers.map((member) => (
              <FacultyCard
                key={member.name}
                member={member}
                onClick={() => setSelected(member)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Bio dialog */}
      <Transition.Root show={!!selected} as={Fragment}>
        <Dialog as="div" className="relative z-[200]" onClose={() => setSelected(null)}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-stretch sm:items-center justify-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 sm:scale-95"
              enterTo="opacity-100 sm:scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 sm:scale-100"
              leaveTo="opacity-0 sm:scale-95"
            >
              <Dialog.Panel
                className="relative bg-white shadow-2xl w-full h-full flex flex-col overflow-hidden
                           sm:h-auto sm:max-w-2xl sm:max-h-[90vh] sm:rounded-3xl
                           md:flex-row md:max-w-3xl"
              >
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 text-[#1f3f66] flex items-center justify-center shadow-lg backdrop-blur hover:bg-white transition"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>

                {selected && (
                  <>
                    <div className="relative h-72 flex-shrink-0 md:h-auto md:w-2/5">
                      <Image
                        src={selected.image}
                        alt={selected.name}
                        fill
                        sizes="(min-width: 768px) 40vw, 100vw"
                        className="object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 md:w-3/5">
                      <div className="space-y-3">
                        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-[#f37021]">
                          {selected.area}
                        </div>
                        <Dialog.Title className="text-2xl font-bold text-[#1f3f66]">
                          {selected.name}
                        </Dialog.Title>
                        <p className="text-sm text-gray-600">{selected.title}</p>
                        <div className="mt-4 space-y-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {selected.fullBio}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="mt-4 inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#1f3f66] text-white text-xs font-semibold hover:bg-[#f37021] transition"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Closing Section */}
      <section className="py-20 bg-[#1f3f66]">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-5">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Teaching is personal here.
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light">
            At High Bluff Academy, students are known by name, strengths, and aspirations.
            Our faculty build real relationships, provide thoughtful feedback, and help each
            student discover what they’re capable of—academically and beyond.
          </p>
        </div>
      </section>
    </main>
  )
}
