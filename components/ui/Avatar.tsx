// Shared avatar primitive used everywhere a profile/student photo
// shows up: roster cards, schedule cards, portal headers, parent
// student picker. Centralizing so the fallback look + sizing stays
// consistent — and so a future change (e.g. ring-on-hover or
// click-to-enlarge) lands in one place.
//
// Renders the photo if photoUrl is set, otherwise initials on a
// brand-navy gradient. Uses Next.js Image when possible for the
// CDN optimization; falls back to plain <img> when we don't have
// reliable width/height info (very rare).

import Image from "next/image"

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

const sizePx: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 96,
}

const sizeClass: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
}

export default function Avatar({
  photoUrl,
  initials,
  alt,
  size = "md",
  className,
}: {
  photoUrl: string | null
  initials: string
  alt: string
  size?: AvatarSize
  className?: string
}) {
  const px = sizePx[size]
  const cls = `inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-gradient-to-br from-brand-navy to-[#3b5f8e] font-bold text-white ${sizeClass[size]} ${className ?? ""}`

  if (photoUrl) {
    return (
      <span className={cls} style={{ width: px, height: px }}>
        <Image
          src={photoUrl}
          alt={alt}
          width={px}
          height={px}
          className="h-full w-full object-cover"
          // Photos in profile-photos are public; let Next.js cache aggressively.
          unoptimized
        />
      </span>
    )
  }

  return (
    <span className={cls} aria-label={alt}>
      {initials || "?"}
    </span>
  )
}
