interface PageHeroProps {
  title: string
  image: string
}

export default function PageHero({ title, image }: PageHeroProps) {
  return (
    <div
      className="h-[420px] bg-cover bg-center flex items-end"
      style={{ backgroundImage: `url(${image})` }}
    >
      <div className="bg-black/40 w-full p-10">
        <h1 className="text-white text-5xl font-serif">
          {title}
        </h1>
      </div>
    </div>
  )
}
