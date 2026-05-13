// HBA email signature template. Renders the full inline-styled HTML
// table the way Outlook + Gmail want it. All school-level data flows
// in from siteConfig so the same template trivially rebrands for PCI.
//
// The photo URL is the dynamic /api/email-signatures/photo/<email>
// endpoint, so every signature ever sent renders the current SIS
// photo. This is the piece that makes the three-system sync work
// (M365 ↔ SIS ↔ this signature).

import { siteConfig } from "@/lib/site"

export type SignatureProps = {
  /** Display name, e.g. "Ethan J Alvarée". */
  name: string
  /** Optional pronouns, e.g. "(they/them)". Omit if not provided. */
  pronouns?: string
  /** Title line(s). Rendered with whitespace-preserved line breaks. */
  title: string
  /** HBA email address — used for the photo URL, Teams deeplink, and
   *  the contact email row. */
  email: string
}

export default function SignatureTemplate({
  name,
  pronouns,
  title,
  email,
}: SignatureProps) {
  const photoUrl = `${siteConfig.url}/api/email-signatures/photo/${encodeURIComponent(email)}`
  const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`
  const logoUrl = `${siteConfig.url}/email-signatures/images/high_bluff_academy_wide_transparent.png`
  const iconBase = `${siteConfig.url}/email-signatures/images/icons`

  return (
    <div
      id="Signature"
      style={{
        fontFamily: "Calibri, Helvetica, sans-serif",
        fontSize: "11pt",
        color: "#000",
      }}
    >
      <table
        style={{
          width: "500px",
          backgroundColor: "#fff",
          color: "rgb(72,95,133)",
          borderCollapse: "collapse",
        }}
      >
        <tbody>
          <tr>
            {/* LEFT COLUMN */}
            <td
              style={{
                paddingRight: "20px",
                borderRight: "1.5px solid #c5cede",
                verticalAlign: "middle",
                textAlign: "center",
              }}
            >
              <table style={{ width: "223px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: "10px" }}>
                      <img
                        src={photoUrl}
                        alt={name}
                        width={87}
                        style={{
                          width: "87px",
                          borderRadius: "50%",
                          display: "block",
                          margin: "0 auto",
                        }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        lineHeight: "22.5px",
                        color: "#000",
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      <span style={{ fontSize: "17.7px", fontWeight: 600 }}>
                        {name}
                        <br />
                      </span>
                      {pronouns && (
                        <span style={{ fontSize: "11pt", fontWeight: 600 }}>
                          {pronouns}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        lineHeight: "16.1px",
                        paddingTop: "5px",
                        color: "#000",
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12.6px",
                          fontWeight: 200,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {title}
                        {"\nat "}
                        {siteConfig.name}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: "12px" }}>
                      <a
                        href={teamsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        <table
                          cellPadding={0}
                          cellSpacing={0}
                          style={{
                            borderCollapse: "separate",
                            borderSpacing: 0,
                            border: "1.5px solid #c5cede",
                            borderRadius: "999px",
                            background: "#ffffff",
                            width: "207px",
                            boxShadow: "0 2px 6px rgba(72,95,133,.14)",
                          }}
                        >
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  padding: "6px 6px 6px 11px",
                                  verticalAlign: "middle",
                                }}
                              >
                                <img
                                  src={`${iconBase}/teams.png`}
                                  alt="Microsoft Teams"
                                  width={24}
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    display: "block",
                                    border: 0,
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "6px 13px 6px 5px",
                                  verticalAlign: "middle",
                                  fontFamily: "'Courier New', monospace",
                                  fontSize: "11px",
                                  color: "#485f85",
                                  whiteSpace: "nowrap",
                                  fontWeight: 600,
                                  letterSpacing: ".1px",
                                }}
                              >
                                Chat me on Microsoft Teams
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

            {/* RIGHT COLUMN */}
            <td
              style={{
                paddingLeft: "20px",
                verticalAlign: "middle",
                textAlign: "center",
              }}
            >
              <table
                style={{
                  width: "233px",
                  borderCollapse: "collapse",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12.6px",
                  color: "#000",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: "5px" }}>
                      {siteConfig.contact.phone}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingBottom: "5px" }}>{email}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingBottom: "5px" }}>
                      <a
                        href={siteConfig.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: "none",
                          color: "rgb(72,95,133)",
                        }}
                      >
                        www.{siteConfig.domain}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: "5px" }}>
                      {siteConfig.address.streetLine1}
                      <br />
                      {siteConfig.address.locality},{" "}
                      {siteConfig.address.regionCode}{" "}
                      {siteConfig.address.postalCode}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: "10px" }}>
                      <a
                        href={siteConfig.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={logoUrl}
                          alt={`${siteConfig.name} Logo`}
                          width={165}
                          style={{
                            width: "165px",
                            height: "auto",
                            display: "block",
                            margin: "0 auto",
                          }}
                        />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingTop: "15px" }}>
                      <SocialIconRow iconBase={iconBase} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function SocialIconRow({ iconBase }: { iconBase: string }) {
  const { social } = siteConfig
  const icons: Array<{ href: string; alt: string; src: string }> = []
  if (social.facebook)
    icons.push({
      href: social.facebook.url,
      alt: "Facebook",
      src: `${iconBase}/facebook.png`,
    })
  if (social.instagram)
    icons.push({
      href: social.instagram.url,
      alt: "Instagram",
      src: `${iconBase}/instagram.png`,
    })
  if (social.tiktok)
    icons.push({
      href: social.tiktok.url,
      alt: "TikTok",
      src: `${iconBase}/tiktok.png`,
    })
  if (social.youtube)
    icons.push({
      href: social.youtube.url,
      alt: "YouTube",
      src: `${iconBase}/youtube.png`,
    })
  if (social.linkedin)
    icons.push({
      href: social.linkedin.url,
      alt: "LinkedIn",
      src: `${iconBase}/linkedin.png`,
    })
  if (social.yelp)
    icons.push({
      href: social.yelp.url,
      alt: "Yelp",
      src: `${iconBase}/yelp.png`,
    })

  return (
    <table align="center" style={{ borderCollapse: "collapse" }}>
      <tbody>
        <tr>
          {icons.map((icon, i) => (
            <td
              key={icon.alt}
              style={{ paddingRight: i === icons.length - 1 ? "0" : "8px" }}
            >
              <a href={icon.href} target="_blank" rel="noopener noreferrer">
                <img
                  src={icon.src}
                  alt={icon.alt}
                  width={24}
                  style={{
                    width: "24px",
                    height: "24px",
                    display: "block",
                    border: 0,
                  }}
                />
              </a>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}
