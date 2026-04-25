// components/ui/PageHero.tsx
"use client"

import Image from "next/image"

interface PageHeroProps {
  title: string
  subtitle?: string
  image?: string
}

export default function PageHero({ title, subtitle, image }: PageHeroProps) {
  return (
    <section className="relative w-full h-[320px] sm:h-[420px] flex items-center justify-center text-center text-white">
      {image && (
        <Image
          src={image}
          alt={title}
          fill
          priority
          className="object-cover brightness-[0.45]"
        />
      )}

      <div className="relative z-10 px-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold drop-shadow-lg">{title}</h1>

        {subtitle && (
          <p className="mt-4 text-lg sm:text-xl opacity-90 drop-shadow-md">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
