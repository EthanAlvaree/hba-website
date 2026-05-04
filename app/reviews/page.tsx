// app/reviews/page.tsx
"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { reviews, sources, type ReviewSource } from "@/lib/reviews"

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex gap-0.5 text-[#f37021]"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={`w-4 h-4 ${n <= rating ? "fill-current" : "fill-gray-200"}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
        </svg>
      ))}
    </div>
  )
}

function SourceBadge({ source }: { source: ReviewSource }) {
  const meta = sources.find((s) => s.name === source)!
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide"
      style={{ color: meta.accent }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: meta.accent }}
      />
      {source}
    </span>
  )
}

export default function ReviewsPage() {
  const [filter, setFilter] = useState<ReviewSource | "All">("All")

  const filtered = useMemo(
    () => (filter === "All" ? reviews : reviews.filter((r) => r.source === filter)),
    [filter]
  )

  const featured = reviews.filter((r) => r.featured)

  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="What families are saying"
        subtitle="Reviews from the parents, students, and alumni who know HBA best."
        image="/images/reviews/reviews-hero.webp"
      />

      <Breadcrumbs />

      {/* AGGREGATE SOURCES */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Verified across the web
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#1f3f66]">
              Read reviews on every major platform.
            </h2>
            <p className="text-gray-600 font-light">
              We&rsquo;ve been reviewed by hundreds of HBA families on the platforms below.
              Click through to read every review — unfiltered and in full.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {sources.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="relative w-12 h-12 mx-auto mb-3">
                  <Image
                    src={s.logo}
                    alt={`${s.name} logo`}
                    fill
                    sizes="48px"
                    className="object-contain"
                  />
                </div>
                <div className="text-sm font-semibold text-[#1f3f66] group-hover:text-[#f37021] transition-colors">
                  {s.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">Read on site →</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED REVIEWS */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Featured
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Stories that capture the HBA difference.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {featured.map((review, idx) => (
              <article
                key={idx}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col"
              >
                <svg
                  className="w-10 h-10 text-[#f37021]/30 mb-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-gray-800 leading-relaxed font-light italic mb-6 flex-grow">
                  {review.body}
                </p>
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <StarRating rating={review.rating} />
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#1f3f66]">
                      {review.author}
                    </p>
                    <SourceBadge source={review.source} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ALL REVIEWS WITH FILTER */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
                More reviews
              </h2>
              <p className="text-gray-600 font-light mt-2">
                Filter by source to read what families say on each platform.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter("All")}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                  filter === "All"
                    ? "bg-[#1f3f66] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {sources.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setFilter(s.name)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                    filter === s.name
                      ? "text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={
                    filter === s.name
                      ? { backgroundColor: s.accent }
                      : undefined
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((review, idx) => (
              <article
                key={`${review.author}-${idx}`}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-200 flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <StarRating rating={review.rating} />
                  <SourceBadge source={review.source} />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed flex-grow">
                  {review.body}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#1f3f66]">
                    {review.author}
                  </p>
                  {review.date && (
                    <p className="text-xs text-gray-500">{review.date}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#1f3f66]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            See for yourself.
          </h2>
          <p className="text-lg text-white/90 leading-relaxed font-light">
            The best way to understand HBA is to visit. Schedule a tour, meet our
            faculty, and see why so many families choose us.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Schedule a tour
            </a>
            <a
              href="/admissions"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-[#1f3f66] transition"
            >
              Explore admissions
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
