import PageHero from "@/components/ui/PageHero"
import Section from "@/components/ui/Section"

export default function ContactPage() {
  return (
    <main>
      <PageHero
        title="Contact High Bluff Academy"
        subtitle="We would love to meet your family and learn how we can support your student's journey."
        image="/images/campus.jpg"
      />

      <Section>
        <div className="grid md:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>

            <div className="space-y-4 text-lg">
              <p>
                <strong>Address</strong><br/>
                123 Education Lane<br/>
                San Diego, CA
              </p>

              <p>
                <strong>Phone</strong><br/>
                (858) 555-1234
              </p>

              <p>
                <strong>Email</strong><br/>
                admissions@highbluffacademy.com
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-slate-50 p-8 rounded-2xl shadow-sm">
            <h3 className="text-2xl font-semibold mb-6">Request Information</h3>

            <form className="space-y-4">
              <input className="w-full border p-3 rounded-lg" placeholder="Parent Name" />
              <input className="w-full border p-3 rounded-lg" placeholder="Student Name" />
              <input className="w-full border p-3 rounded-lg" placeholder="Email Address" />
              <input className="w-full border p-3 rounded-lg" placeholder="Phone Number" />
              <textarea className="w-full border p-3 rounded-lg h-32" placeholder="How can we help?" />

              <button className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition">
                Submit Inquiry
              </button>
            </form>
          </div>
        </div>
      </Section>
    </main>
  )
}