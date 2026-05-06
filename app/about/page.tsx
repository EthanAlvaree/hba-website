import Image from "next/image";
import PageHero from "@/components/ui/PageHero";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import YouTubeEmbed from "@/components/ui/YouTubeEmbed";

export default function AboutPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="About High Bluff Academy"
        subtitle="Cultivating lifelong, independent learners in a supportive environment."
        image="/images/about/campus.webp"
      />

      <Breadcrumbs />

      {/* OUR APPROACH - Editorial Split Layout */}
      <section id="approach" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="reveal grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
                Our mission
              </div>
              <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66] leading-tight">
                Preparing students <br />
                <span className="text-[#f37021]">for life.</span>
              </h2>
              <div className="space-y-4 text-lg text-gray-600 leading-relaxed font-light">
                <p>
                  We believe our most important goal as educators is to help students become independent, lifelong learners. As role models and mentors, we guide them toward becoming self-actualized young adults who make thoughtful, informed decisions about their futures.
                </p>
                <p>
                  We recognize that our time with each student is both limited and meaningful, and we strive to make a positive impact during this critical stage of their development. At the heart of our philosophy is the conviction that every student can succeed in a rigorous academic environment when supported by diverse teaching strategies and individualized instruction.
                </p>
                <p className="font-medium text-gray-800 border-l-4 border-[#f37021] pl-4 mt-6">
                  At High Bluff Academy, our approach centers on nurturing lifelong, independent learners who are equipped to face life’s challenges with confidence. We intentionally foster self-reliance and critical thinking, empowering students to take ownership of their education.
                </p>
              </div>
            </div>
            
            {/* High-Fidelity Image Feature */}
            <div className="relative h-[600px] w-full rounded-3xl overflow-hidden shadow-2xl group">
              <Image 
                src="/images/about/mission.webp"
                alt="Students collaborating" 
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/80 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO - See HBA in action */}
      <section id="video" className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Watch
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              See High Bluff Academy in action.
            </h2>
            <p className="text-gray-600 font-light">
              A three-minute look at our campus, classrooms, and community — straight from
              the people who make HBA what it is.
            </p>
          </div>
          <YouTubeEmbed videoId="DFui4sPHozQ" title="Welcome to High Bluff Academy" />
        </div>
      </section>

      {/* OUR STUDENTS - Glassmorphism Card */}
      <section id="students" className="py-24 relative bg-[#1f3f66]">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 opacity-20">
          <Image 
            src="/images/about/students.webp"
            alt="Diverse student body" 
            fill
            className="object-cover"
          />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-12 text-center">
          <div className="reveal bg-white/10 backdrop-blur-md border border-white/20 p-12 lg:p-16 rounded-3xl shadow-2xl">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Our students</h2>
            <p className="text-xl text-white/90 leading-relaxed font-light max-w-3xl mx-auto">
              Our student body includes full-time domestic and international students, as well as online learners enrolled both full-time and part-time. We truly believe that this diverse and dynamic community enriches the learning experience, fostering global perspectives, collaboration, and a deeper understanding of the world.
            </p>
          </div>
        </div>
      </section>

      {/* CAMPUS - Feature Grid */}
      <section id="campus" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="reveal grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 relative h-[500px] rounded-3xl overflow-hidden shadow-xl">
               <Image 
                src="/images/about/campus.webp"
                alt="Rancho Santa Fe Campus" 
                fill
                className="object-cover"
              />
            </div>
            
            <div className="lg:col-span-7 space-y-8 lg:pl-8">
              <div>
                <h2 className="text-4xl font-extrabold text-[#1f3f66] mb-4">The campus</h2>
                <p className="text-lg text-gray-600 font-light leading-relaxed">
                  The Rancho Santa Fe campus is the main location of High Bluff Academy, a private college-preparatory high school serving grades 9–12. It is known for its small, personalized learning environment, with very low student-to-teacher ratios and small class sizes that allow individualized attention.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  "Boutique-style campus with a focused academic setting",
                  "Small classes (often under 10 students)",
                  "Flexible in-person, hybrid, and online options",
                  "Strong emphasis on college preparation & tutoring",
                  "Distraction-free Rancho Santa Fe location"
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f37021]/10 flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-[#f37021]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HISTORY - Timeline Style */}
      <section id="history" className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
             <h2 className="text-4xl font-extrabold text-[#1f3f66]">Our history</h2>
             <div className="w-24 h-1.5 bg-[#f37021] mx-auto mt-6 rounded-full"></div>
          </div>

          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
            
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#1f3f66] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-[#f37021] font-bold tracking-widest text-sm mb-2">2002</div>
                <p className="text-gray-600 font-light">Founded in San Diego County as a tutoring and test preparation center, supporting students in Carmel Valley and Del Mar with individualized attention.</p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#1f3f66] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="text-[#f37021] font-bold tracking-widest text-sm mb-2">Expansion</div>
                <p className="text-gray-600 font-light">Expanded to include a full-time high school program (grades 9–12), developing into a recognized college-preparatory institution.</p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#f37021] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#1f3f66] text-white p-6 rounded-2xl shadow-xl">
                <div className="text-white/70 font-bold tracking-widest text-sm mb-2">Today</div>
                <p className="text-white/90 font-light mb-4">Achieved full WASC accreditation, allowing diplomas to be recognized nationwide. Offerings now include:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm font-medium text-white/80">
                  <li>Advanced Placement (AP) courses</li>
                  <li>International student programs (F-1 visa)</li>
                  <li>Online and hybrid learning</li>
                  <li>College counseling</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}