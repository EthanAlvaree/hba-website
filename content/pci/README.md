# PCI content reference

Drop design briefs, copy drafts, mood notes, competitive references,
and anything else that describes **what PCI's website should be**.

Things that will be useful here:

- **Page briefs.** What each PCI page should contain — sections,
  headlines, calls-to-action, supporting content. One file per page.
  Examples: `homepage-brief.md`, `digital-art-page.md`,
  `test-prep-page.md`.

- **Voice / tone.** How PCI should sound. Examples of language to use
  and avoid. Different from HBA's voice (more boutique / specialized).

- **Design references.** Sites or specific pages whose layout or feel
  you'd like PCI to echo. Describe in text + link, or save a clipped
  screenshot under `image-originals/pci/references/`.

- **Program details.** The actual specifics of PCI's digital art
  program (publisher partnership, guest artists, portfolio reviews)
  and test prep program (SAT/ACT structure, cohort sizes, results).

- **Brand notes.** Tagline alternatives, color preferences, photography
  style, anything visual that should inform components I build.

## How I'll use it

When you ask me to build or revise a PCI page, I'll read the relevant
file(s) here and turn them into real components at
`app/_schools/pci/<Page>.tsx` — pulling images you've added to
`public/images/pci/<file>.webp`.

You can either point me at specific files ("use
`content/pci/homepage-brief.md`") or just say "build the PCI digital
art page" and I'll read whatever's relevant in this folder.
