interface PageHeroProps {
  title: string
  image: string
}

export default function PageHero({ title, image }: PageHeroProps) {
  return (
    <div
      className="h-[500px] bg-cover bg-center flex items-center justify-center text-center relative"
      /* Fixed syntax with backticks and quotes */
      style={{ backgroundImage: `url("${image}")` }}
    >
      <div className="absolute inset-0 bg-black/50" /> {/* Dark overlay for text readability */}
      <h1 className="relative text-white text-6xl font-serif z-10 px-4">
        {title}
      </h1>
    </div>
  )
}