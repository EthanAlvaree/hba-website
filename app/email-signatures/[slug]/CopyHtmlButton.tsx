"use client"

import { useEffect, useState } from "react"

// "Copy HTML to clipboard" button for email signatures. Reads the
// signature div from the DOM (by id="Signature") and copies its
// outerHTML. Outlook's "edit signature" dialog accepts pasted HTML.

export default function CopyHtmlButton() {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <button
      type="button"
      onClick={async () => {
        const node = document.getElementById("Signature")
        if (!node) return
        try {
          // Use ClipboardItem for rich HTML where supported; fall back
          // to plain text otherwise.
          if (typeof window !== "undefined" && "ClipboardItem" in window) {
            const html = node.outerHTML
            await navigator.clipboard.write([
              new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([node.innerText], {
                  type: "text/plain",
                }),
              }),
            ])
          } else {
            await navigator.clipboard.writeText(node.outerHTML)
          }
          setCopied(true)
        } catch (err) {
          console.error("Copy failed:", err)
        }
      }}
      className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 print:hidden"
    >
      {copied ? "Copied!" : "Copy HTML to clipboard"}
    </button>
  )
}
