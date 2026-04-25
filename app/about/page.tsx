import PageLayout from "@/components/layout/PageLayout";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";

export default function AboutPage() {
  return (
    <PageLayout>
      {/* HERO */}
      <Section background="gray">
        <Container className="max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            About High Bluff Academy
          </h1>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed">
            High Bluff Academy is a student-centered, college-preparatory high school
            in Rancho Santa Fe, dedicated to helping students become independent,
            lifelong learners in a rigorous yet supportive environment.
          </p>
        </Container>
      </Section>

      {/* MISSION & APPROACH */}
      <Section>
        <Container className="max-w-4xl space-y-6">
          <h2 className="text-3xl font-semibold text-gray-900">
            Our Mission and Approach
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            We believe our most important goal as educators is to help students
            become independent, lifelong learners. As role models and mentors, we
            guide them toward becoming self-actualized young adults who make
            thoughtful, informed decisions about their futures. We recognize that
            our time with each student is both limited and meaningful, and we
            strive to make a positive impact during this critical stage of their
            development.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            At the heart of our philosophy is the conviction that every student can
            succeed in a rigorous academic environment when supported by diverse
            teaching strategies and individualized instruction. Our approach centers
            on nurturing lifelong, independent learners who are equipped to face
            life’s challenges with confidence. We intentionally foster self-reliance
            and critical thinking, empowering students to take ownership of their
            education. Through this approach, we prepare students not just for
            college—but for life.
          </p>
        </Container>
      </Section>

      {/* STUDENTS & TEACHERS */}
      <Section background="gray">
        <Container className="grid gap-12 md:grid-cols-2">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Our Students
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our student body includes full-time domestic and international
              students, as well as online learners enrolled both full-time and
              part-time. This diverse and dynamic community enriches the learning
              experience, fostering global perspectives, collaboration, and a deeper
              understanding of the world.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Our Teachers
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our teachers are committed to delivering a rigorous, high-quality
              education that supports each student’s individual goals and
              aspirations. Through exposure to a wide range of career pathways, we
              encourage students to explore their interests and gain clarity about
              their future.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mt-4">
              Recognizing that every student learns differently, we offer the
              ability to accelerate or remediate coursework as needed. Our
              curriculum is thoughtfully customized to support English language
              learners, students seeking advanced academic challenges, and those who
              benefit from a more gradual pace.
            </p>
          </div>
        </Container>
      </Section>

      {/* LEADERSHIP MESSAGE */}
      <Section>
        <Container className="max-w-4xl space-y-6">
          <h2 className="text-3xl font-semibold text-gray-900">
            A Message from the Head of School
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            At High Bluff Academy, we are dedicated to cultivating a learning
            environment where students are empowered to grow, achieve, and thrive.
            Our mission is rooted in the belief that every student has unique
            strengths, and with the right guidance and support, each can reach their
            fullest potential.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            We take pride in providing a personalized educational experience that
            challenges students academically while nurturing their confidence and
            independence. Our faculty serves not only as educators, but also as
            mentors—guiding students to think critically, act responsibly, and make
            informed decisions about their future.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            In today’s ever-changing world, success requires more than academic
            achievement. It requires resilience, adaptability, and a lifelong love
            of learning. At High Bluff Academy, we are committed to developing
            these qualities in every student, preparing them not only for college,
            but for life beyond the classroom.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            We value the trust families place in us and are honored to partner with
            you during this important stage of your student’s journey. We warmly
            welcome you to join the High Bluff Academy family.
          </p>
          <div className="mt-6">
            <p className="font-semibold text-gray-900">Warm regards,</p>
            <p className="font-semibold text-gray-900 mt-2">Mr. Kun Xuan</p>
            <p className="text-gray-700">Head of School</p>
          </div>
        </Container>
      </Section>

      {/* LEADERSHIP LIST */}
      <Section background="gray">
        <Container className="max-w-4xl">
          <h2 className="text-3xl font-semibold text-gray-900 mb-6">
            School Leadership
          </h2>
          <ul className="space-y-3 text-lg text-gray-800">
            <li>
              <span className="font-semibold">Head of School:</span> Mr. Kun Xuan
            </li>
            <li>
              <span className="font-semibold">Director and Principal:</span> George
              Humphreys
            </li>
            <li>
              <span className="font-semibold">
                Math Department Chair and Director of Technology:
              </span>{" "}
              Ethan Alvarée
            </li>
            <li>
              <span className="font-semibold">
                Assistant Director and Director of Admissions:
              </span>{" "}
              Molly Sun
            </li>
          </ul>
        </Container>
      </Section>

      {/* CAMPUS */}
      <Section>
        <Container className="max-w-4xl space-y-6">
          <h2 className="text-3xl font-semibold text-gray-900">
            Our Rancho Santa Fe Campus
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            The Rancho Santa Fe campus is the main location of High Bluff Academy,
            a private college-preparatory high school serving grades 9–12. It is
            known for its small, personalized learning environment, with very low
            student-to-teacher ratios and small class sizes that allow individualized
            attention.
          </p>
          <ul className="list-disc pl-6 text-lg text-gray-700 space-y-2">
            <li>Boutique-style campus with a focused academic setting</li>
            <li>Small classes for personalized instruction</li>
            <li>Flexible in-person, hybrid, and online programs</li>
            <li>Strong emphasis on college preparation and academic support</li>
            <li>
              Quiet, upscale Rancho Santa Fe location with a safe, distraction-free
              environment
            </li>
          </ul>
        </Container>
      </Section>

      {/* HISTORY */}
      <Section background="gray">
        <Container className="max-w-4xl space-y-6">
          <h2 className="text-3xl font-semibold text-gray-900">
            History of High Bluff Academy
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            High Bluff Academy was founded in 2002 in San Diego County with the
            goal of providing a more personalized and flexible approach to
            education. The school began as a tutoring and test preparation center,
            supporting students in the Carmel Valley and Del Mar areas who needed
            additional academic guidance and individualized attention.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            As demand grew from families seeking alternatives to large traditional
            schools, High Bluff Academy expanded to include a full-time high school
            program (grades 9–12). Over time, the academy developed into a
            college-preparatory institution known for its small class sizes,
            flexible scheduling, and customized learning plans.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Its commitment to academic quality was recognized when it achieved full
            accreditation from the Western Association of Schools and Colleges
            (WASC), allowing its diplomas to be recognized by universities
            nationwide, including the University of California system.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Today, High Bluff Academy is recognized as a student-centered,
            college-preparatory school that emphasizes individualized instruction,
            flexibility, and the development of independent, lifelong learners.
          </p>
        </Container>
      </Section>
    </PageLayout>
  );
}