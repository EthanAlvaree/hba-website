#!/usr/bin/env python3
"""
Regenerate the per-person HTML files served at signatures.highbluffacademy.com.

Run from the repo root:

    python scripts/gen-email-signatures.py

Outputs one file per faculty member into public/email-signatures/signatures/.
"""
import os

BASE = 'https://signatures.highbluffacademy.com'
OUT_DIR = os.path.join('public', 'email-signatures', 'signatures')

faculty = [
    {'slug':'ethan-alvaree',    'name':'Ethan J Alvarée',     'pronouns':'they/them', 'photo_ext':'png',
     'title_html':'Director of Instruction<br>and Curriculum at<br>High Bluff Academy',    'email_prefix':'ethan'},
    {'slug':'kun-xuan',         'name':'Kun Xuan',                 'pronouns':'he/him',   'photo_ext':'jpg',
     'title_html':'Head of School at<br>High Bluff Academy',                              'email_prefix':'kun'},
    {'slug':'george-humphreys', 'name':'George Humphreys',         'pronouns':'he/him',   'photo_ext':'jpg',
     'title_html':'Director &amp; Principal at<br>High Bluff Academy',                   'email_prefix':'george'},
    {'slug':'molly-sun',        'name':'Molly Sun',                'pronouns':'she/her',  'photo_ext':'jpg',
     'title_html':'Director of Admissions &amp;<br>Operations at<br>High Bluff Academy', 'email_prefix':'molly'},
    {'slug':'kristin-oconnor',  'name':"Kristin O’Connor",    'pronouns':'she/her',  'photo_ext':'jpg',
     'title_html':'Office Manager &amp;<br>Student Activities<br>Coordinator at HBA',    'email_prefix':'kristin'},
    {'slug':'ishaan-mishra',    'name':'Ishaan Mishra',            'pronouns':'he/him',   'photo_ext':'jpg',
     'title_html':'Academic &amp; College<br>Counselor at<br>High Bluff Academy',        'email_prefix':'ishaan'},
    {'slug':'ellen-sullivan',   'name':'Ellen Sullivan',           'pronouns':'she/her',  'photo_ext':'jpg',
     'title_html':'English Department Chair<br>at High Bluff Academy',                   'email_prefix':'ellen'},
    {'slug':'alan-saltamachio', 'name':'Alan Saltamachio',         'pronouns':'he/him',   'photo_ext':'png',
     'title_html':'Biology &amp; Environmental<br>Science Teacher at<br>High Bluff Academy','email_prefix':'alan'},
    {'slug':'fran-dickson',     'name':'Fran Dickson',             'pronouns':'she/her',  'photo_ext':'jpg',
     'title_html':'Spanish Department Chair<br>at High Bluff Academy',                   'email_prefix':'fran'},
    {'slug':'tricia-tigli',     'name':'Tricia Tigli',             'pronouns':'she/her',  'photo_ext':'jpg',
     'title_html':'French &amp; ESL Teacher at<br>High Bluff Academy',                  'email_prefix':'tricia'},
    {'slug':'kris-bunce',       'name':'Kris Bunce',               'pronouns':'she/her',  'photo_ext':'jpg',
     'title_html':'Math &amp; Science Teacher<br>at High Bluff Academy',                 'email_prefix':'kris'},
    {'slug':'will-anderson',    'name':'Will Anderson, Ph.D.',     'pronouns':'he/him',   'photo_ext':'jpg',
     'title_html':'Science Teacher at<br>High Bluff Academy',                            'email_prefix':'will'},
    {'slug':'lindy-benson',     'name':'Lindy Benson',             'pronouns':'she/her',  'photo_ext':'jpg',
     'title_html':'Economics Teacher at<br>High Bluff Academy',                          'email_prefix':'lindy'},
    {'slug':'judy-beck',        'name':'Judy Beck',                'pronouns':'she/her',  'photo_ext':'jpg',
     'title_html':'Studio Art Teacher at<br>High Bluff Academy',                         'email_prefix':'judy'},
]

SOCIAL_ICONS = '''
              <!-- Social Icons -->
              <tr>
                <td style="padding-top:15px;">
                  <table align="center" style="border-collapse:collapse;">
                    <tbody>
                      <tr>
                        <!-- Facebook -->
                        <td style="padding-right:8px;">
                          <a href="https://www.facebook.com/highbluffacademysandiego" target="_blank">
                            <img src="{BASE}/images/icons/facebook.png" alt="Facebook" width="24" style="width:24px; height:24px; display:block; border:0;">
                          </a>
                        </td>
                        <!-- Instagram -->
                        <td style="padding-right:8px;">
                          <a href="https://www.instagram.com/highbluffacademy" target="_blank">
                            <img src="{BASE}/images/icons/instagram.png" alt="Instagram" width="24" style="width:24px; height:24px; display:block; border:0;">
                          </a>
                        </td>
                        <!-- TikTok -->
                        <td style="padding-right:8px;">
                          <a href="https://www.tiktok.com/@highbluffacademy" target="_blank">
                            <img src="{BASE}/images/icons/tiktok.png" alt="TikTok" width="24" style="width:24px; height:24px; display:block; border:0;">
                          </a>
                        </td>
                        <!-- YouTube -->
                        <td style="padding-right:8px;">
                          <a href="https://www.youtube.com/channel/UCBnvACwf375sxhefzTZOlog" target="_blank">
                            <img src="{BASE}/images/icons/youtube.png" alt="YouTube" width="24" style="width:24px; height:24px; display:block; border:0;">
                          </a>
                        </td>
                        <!-- LinkedIn -->
                        <td style="padding-right:8px;">
                          <a href="https://www.linkedin.com/school/highbluffacademy" target="_blank">
                            <img src="{BASE}/images/icons/linkedin.png" alt="LinkedIn" width="24" style="width:24px; height:24px; display:block; border:0;">
                          </a>
                        </td>
                        <!-- Yelp -->
                        <td>
                          <a href="https://www.yelp.com/biz/high-bluff-academy-rancho-santa-fe" target="_blank">
                            <img src="{BASE}/images/icons/yelp.png" alt="Yelp" width="24" style="width:24px; height:24px; display:block; border:0;">
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>'''.replace('{BASE}', BASE)


def make_sig(p):
    email     = p['email_prefix'] + '@highbluffacademy.com'
    teams_url = 'https://teams.microsoft.com/l/chat/0/0?users=' + email
    photo_url = BASE + '/images/faculty/' + p['slug'] + '.' + p['photo_ext']
    cn = "'Courier New', monospace"

    html = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Email Signature - ''' + p['name'] + '''</title>
  <style>
    body {
      font-family: Calibri, Arial, Helvetica, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
  </style>
</head>

<body>
<div id="Signature" style="font-family: Calibri, Helvetica, sans-serif; font-size: 11pt; color: #000;">

  <!-- Main Signature Table -->
  <table style="width: 500px; background-color: #fff; color: rgb(72,95,133); border-collapse: collapse;">
    <tbody>
      <tr>

        <!-- LEFT COLUMN -->
        <td style="padding-right: 20px; border-right: 1.5px solid #c5cede; vertical-align: middle; text-align: center;">
          <table style="width: 223px; border-collapse: collapse;">
            <tbody>

              <!-- Profile Photo -->
              <tr>
                <td style="padding-bottom: 10px;">
                  <img src="''' + photo_url + '''"
                       alt="''' + p['name'] + '''"
                       width="87"
                       style="width:87px; border-radius:50%; display:block; margin:0 auto;">
                </td>
              </tr>

              <!-- Name + Pronouns -->
              <tr>
                <td style="line-height: 22.5px; color:#000; font-family:''' + cn + ''';">
                  <span style="font-size:17.7px; font-weight:600;">''' + p['name'] + '''<br></span>
                  <span style="font-size:11pt; font-weight:600;">(''' + p['pronouns'] + ''')</span>
                </td>
              </tr>

              <!-- Title -->
              <tr>
                <td style="line-height:16.1px; padding-top:5px; color:#000; font-family:''' + cn + ''';">
                  <span style="font-size:12.6px; font-weight:200;">
                    ''' + p['title_html'] + '''
                  </span>
                </td>
              </tr>

              <!-- Teams Chat Button -->
              <tr>
                <td style="padding-top:12px;">
                  <a href="''' + teams_url + '''" target="_blank" style="text-decoration:none; display:inline-block;">
                    <table cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0; border:1.5px solid #c5cede; border-radius:999px; background:#ffffff; width:207px; box-shadow:0 2px 6px rgba(72,95,133,.14);">
                      <tbody>
                        <tr>
                          <td style="padding:6px 6px 6px 11px; vertical-align:middle;">
                            <img src="''' + BASE + '''/images/icons/teams.png" alt="Microsoft Teams" width="24" style="width:24px; height:24px; display:block; border:0;">
                          </td>
                          <td style="padding:6px 13px 6px 5px; vertical-align:middle; font-family:''' + cn + '''; font-size:11px; color:#485f85; white-space:nowrap; font-weight:600; letter-spacing:.1px;">
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

        <!-- RIGHT COLUMN -->
        <td style="padding-left: 20px; vertical-align: middle; text-align: center;">
          <table style="width:233px; border-collapse:collapse; font-family:''' + cn + '''; font-size:12.6px; color:#000;">
            <tbody>

              <!-- Contact Info -->
              <tr><td style="padding-bottom:5px;">+1 (858) 509-9101</td></tr>
              <tr><td style="padding-bottom:5px;">''' + email + '''</td></tr>
              <tr>
                <td style="padding-bottom:5px;">
                  <a href="https://www.highbluffacademy.com"
                     target="_blank"
                     style="text-decoration:none; color:rgb(72,95,133);">
                    www.highbluffacademy.com
                  </a>
                </td>
              </tr>

              <!-- Address -->
              <tr>
                <td style="padding-top:5px;">
                  5531 Cancha de Golf Ste #202<br>
                  Rancho Santa Fe, CA 92091
                </td>
              </tr>

              <!-- HBA Logo (Hyperlinked) -->
              <tr>
                <td style="padding-top:10px;">
                  <a href="https://www.highbluffacademy.com" target="_blank">
                    <img src="''' + BASE + '''/images/high_bluff_academy_wide_transparent.png"
                         alt="High Bluff Academy Logo"
                         width="165"
                         style="width:165px; height:auto; display:block; margin:0 auto;">
                  </a>
                </td>
              </tr>
''' + SOCIAL_ICONS + '''

            </tbody>
          </table>
        </td>

      </tr>
    </tbody>
  </table>

</div>
</body>
</html>'''
    return html


os.makedirs(OUT_DIR, exist_ok=True)
for p in faculty:
    path = os.path.join(OUT_DIR, p['slug'] + '.html')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(make_sig(p))
    print('wrote ' + path)

print('Done.')
