import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { getApplicationByDraftToken } from "@/lib/applications"
import ApplyWizard from "./ApplyWizard"

type ApplyPageProps = {
  searchParams: Promise<{ draft?: string }>
}

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Apply — High Bluff Academy",
  description:
    "Start your High Bluff Academy application. The form takes about ten minutes; you can save and return anytime via a link emailed to you.",
}

export default async function ApplyPage({ searchParams }: ApplyPageProps) {
  const { draft } = await searchParams

  const draftRecord = draft ? await getApplicationByDraftToken(draft) : null

  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Apply to High Bluff Academy"
        subtitle="A five-step application. Save and return anytime — we’ll email you a link."
        image="/images/admissions/admissions-hero.webp"
      />

      <Breadcrumbs />

      <section className="bg-white py-16 lg:py-20">
        <div className="reveal mx-auto max-w-5xl px-6 lg:px-12">
          {draft && !draftRecord && (
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
              That draft link is no longer valid (drafts expire after thirty days).
              You can start a new application below.
            </div>
          )}

          {draftRecord && (
            <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              Welcome back. Your saved progress has been restored — keep working
              where you left off, then save again or submit when ready.
            </div>
          )}

          <ApplyWizard initialRecord={draftRecord} />
        </div>
      </section>
    </main>
  )
}
