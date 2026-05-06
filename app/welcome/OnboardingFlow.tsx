// app/welcome/OnboardingFlow.tsx
"use client"

import { useEffect, useState } from "react"
import { CheckIcon } from "@heroicons/react/24/solid"

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
  { id: string; name: string; description: string; href: string; note?: string }[]
> = {
  windows: [
    {
      id: "win-teams",
      name: "Microsoft Teams",
      description:
        "Where your classes, video calls, and class chats happen. Sign in with your school account.",
      href: "https://www.microsoft.com/microsoft-teams/download-app",
    },
    {
      id: "win-onenote",
      name: "Microsoft OneNote",
      description:
        "Class notebooks live here. If OneNote is already installed with Office, you can skip this.",
      href: "https://apps.microsoft.com/detail/xpffzhvgqwwlhb",
    },
    {
      id: "win-edge",
      name: "Microsoft Edge",
      description:
        "Already built into Windows — no install needed. We recommend signing in to Edge with your school account so bookmarks and passwords sync.",
      href: "https://www.microsoft.com/edge/download",
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
    },
    {
      id: "mac-teams",
      name: "Microsoft Teams",
      description:
        "Where your classes, video calls, and class chats happen. On Mac, download from Microsoft’s site (it’s not in the App Store).",
      href: "https://www.microsoft.com/microsoft-teams/download-app",
    },
    {
      id: "mac-onenote",
      name: "Microsoft OneNote",
      description: "Class notebooks live here. Install from the Mac App Store.",
      href: "https://apps.apple.com/us/app/microsoft-onenote/id784801555",
    },
  ],
  ipad: [
    {
      id: "ipad-edge",
      name: "Microsoft Edge",
      description: "Sign in with your school account so bookmarks and passwords sync.",
      href: "https://apps.apple.com/us/app/microsoft-edge/id1288723196",
    },
    {
      id: "ipad-teams",
      name: "Microsoft Teams",
      description: "Where your classes, video calls, and class chats happen.",
      href: "https://apps.apple.com/us/app/microsoft-teams/id1113153706",
    },
    {
      id: "ipad-onenote",
      name: "Microsoft OneNote",
      description: "Class notebooks live here.",
      href: "https://apps.apple.com/us/app/microsoft-onenote/id410395246",
    },
    {
      id: "ipad-outlook",
      name: "Microsoft Outlook",
      description: "Email and calendar.",
      href: "https://apps.apple.com/us/app/microsoft-outlook/id951937596",
    },
  ],
}

const PHONE_APPS: Record<
  Phone,
  { id: string; name: string; description: string; href: string }[]
> = {
  iphone: [
    {
      id: "iphone-outlook",
      name: "Microsoft Outlook",
      description: "Email and calendar.",
      href: "https://apps.apple.com/us/app/microsoft-outlook/id951937596",
    },
    {
      id: "iphone-teams",
      name: "Microsoft Teams",
      description: "Class chats and video calls on the go.",
      href: "https://apps.apple.com/us/app/microsoft-teams/id1113153706",
    },
    {
      id: "iphone-onenote",
      name: "Microsoft OneNote",
      description: "Your class notebooks, on your phone.",
      href: "https://apps.apple.com/us/app/microsoft-onenote/id410395246",
    },
  ],
  android: [
    {
      id: "android-outlook",
      name: "Microsoft Outlook",
      description: "Email and calendar.",
      href: "https://play.google.com/store/apps/details?id=com.microsoft.office.outlook",
    },
    {
      id: "android-teams",
      name: "Microsoft Teams",
      description: "Class chats and video calls on the go.",
      href: "https://play.google.com/store/apps/details?id=com.microsoft.teams",
    },
    {
      id: "android-onenote",
      name: "Microsoft OneNote",
      description: "Your class notebooks, on your phone.",
      href: "https://play.google.com/store/apps/details?id=com.microsoft.office.onenote",
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
          ? "bg-[#1f3f66] text-white shadow-md"
          : "bg-white text-gray-600 border border-gray-200 hover:border-[#1f3f66] hover:text-[#1f3f66]"
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
}: {
  id: string
  checked: boolean
  toggle: (id: string) => void
  title: string
  description?: string
  href?: string
  hrefLabel?: string
  note?: string
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
              ? "bg-[#1f3f66] border-[#1f3f66]"
              : "border-gray-300 bg-white hover:border-[#1f3f66]"
          }`}
        >
          {checked && <CheckIcon className="w-4 h-4 text-white" />}
        </button>

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
            <p className="mt-2 text-xs font-semibold tracking-wide uppercase text-[#f37021]">
              {note}
            </p>
          )}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1f3f66] hover:text-[#f37021] transition"
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
      <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
        {step}
      </div>
      <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66] leading-tight">
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
                className="h-full bg-[#f37021] transition-all duration-500"
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
                      className="font-semibold text-[#1f3f66] hover:text-[#f37021] underline"
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
                    Use the format{" "}
                    <span className="font-mono text-[#1f3f66]">
                      firstname.lastname.YY@highbluffacademy.com
                    </span>
                    .
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
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1f3f66] text-white font-bold text-sm flex items-center justify-center">
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
                />
              ))}

              {(computer === "windows" || computer === "mac") && (
                <div className="bg-[#1f3f66]/5 border border-[#1f3f66]/15 rounded-2xl p-5 text-sm text-gray-700 leading-relaxed">
                  <p className="font-semibold text-[#1f3f66] mb-1">
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
                      className="font-semibold text-[#1f3f66] hover:text-[#f37021] underline"
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
      <section className="py-24 bg-[#1f3f66] relative overflow-hidden">
        <div className="reveal relative max-w-3xl mx-auto px-6 lg:px-12 text-center text-white space-y-6">
          {progressPct === 100 ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f37021] mb-2">
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
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#1f3f66] font-semibold text-sm hover:bg-gray-100 transition"
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
