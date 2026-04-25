interface PageHeroProps {
  title: string
  image: string
}

export default function PageHero({ title, image }: PageHeroProps) {
  return (
    <div
      className="h-[420px] bg-cover bg-center flex items-center justify-center text-center relative"
      style={{ backgroundImage: `url("${image}")` }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <h1 className="relative text-white text-5xl font-serif z-10 px-4">
        {title}
      </h1>
    </div>
  )
}


