import Link from "next/link"
import Container from "./Container"

interface CTAProps {
  title: string
  description: string
  buttonText: string
  buttonLink: string
}

export default function CTA({
  title,
  description,
  buttonText,
  buttonLink,
}: CTAProps) {
  return (
    <section className="bg-[#f37021] text-white py-20">
      <Container className="text-center max-w-3xl">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">{title}</h2>
        <p className="text-lg mb-8 opacity-90">{description}</p>

        <Link
          href={buttonLink}
          className="bg-white text-[#1f3f66] px-8 py-3 font-semibold rounded hover:bg-gray-100 transition"
        >
          {buttonText}
        </Link>
      </Container>
    </section>
  )
}