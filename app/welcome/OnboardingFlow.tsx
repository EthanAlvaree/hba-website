// app/welcome/OnboardingFlow.tsx
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { CheckIcon } from "@heroicons/react/24/solid"
import { siteConfig } from "@/lib/site"

const ICON_BASE = "/images/new-user-setup"
const TEAMS_ICON = `${ICON_BASE}/teams.webp`
const ONENOTE_ICON = `${ICON_BASE}/onenote.webp`
const EDGE_ICON = `${ICON_BASE}/edge.webp`
const OUTLOOK_ICON = `${ICON_BASE}/outlook.webp`
const AUTH_ICON = `${ICON_BASE}/authenticator.webp`
const MICROSOFT_ICON = `${ICON_BASE}/microsoft.webp`

type Computer = "windows" | "mac" | "ipad"
type Phone = "iphone" | "android"

const STORAGE_KEY = "hba-welcome-checklist-v1"

const COMPUTER_LABELS: Record<Computer, string> = {
  windows: "Windows",
  mac: "Mac",
  ipad: "iPad",
}

const PHONE_LABELS: Record<Phone, string> = {
  iphone: "iPhone",
  android: "Android",
}

const AUTH_LINKS = {
  iphone: "https://apps.apple.com/us/app/microsoft-authenticator/id983156458",
  android: "https://play.google.com/store/apps/details?id=com.azure.authenticator",
}

const COMPUTER_APPS: Record<
  Computer,
  {
    id: string
    name: string
    description: string
    href: string
    icon: string
    note?: string
  }[]
> = {
  windows: [
    {
      id: "win-teams",
      name: "Microsoft Teams",
      description:
        "Where your classes, video calls, and class chats happen. Sign in with your school account.",
      href: "https://www.microsoft.com/microsoft-teams/download-app",
      icon: TEAMS_ICON,
    },
    {
      id: "win-onenote",
      name: "Microsoft OneNote",
      description:
        "Class notebooks live here. If OneNote is already installed with Office, you can skip this.",
      href: "https://apps.microsoft.com/detail/xpffzhvgqwwlhb",
      icon: ONENOTE_ICON,
    },
    {
      id: "win-edge",
      name: "Microsoft Edge",
      description:
        "Already built into Windows — no install needed. We recommend signing in to Edge with your school account so bookmarks and passwords sync.",
      href: "https://www.microsoft.com/edge/download",
      icon: EDGE_ICON,
      note: "Already installed on Windows",
    },
  ],
  mac: [
    {
      id: "mac-edge",
      name: "Microsoft Edge",
      description:
        "We recommend Edge for school work — sign in with your school account so bookmarks and passwords sync.",
      href: "https://www.microsoft.com/edge/download",
      icon: EDGE_ICON,
    },
    {
      id: "mac-teams",
      name: "Microsoft Teams",
      description:
        "Where your classes, video calls, and class chats happen. On Mac, download from Microsoft’s site (it’s not in the App Store).",
      href: "https://www.microsoft.com/microsoft-teams/download-app",
      icon: TEAMS_ICON,
    },
    {
      id: "mac-onenote",
      name: "Microsoft OneNote",
      description: "Class notebooks live here. Install from the Mac App Store.",
      href: "https://apps.apple.com/us/app/microsoft-onenote/id784801555",
      icon: ONENOTE_ICON,
    },
  ],
  ipad: [
    {
      id: "ipad-edge",
      name: "Microsoft Edge",
      description: "Sign in with your school account so bookmarks and passwords sync.",
      href: "https://apps.apple.com/us/app/microsoft-edge/id1288723196",
      icon: EDGE_ICON,
    },
    {
      id: "ipad-teams",
      name: "Microsoft Teams",
      description: "Where your classes, video calls, and class chats happen.",
      href: "https://apps.apple.com/us/app/microsoft-teams/id1113153706",
      icon: TEAMS_ICON,
    },
    {
      id: "ipad-onenote",
      name: "Microsoft OneNote",
      description: "Class notebooks live here.",
      href: "https://apps.apple.com/us/app/microsoft-onenote/id410395246",
      icon: ONENOTE_ICON,
    },
    {
      id: "ipad-outlook",
      name: "Microsoft Outlook",
      description: "Email and calendar.",
      href: "https://apps.apple.com/us/app/microsoft-outlook/id951937596",
      icon: OUTLOOK_ICON,
    },
  ],
}

const PHONE_APPS: Record<
  Phone,
  { id: string; name: string; description: string; href: string; icon: string }[]
> = {
  iphone: [
    {
      id: "iphone-outlook",
      name: "Microsoft Outlook",
      description: "Email and calendar.",
      href: "https://apps.apple.com/us/app/microsoft-outlook/id951937596",
      icon: OUTLOOK_ICON,
    },
    {
      id: "iphone-teams",
      name: "Microsoft Teams",
      description: "Class chats and video calls on the go.",
      href: "https://apps.apple.com/us/app/microsoft-teams/id1113153706",
      icon: TEAMS_ICON,
    },
    {
      id: "iphone-onenote",
      name: "Microsoft OneNote",
      description: "Your class notebooks, on your phone.",
      href: "https://apps.apple.com/us/app/microsoft-onenote/id410395246",
      icon: ONENOTE_ICON,
    },
  ],
  android: [
    {
      id: "android-outlook",
      name: "Microsoft Outlook",
      description: "Email and calendar.",
      href: "https://play.google.com/store/apps/details?id=com.microsoft.office.outlook",
      icon: OUTLOOK_ICON,
    },
    {
      id: "android-teams",
      name: "Microsoft Teams",
      description: "Class chats and video calls on the go.",
      href: "https://play.google.com/store/apps/details?id=com.microsoft.teams",
      icon: TEAMS_ICON,
    },
    {
      id: "android-onenote",
      name: "Microsoft OneNote",
      description: "Your class notebooks, on your phone.",
      href: "https://play.google.com/store/apps/details?id=com.microsoft.office.onenote",
      icon: ONENOTE_ICON,
    },
  ],
}

function detectOS(): { computer: Computer | null; phone: Phone | null } {
  if (typeof navigator === "undefined") return { computer: null, phone: null }
  const ua = navigator.userAgent

  let phone: Phone | null = null
  if (/iPhone/.test(ua)) phone = "iphone"
  else if (/Android/.test(ua) && /Mobile/.test(ua)) phone = "android"

  let computer: Computer | null = null
  if (/Windows/.test(ua)) computer = "windows"
  else if (/iPad/.test(ua)) computer = "ipad"
  else if (/Macintosh/.test(ua)) {
    // iPadOS 13+ reports as Mac; differentiate by touch points.
    computer = navigator.maxTouchPoints > 1 ? "ipad" : "mac"
  }

  return { computer, phone }
}

function Pill<T extends string>({
  active,
  value,
  onClick,
  children,
}: {
  active: boolean
  value: T
  onClick: (v: T) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={active}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
        active
          ? "bg-brand-navy text-white shadow-md"
          : "bg-white text-gray-600 border border-gray-200 hover:border-brand-navy hover:text-brand-navy"
      }`}
    >
      {children}
    </button>
  )
}

function CheckRow({
  id,
  checked,
  toggle,
  title,
  description,
  href,
  hrefLabel,
  note,
  icon,
  iconAlt,
}: {
  id: string
  checked: boolean
  toggle: (id: string) => void
  title: string
  description?: string
  href?: string
  hrefLabel?: string
  note?: string
  icon?: string
  iconAlt?: string
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        checked
          ? "bg-green-50/60 border-green-200"
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-pressed={checked}
          aria-label={`Mark ${title} as ${checked ? "incomplete" : "complete"}`}
          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
            checked
              ? "bg-brand-navy border-brand-navy"
              : "border-gray-300 bg-white hover:border-brand-navy"
          }`}
        >
          {checked && <CheckIcon className="w-4 h-4 text-white" />}
        </button>

        {icon && (
          <Image
            src={icon}
            alt={iconAlt ?? ""}
            width={96}
            height={96}
            className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 object-contain transition ${
              checked ? "opacity-50 grayscale" : ""
            }`}
            aria-hidden={iconAlt ? undefined : true}
          />
        )}

        <div className="flex-1 min-w-0">
          <div
            className={`font-semibold ${
              checked ? "text-gray-500 line-through" : "text-gray-900"
            }`}
          >
            {title}
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          )}
          {note && (
            <p className="mt-2 text-xs font-semibold tracking-wide uppercase text-brand-orange">
              {note}
            </p>
          )}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy hover:text-brand-orange transition"
            >
              {hrefLabel ?? "Get the app"} →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function StepHeader({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="text-center space-y-4 max-w-3xl mx-auto">
      <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
        {step}
      </div>
      <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy leading-tight">
        {title}
      </h2>
      <p className="text-lg text-gray-600 leading-relaxed font-light">
        {description}
      </p>
    </div>
  )
}

export default function OnboardingFlow() {
  const [computer, setComputer] = useState<Computer | null>(null)
  const [phone, setPhone] = useState<Phone | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [hydrated, setHydrated] = useState(false)
  const [chromeHeight, setChromeHeight] = useState(96)

  useEffect(() => {
    let saved: {
      computer?: Computer
      phone?: Phone
      checked?: Record<string, boolean>
    } = {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) saved = JSON.parse(raw)
    } catch {}

    const detected = detectOS()
    setComputer(saved.computer ?? detected.computer)
    setPhone(saved.phone ?? detected.phone)
    setChecked(saved.checked ?? {})
    setHydrated(true)
  }, [])

  useEffect(() => {
    const chrome = document.querySelector<HTMLElement>("[data-chrome]")
    if (!chrome) return
    const update = () => setChromeHeight(chrome.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(chrome)
    window.addEventListener("resize", update)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ computer, phone, checked })
      )
    } catch {}
  }, [hydrated, computer, phone, checked])

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))

  const totalSteps = 4
  const completedSteps = [
    !!checked["auth-installed"],
    !!checked["signed-in"],
    !!checked["computer-apps"],
    !!checked["phone-apps"],
  ].filter(Boolean).length
  const progressPct = Math.round((completedSteps / totalSteps) * 100)

  return (
    <>
      {/* PROGRESS BAR */}
      <div
        className="bg-white/90 backdrop-blur-md border-y border-gray-100 sticky z-30 shadow-sm print:hidden"
        style={{ top: chromeHeight }}
      >
        <div className="max-w-4xl mx-auto px-6 lg:px-12 py-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1.5">
              <span>Your progress</span>
              <span className="tabular-nums">
                {completedSteps} of {totalSteps} steps
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-orange transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: AUTHENTICATOR */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 space-y-10">
          <StepHeader
            step="Step 1 of 4"
            title="Install Microsoft Authenticator on your phone."
            description="This app sends a quick approval to your phone every time you sign in to your school account. You’ll set it up before signing in for the first time."
          />

          <div className="flex flex-wrap justify-center gap-2 print:hidden">
            <span className="text-sm text-gray-500 self-center mr-2">
              I have an
            </span>
            <Pill
              active={phone === "iphone"}
              value="iphone"
              onClick={setPhone}
            >
              iPhone
            </Pill>
            <Pill
              active={phone === "android"}
              value="android"
              onClick={setPhone}
            >
              Android
            </Pill>
          </div>

          {phone ? (
            <div className="max-w-2xl mx-auto">
              <CheckRow
                id="auth-installed"
                checked={!!checked["auth-installed"]}
                toggle={toggle}
                title={`Install Microsoft Authenticator (${PHONE_LABELS[phone]})`}
                description="On your phone, tap the link below to open the store, then install the app. You’ll come back to set it up in the next step."
                href={AUTH_LINKS[phone]}
                hrefLabel={`Open in ${
                  phone === "iphone" ? "App Store" : "Play Store"
                }`}
                icon={AUTH_ICON}
                iconAlt="Microsoft Authenticator"
              />
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Pick your phone above to see the install link.
            </p>
          )}
        </div>
      </section>

      {/* STEP 2: SIGN IN */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 space-y-10">
          <StepHeader
            step="Step 2 of 4"
            title="Sign in to your school account."
            description="Open a browser on your computer or tablet and follow these steps. Have your phone nearby — you’ll need it for the Authenticator setup."
          />

          <ol className="max-w-2xl mx-auto space-y-5">
            {[
              {
                heading: "Go to office.com",
                body: (
                  <>
                    Open any web browser and visit{" "}
                    <a
                      href="https://www.office.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-navy hover:text-brand-orange underline"
                    >
                      office.com
                    </a>
                    , then click <strong>Sign in</strong>.
                  </>
                ),
              },
              {
                heading: "Enter your username",
                body: (
                  <>
                    Your first name, last name, and the last two digits of
                    your graduation year.
                    <span className="mt-3 block bg-white border border-brand-navy/20 rounded-lg px-4 py-3 font-mono text-sm sm:text-base font-semibold text-brand-navy text-center break-words">
                      firstname.lastname.
                      <span className="text-brand-orange">YY</span>
                      <wbr />@{siteConfig.contact.emailDomain}
                    </span>
                  </>
                ),
              },
              {
                heading: "Enter your temporary password",
                body: "This was given to you by the HBA office. You’ll be asked to change it on first sign-in.",
              },
              {
                heading: "Set a new password",
                body: "Pick something you’ll remember. Write it down somewhere safe.",
              },
              {
                heading: "Set up two-step sign-in",
                body: 'When prompted, choose "Microsoft Authenticator". Open the Authenticator app on your phone, tap "+" → "Work or school account" → "Scan QR code", and point your camera at the QR code on your computer screen.',
              },
              {
                heading: "Approve the test sign-in",
                body: "Your computer will show a number. Open the notification on your phone, tap that number, and approve. You’re signed in.",
              },
            ].map((step, idx) => (
              <li key={idx} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-navy text-white font-bold text-sm flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1 pt-1">
                  <div className="font-semibold text-gray-900">
                    {step.heading}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="max-w-2xl mx-auto">
            <CheckRow
              id="signed-in"
              checked={!!checked["signed-in"]}
              toggle={toggle}
              title="I’ve signed in to my school account"
              description="If you ran into trouble, the office can help — see the bottom of this page."
              icon={MICROSOFT_ICON}
              iconAlt="Microsoft 365"
            />
          </div>
        </div>
      </section>

      {/* STEP 3: COMPUTER APPS */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 space-y-10">
          <StepHeader
            step="Step 3 of 4"
            title="Install your apps on your computer."
            description="Sign in to each app with your full school email and the new password you just set."
          />

          <div className="flex flex-wrap justify-center gap-2 print:hidden">
            <span className="text-sm text-gray-500 self-center mr-2">
              I’ll use a
            </span>
            <Pill
              active={computer === "windows"}
              value="windows"
              onClick={setComputer}
            >
              Windows PC
            </Pill>
            <Pill
              active={computer === "mac"}
              value="mac"
              onClick={setComputer}
            >
              Mac
            </Pill>
            <Pill
              active={computer === "ipad"}
              value="ipad"
              onClick={setComputer}
            >
              iPad
            </Pill>
          </div>

          {computer ? (
            <div className="max-w-2xl mx-auto space-y-4">
              {COMPUTER_APPS[computer].map((app) => (
                <CheckRow
                  key={app.id}
                  id={app.id}
                  checked={!!checked[app.id]}
                  toggle={toggle}
                  title={app.name}
                  description={app.description}
                  href={app.href}
                  hrefLabel={
                    computer === "windows"
                      ? "Download for Windows"
                      : computer === "mac"
                      ? "Download for Mac"
                      : "Open in App Store"
                  }
                  note={app.note}
                  icon={app.icon}
                  iconAlt={app.name}
                />
              ))}

              {(computer === "windows" || computer === "mac") && (
                <div className="bg-brand-navy/5 border border-brand-navy/15 rounded-2xl p-5 text-sm text-gray-700 leading-relaxed">
                  <p className="font-semibold text-brand-navy mb-1">
                    A note about email on your{" "}
                    {computer === "windows" ? "PC" : "Mac"}
                  </p>
                  <p>
                    Your student license doesn’t include the desktop Outlook
                    app. For email on your computer, just go to{" "}
                    <a
                      href="https://outlook.office.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-navy hover:text-brand-orange underline"
                    >
                      outlook.office.com
                    </a>{" "}
                    in your browser — it works exactly like the desktop app.
                    You’ll also install Outlook on your phone in Step 4.
                  </p>
                </div>
              )}

              <div className="pt-4">
                <CheckRow
                  id="computer-apps"
                  checked={!!checked["computer-apps"]}
                  toggle={toggle}
                  title="I’ve installed my computer apps"
                  description="Make sure each one is signed in with your school account."
                />
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Pick your computer above to see the install links.
            </p>
          )}
        </div>
      </section>

      {/* STEP 4: PHONE APPS */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 space-y-10">
          <StepHeader
            step="Step 4 of 4"
            title="Install your apps on your phone."
            description="Authenticator is already done. These three keep you in the loop when you’re away from your computer."
          />

          <div className="flex flex-wrap justify-center gap-2 print:hidden">
            <span className="text-sm text-gray-500 self-center mr-2">
              I have an
            </span>
            <Pill
              active={phone === "iphone"}
              value="iphone"
              onClick={setPhone}
            >
              iPhone
            </Pill>
            <Pill
              active={phone === "android"}
              value="android"
              onClick={setPhone}
            >
              Android
            </Pill>
          </div>

          {phone ? (
            <div className="max-w-2xl mx-auto space-y-4">
              {PHONE_APPS[phone].map((app) => (
                <CheckRow
                  key={app.id}
                  id={app.id}
                  checked={!!checked[app.id]}
                  toggle={toggle}
                  title={app.name}
                  description={app.description}
                  href={app.href}
                  hrefLabel={`Open in ${
                    phone === "iphone" ? "App Store" : "Play Store"
                  }`}
                  icon={app.icon}
                  iconAlt={app.name}
                />
              ))}

              <div className="pt-4">
                <CheckRow
                  id="phone-apps"
                  checked={!!checked["phone-apps"]}
                  toggle={toggle}
                  title="I’ve installed my phone apps"
                  description="Sign in to each one with your school account."
                />
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Pick your phone above to see the install links.
            </p>
          )}
        </div>
      </section>

      {/* DONE */}
      <section className="py-24 bg-brand-navy relative overflow-hidden">
        <div className="reveal relative max-w-3xl mx-auto px-6 lg:px-12 text-center text-white space-y-6">
          {progressPct === 100 ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-orange mb-2">
                <CheckIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold">
                You’re all set.
              </h2>
              <p className="text-lg text-white/85 leading-relaxed font-light">
                Welcome to High Bluff Academy. If anything ever needs verifying,
                just open Authenticator on your phone and approve. We’ll see you
                in Teams.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl lg:text-4xl font-extrabold">
                Almost there.
              </h2>
              <p className="text-lg text-white/85 leading-relaxed font-light">
                Finish the steps above and you’ll be ready for class. Your
                progress is saved on this device, so you can come back to this
                page anytime.
              </p>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-4 pt-4 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-brand-navy font-semibold text-sm hover:bg-gray-100 transition"
            >
              Print this page
            </button>
            {Object.values(checked).some(Boolean) && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "Reset your progress on this device? This won’t affect your account."
                    )
                  ) {
                    setChecked({})
                  }
                }}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition"
              >
                Reset progress
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
