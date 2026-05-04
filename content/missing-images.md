# Missing image references

Image paths referenced by pages but not yet present on disk. Drop a file at the
listed path and the page will pick it up automatically — no code changes needed.

## Image folder layout

All images live under `public/images/`, organized by page:

```
public/images/
├── _unsorted/      gitignored — local-only working folder for raw uploads
├── about/          /about
├── admissions/     /admissions, /admissions/international
├── athletics/      /student-life/athletics
├── brand/          logos & accreditation seals (header + footer)
├── calendar/       /calendar
├── college-acceptances/  /about/college-acceptances
├── community/      /community, /community/parents, /community/alumni, /community/store
├── contact/        /contact
├── faculty/        /faculty
├── home/           homepage hero + footer campus shot
├── leadership/     /about/leadership
├── online/         /programs/online
├── partnerships/   /community/partnerships
├── policies/       /privacy, /terms, /accessibility, /nondiscrimination
├── programs/       /programs
├── reviews/        /reviews
├── student-life/   /student-life
├── summer/         /summer-programs
└── transcripts/    /transcripts
```

## Currently missing

None — all referenced images are present on disk. Add new entries here if a
page references a file that hasn't been added yet.

## Optional (not blocking)

Pages with tagged "Coming soon" content that intentionally use placeholder
images until announcements are made:

| Path | What it should depict |
| --- | --- |
| `public/images/partnerships/dining.webp` | Replace once the catering partner is confirmed — a fresh prepared meal, lunch line, or restaurant kitchen |
