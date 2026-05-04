// components/ui/YouTubeEmbed.tsx
"use client"

import Image from "next/image"
import { useState } from "react"

type Props = {
  /** YouTube video ID, e.g. "DFui4sPHozQ" */
  videoId: string
  /** Accessible title for the player. */
  title: string
  /** Optional aspect ratio override; defaults to 16:9. */
  aspect?: "16/9" | "9/16" | "4/3" | "1/1"
}

// Lazy "facade" YouTube embed: shows the official thumbnail until the user
// clicks play, then swaps in the iframe. Avoids loading ~600 KB of YouTube
// player JS on every page view.
export default function YouTubeEmbed({ videoId, title, aspect = "16/9" }: Props) {
  const [active, setActive] = useState(false)

  const aspectClass =
    aspect === "9/16"
      ? "aspect-[9/16]"
      : aspect === "4/3"
        ? "aspect-[4/3]"
        : aspect === "1/1"
          ? "aspect-square"
          : "aspect-video"

  return (
    <div className={`relative ${aspectClass} w-full rounded-3xl overflow-hidden shadow-2xl bg-black`}>
      {active ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 w-full h-full"
        >
          <Image
            src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
            alt={title}
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-[#f37021] text-white shadow-2xl transition-transform duration-300 group-hover:scale-110">
              <svg
                className="w-8 h-8 ml-1"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
