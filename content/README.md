# `content/` — per-tenant reference material

Where humans drop design briefs, copy drafts, mood boards (as text /
markdown notes), competitive analyses, brand guidelines, or anything
else that informs the **content** of a tenant's website (separate from
the **code** that renders it).

Mirrors the symmetric tenant layout used elsewhere:

```
content/
  hba/      ← HBA design notes, copy drafts, etc. (empty for now —
              HBA's content was written into pages directly)
  pci/      ← PCI reference material — drop briefs / mood notes /
              competitive examples / sample copy here
  shared/   ← Anything that applies to both (style guides, voice
              guidelines, design principles)
```

## How to use it

This folder is **not** read at runtime — nothing here ships in the
build. It's purely a place for Markdown / text files / image
references that I (Claude) can read when you ask me to build or
revise a page.

**Workflow:**

1. Drop a file (e.g. `content/pci/homepage-brief.md`) describing what
   you want.
2. Ask me to build it: "Use `content/pci/homepage-brief.md` to write
   the PCI home page."
3. I read the brief and write the actual code at
   `app/_schools/pci/HomePage.tsx`.

**File formats that work well:**

- **Markdown** for prose / structured briefs / page outlines.
- **Plain text** if simpler.
- **Image references** — describe the visual reference in text and put
  the image at `image-originals/pci/<name>.jpg`. (I can't see images
  with file extensions until you point me at a path.)

## What this is NOT

- Not for build-time data. If something needs to be queryable at
  runtime, it lives in the database (e.g. `faculty_bios`) or in a
  TypeScript module under `lib/`.
- Not for assets that ship to the browser. Those go in
  `public/images/<tenant>/`.

## Naming

Lowercase-hyphenated filenames keep the directory listing readable:
`homepage-brief.md`, `tone-and-voice.md`, `programs-page-outline.md`,
`competitive-analysis.md`, etc.
