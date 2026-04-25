// /app/admissions/page.tsx

import PageLayout from "@/components/layout/PageLayout";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import CTA from "@/components/ui/CTA";
import Link from "next/link";

export default function AdmissionsPage() {
  return (
    <PageLayout>
      {/* HERO */}
      <Section background="gray">
        <Container className="max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Admissions
          </h1>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed">
            Joining the High Bluff Academy community is a personalized, welcoming
            process. We’re here to help you every step of the way—from your first
            visit to your first day of class.
          </p>
        </Container>
      </Section>

      {/* APPLY */}
      <Section>
        <Container className="max-w-4xl space-y-6">
          <h2 className="text-3xl font-semibold text-gray-900">How to Apply</h2>
          <ol className="list-decimal pl-6 text-lg text-gray-700 space-y-3">
            <li>
              <span className="font-semibold">Schedule a campus tour.</span> Experience
              life at HBA firsthand and see our classrooms, campus, and community.
            </li>
            <li>
              <span className="font-semibold">Complete our online application.</span>{" "}
              Submit your application and upload your unofficial transcripts.
            </li>
            <li>
              <span className="font-semibold">Meet with an admissions officer.</span>{" "}
              We’ll get to know your student, answer questions, and discuss the best
              academic path forward.
            </li>
          </ol>
          <p className="text-lg text-gray-700">
            When you’re ready to begin, you can start your application online:
          </p>
          <Link
            href="https://secure.gradelink.com/2962/enrollment"
            className="inline-block mt-4 text-blue-700 font-semibold underline"
            target="_blank"
          >
            Click here to start your application →
          </Link>
        </Container>
      </Section>

      {/* TUITION & FEES */}
      <Section background="gray">
        <Container className="max-w-4xl space-y-6">
          <h2 className="text-3xl font-semibold text-gray-900">
            Tuition and Fees
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Domestic Students
              </h3>
              <ul className="space-y-2 text-lg text-gray-700">
                <li>
                  <span className="font-semibold">Tuition:</span> $28,000 per year
                </li>
                <li>
                  <span className="font-semibold">Registration Fee:</span> $300
                  (non-refundable)
                </li>
                <li>
                  <span className="font-semibold">Graduation Fee (12th Grade):</span>{" "}
                  $500 – includes cap and gown, senior activities, and the graduation
                  luncheon
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                International Students
              </h3>
              <ul className="space-y-2 text-lg text-gray-700">
                <li>
                  <span className="font-semibold">Tuition:</span> $45,580 per year
                </li>
                <li>
                  <span className="font-semibold">Registration Fee:</span> $300
                  (non-refundable)
                </li>
                <li>
                  <span className="font-semibold">I-20 Issuing Deposit:</span>{" "}
                  $10,000 (applied toward tuition when the student arrives on campus)
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              Homestay Information
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              High Bluff Academy does not provide homestays directly but can assist
              international students in finding a homestay through local providers.
              Homestay fees vary and typically include transportation to and from
              school and three meals per day. Please note that public transportation
              is not available for commuting to and from school.
            </p>
          </div>
        </Container>
      </Section>

      {/* FINANCIAL AID */}
      <Section>
        <Container className="max-w-4xl space-y-6">
          <h2 className="text-3xl font-semibold text-gray-900">Financial Aid</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            We understand that investing in your student’s education is a
            significant decision. If financial assistance is needed, please contact
            our office. Our finance team will work with you to determine the support
            options available to help your student succeed at High Bluff Academy.
          </p>
        </Container>
      </Section>

      {/* VISIT CAMPUS */}
      <Section background="gray">
        <Container className="max-w-4xl space-y-4">
          <h2 className="text-3xl font-semibold text-gray-900">
            Visit Our Campus
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            The best way to get to know High Bluff Academy is to visit in person.
            We invite you to tour our Rancho Santa Fe campus, meet our faculty, and
            experience our learning environment firsthand.
          </p>
          <p className="text-lg text-gray-800">
            <span className="font-semibold">Call us to schedule a tour:</span>{" "}
            858-509-9101
          </p>
        </Container>
      </Section>

      {/* CTA */}
      <CTA
        title="Ready to Begin Your HBA Journey?"
        description="Start your application or schedule a campus visit to learn how High Bluff Academy can support your student’s goals."
        buttonText="Start Application"
        buttonLink="https://secure.gradelink.com/2962/enrollment"
      />
    </PageLayout>
  );
}
