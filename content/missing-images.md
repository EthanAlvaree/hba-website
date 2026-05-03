# Missing image references

Every page-level image path that is referenced in the codebase but does not yet exist in `public/`. Grouped by page in source order. Drop the real photo at the listed path and the page will pick it up — no code changes required (with one exception, called out below).

The `public/` images that *do* exist today are:

- `public/images/campus.png`, `campus-hero.png`
- `public/images/hba-logo.png`, `hba-logo-round.png`
- `public/images/wasc.png`, `wasc-round.png`, `uc.png`
- `public/images/faculty/*.jpg` — all faculty headshots and 4 `leadership-*.jpg` thumbnails

Everything below is missing.

---

## `app/about/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/mission.jpg` | "Our mission" feature image — students collaborating in class, conveying engagement and mentorship |
| `public/images/students.jpg` | Background image for the "Our students" glassmorphism section — a wide shot of a diverse group of students |
| `public/images/campus.jpg` | "The campus" feature image — exterior shot of the Rancho Santa Fe campus (note: `campus.png` exists but page asks for `.jpg`) |

## `app/about/leadership/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/leadership-hero.jpg` | Leadership page hero — Head of School / leadership team at the school. |

## `app/calendar/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/calendar/calendar-hero.jpg` | Calendar page hero — campus during a recognizable season, or an image evocative of school year rhythm |
| `public/images/calendar/calendar-bg.jpg` | Tinted background for the categories section — broad campus shot |
| `public/images/calendar/calendar-summer.jpg` | Summer 2026 callout image — students in a summer class context |

## `app/community/parents/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/community/parents-hero.jpg` | Parents page hero — parents at a school event or family meeting with faculty |
| `public/images/community/parents-meeting.jpg` | Tinted background — parent-teacher conference or family welcome event |
| `public/images/community/parents-involved.jpg` | "Be part of the school" panel — parent volunteering, chaperoning, or attending a school event |

## `app/community/alumni/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/community/alumni-hero.jpg` | Alumni page hero — graduation moment or alumni gathering |
| `public/images/community/alumni-reunion.jpg` | Stay-connected panel — alumni event, gathering, or reunion |
| `public/images/community/alumni-mentor.jpg` | Tinted background for "Give back" — alumnus speaking to or mentoring current students |

## `app/community/store/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/community/store-hero.jpg` | Store page hero — students wearing HBA gear, or a clean product layout |
| `public/images/community/store-apparel.jpg` | Apparel category — folded hoodies/tees in school colors |
| `public/images/community/store-spirit.jpg` | Spirit category — students with banners/scarves at a game day |
| `public/images/community/store-accessories.jpg` | Accessories category — water bottles, bags, stickers, notebooks |
| `public/images/community/store-bg.jpg` | Tinted background — atmospheric shot of HBA branded gear |

## `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/accessibility/page.tsx`, `app/nondiscrimination/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/policy-hero.jpg` | Shared hero across all four policy pages — clean, calm campus shot or architectural detail. One image serves all four. |

## `app/admissions/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/admissions-hero.jpg` | Admissions page hero — welcoming campus moment, e.g. a family touring or admissions staff greeting visitors |
| `public/images/admissions-family.jpg` | Side panel — a family meeting with admissions staff |
| `public/images/tuition-bg.jpg` | Tinted background for the tuition section — campus architecture or quiet academic detail |
| `public/images/visit-campus.jpg` | "See HBA in person" panel — exterior or entrance shot of campus during a tour |

## `app/community/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/community/community-hero.jpg` | Community page hero — students engaged in a group/service activity |
| `public/images/community/service.jpg` | "Giving back, growing forward" — students at a community service event |
| `public/images/community/advisory.jpg` | Used twice (background + foreground) — a teacher meeting one-on-one with a student in advisory |
| `public/images/community/nhs.jpg` | National Honor Society — induction ceremony or NHS members in uniform/at an event |
| `public/images/community/partnerships.jpg` | Community partnerships — students at a partner organization or off-campus learning experience |
| `public/images/community/volunteering.jpg` | Background for the volunteering section — students volunteering, ideally outdoors |

## `app/contact/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/contact/contact-hero.jpg` | Contact page hero — friendly office staff or a welcoming campus shot |
| `public/images/contact/contact-map.jpg` | A static map graphic showing the Rancho Santa Fe area (no exact address pin) |

## `app/faculty/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/faculty/faculty-hero.jpg` | Faculty page hero — a wide shot of teachers together, or a teacher in front of a class |

## `app/programs/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/programs-hero.jpg` | Programs page hero — students in a focused academic setting (lab, classroom discussion) |
| `public/images/courses.jpg` | "Strong academic foundation" feature image — students engaged in class discussion |
| `public/images/ap-courses.jpg` | Background for the AP section — student studying at a desk, books/laptop visible |
| `public/images/areas-study.jpg` | "Pathways for every learner" — a STEM or arts moment showing breadth of disciplines |
| `public/images/summer-programs.jpg` | Summer programs banner on this page — students in a summer class context |
| `public/images/online-programs.jpg` | Online & hybrid learning panel — student on a laptop in a hybrid setup |

## `app/student-life/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/studentlife-hero.jpg` | Student life page hero — students in a vibrant, social/community moment |
| `public/images/asb.jpg` | Associated Student Body — student leaders organizing an event |
| `public/images/mun.jpg` | Used twice — Model UN students debating or holding placards at a conference |
| `public/images/athletics.jpg` | Athletics — students during a sport or training session |
| `public/images/fitness.jpg` | Joy of Life Fitness partnership — students in a Pilates / weight training / yoga class |
| `public/images/events.jpg` | Background for the events section — a school spirit moment, rally, or celebration |
| `public/images/fieldtrips.jpg` | Field trips — students at the San Diego Zoo or another off-campus location |

## `app/summer-programs/page.tsx`

| Path | What it should depict |
| --- | --- |
| `public/images/summer/summer-hero.jpg` | Summer programs hero — students in a summer-feeling academic setting |
| `public/images/summer/summer-class.jpg` | "High-impact academic classes" — small group class in session |
| `public/images/summer/summer-math.jpg` | Math thumbnail — whiteboard with equations, or students working through math problems |
| `public/images/summer/summer-lab.jpg` | Science thumbnail — students at a lab bench, microscope, or experiment |
| `public/images/summer/summer-writing.jpg` | English thumbnail — student writing or reading, or a writing-workshop moment |
| `public/images/summer/summer-students.jpg` | Social science thumbnail — students discussing or presenting |
| `public/images/summer/summer-flex.jpg` | Used twice (electives card + flexible-learning section) — student working independently in a flexible/hybrid setting |
| `public/images/summer/summer-campus.jpg` | Electives thumbnail — campus exterior or art/elective in progress |
