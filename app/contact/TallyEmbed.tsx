"use client"

import Script from "next/script"

export default function TallyEmbed() {
  return (
    <>
      <div className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <iframe
          data-tally-src="https://tally.so/embed/OD8P67?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1&source=contact-page"
          loading="lazy"
          width="100%"
          height="600"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          title="Contact High Bluff Academy"
        ></iframe>
      </div>

      <Script
        src="https://tally.so/widgets/embed.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof (window as any).Tally !== "undefined") {
            (window as any).Tally.loadEmbeds()
          }
        }}
      />
    </>
  )
}
