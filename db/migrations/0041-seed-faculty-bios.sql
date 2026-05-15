-- Phase 3: seed faculty_bios from the 14 faculty that lived in
-- lib/faculty.ts. After this runs, the DB is the source of truth and
-- lib/faculty.ts is a thin reader.
--
-- How to apply: handled by the migration runner (`npm run db:migrate`).
--
-- Each row resolves profile_id by the email convention
-- (<slug-first-segment>@highbluffacademy.com). A faculty member with no
-- profile is silently skipped — re-running after the profile is created
-- picks them up.
--
-- on conflict (profile_id) do update: only the IDENTITY columns are
-- refreshed (slug / name / image / is_leadership / display_order). A
-- faculty member who already self-edited their bio keeps their edited
-- title / area / paragraphs / courses — we just attach identity to it.

begin;

-- 1. Kun Xuan -----------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'kun-xuan', $name$Kun Xuan$name$, $t$Head of School$t$,
  $a$Leadership$a$, '/images/hba/faculty/kun-xuan.webp', null, null, null,
  $s$Head of School with 17+ years in education and investment, focused on innovative, student-centered learning environments.$s$,
  $b$Mr. Kun earned his Bachelor of Science in Physics and Master of Science in Electronic Engineering from Fudan University. He currently serves as an Industrial Advisor at the University of Nottingham and is also a member of Mensa.

With more than 17 years of experience in education and educational investment, Mr. Xuan is deeply committed to advancing innovative learning environments that empower students to achieve academic excellence and develop strong character. His work focuses on integrating rigorous academic standards with personalized learning approaches that nurture critical thinking, creativity, and intellectual curiosity.

Mr. Xuan believes that education should not only prepare students for university success but also cultivate global perspectives, ethical leadership, and a lifelong love of learning. Under his leadership, the school strives to provide a supportive and forward-thinking academic environment where students are encouraged to explore their potential, pursue meaningful goals, and become responsible contributors to society.

Driven by a mission to bridge international educational opportunities, Mr. Xuan is dedicated to helping students develop the knowledge, resilience, and confidence needed to thrive in an increasingly interconnected world.$b$,
  true, 0
from profiles p where lower(p.email) = 'kun@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 2. George Humphreys ---------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'george-humphreys', $name$George Humphreys$name$,
  $t$Director & Principal$t$, $a$Leadership · Science · Technology$a$,
  '/images/hba/faculty/george-humphreys.webp', 'June 2007', null,
  array['Chemistry: In the Earth System','AP Chemistry','Physics of the Universe','AP Physics 1','Intro to Robotic Engineering','Intro to Programming','Integrated Math 1','Integrated Math 2','Integrated Math 3','Intro to Calculus','Health','PE Golf','Cooking']::text[],
  $s$Director and Principal known for Chemistry, AP Chemistry, Physics, and building lasting mentor relationships with students.$s$,
  $b$George began working at High Bluff Academy in the summer of 2007. During his tenure he earned local fame among the TPHS community for teaching Chemistry, AP Chemistry, Physics, and AP Physics 1, with a unique ability to take the most complex concepts and make them accessible and engaging for students.

George believes that the key to educational success is active engagement by all parties. In his classroom students are empowered to self-advocate, actively participate, and have their voice heard. Through his teaching, he has created lasting relationships with his students, who view him both as a mentor and a friend.

As he transitioned into administration, George brought that same student-centric approach to coaching and mentoring the staff as he helped lead the High Bluff Academy community. George prioritizes clear and effective communication among students, staff, and families to ensure every student feels supported to achieve their goals. George believes that it is important to keep teaching and connected with the students and staff as he leads through example.

When he is not at HBA, George is a dedicated father of 3, Jase, Lucy, and George, a passionate golfer, and amateur chef.$b$,
  true, 1
from profiles p where lower(p.email) = 'george@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 3. Ethan Alvarée ------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'ethan-alvaree', $name$Ethan Alvarée$name$,
  $t$Director of Instruction and Curriculum$t$,
  $a$Leadership · Mathematics · Technology$a$,
  '/images/hba/faculty/ethan-alvaree.webp', '2018', '2013',
  array['Integrated Math 1','Integrated Math 2','Integrated Math 3','Integrated Math 1 (H)','Integrated Math 2 (H)','Integrated Math 3 (H)','AP Precalculus','AP Calculus AB','AP Calculus BC','AP Statistics','Multivariable Calculus (H)','Linear Algebra (H)','Group Theory and Abstract Algebra (H)','Set Theory and Real Analysis (H)','Mathematics of Machine Learning (H)','AP Computer Science Principles','AP Computer Science A','AP Microeconomics','Logic and Philosophy','Digital Art']::text[],
  $s$Math, statistics, and computer science educator, curriculum writer for College Board, and director of technology at HBA.$s$,
  $b$Ethan is an accomplished educator with more than ten years of teaching experience in mathematics, statistics, and computer science. They hold a B.S. from Michigan State University and an M.S. from UC San Diego. Since joining HBA in 2018, they have played a key role in implementing the integrated Common Core math curriculum and launching new courses in symbolic logic, linear algebra, and group theory.

Beyond teaching, Ethan is an active writer and researcher in the field of mathematics. They are a writer at the College Board, developing curriculum for the new AP Precalculus course and crafting lessons for the SpringBoard textbooks. Ethan’s research has been featured in the Journal of Statistics and Management Systems, and they are currently authoring additional textbooks in mathematical subjects.

Outside their professional endeavors, Ethan enjoys spending quality time with their two golden retrievers, Mister Fibonacci and Miss Ada.$b$,
  true, 2
from profiles p where lower(p.email) = 'ethan@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 4. Molly Sun ----------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'molly-sun', $name$Molly Sun$name$,
  $t$Director of Admissions and Operations$t$,
  $a$Leadership · Admissions · Operations$a$,
  '/images/hba/faculty/molly-sun.webp', null, null, null,
  $s$Admissions and operations leader with a background in higher education, language teaching, and cross-cultural communication.$s$,
  $b$Molly holds a Master’s degree in Higher Education Administration from Northeastern University, where she developed a strong foundation in the U.S. higher education system, including college access, student development, and enrollment management. She also holds California teaching credentials in Chinese, reflecting her commitment to both language education and cross-cultural communication.

Prior to joining High Bluff Academy, Molly taught Chinese language courses at San Diego State University, where she worked with a diverse student population and helped foster global awareness through language learning. She was also involved in the university’s military immersion program in collaboration with the Defense Language Institute, supporting intensive language training and cultural competency development.

At HBA, Molly is deeply committed to guiding students and families through the admissions process with care and transparency. She is passionate about building meaningful relationships with families and creating a supportive, inclusive school community. Through her work, she strives to ensure that each student feels welcomed, understood, and empowered to succeed both academically and personally.

Outside of her professional role, Molly enjoys spending quality time with her family. She loves cooking and exploring new recipes, staying active at her local Pilates studio, and taking walks with her family and their golden retriever, Turbo.$b$,
  true, 3
from profiles p where lower(p.email) = 'molly@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 5. Kristin O'Connor ---------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'kristin-oconnor', $name$Kristin O'Connor$name$,
  $t$Office Manager & Student Activities Coordinator$t$,
  $a$Student Support · Activities$a$,
  '/images/hba/faculty/kristin-oconnor.webp', null, null, null,
  $s$Office manager and activities coordinator with a background in Child Development and a passion for student success.$s$,
  $b$Kristin is pleased to be joining the High Bluff Academy Administration team. She earned her bachelor’s degree in Child Development from San Diego State University, where she developed a strong foundation in understanding how students grow academically, socially, and emotionally. Her education, combined with her dedication to supporting young people, has shaped her passion for working closely with families to ensure every student is equipped to reach their highest potential in both high school and college.

She is deeply committed to helping students thrive by providing guidance, encouragement, and individualized support throughout their educational journey. Whether assisting currently enrolled students or welcoming future families, Kristin serves as a resource, advocate, and partner in helping each student succeed.

Outside of work, Kristin lives in Oceanside with her two dogs, who keep life fun and active. She enjoys spending time outdoors, especially beach walks and scenic coastal hikes. She also loves trying new cuisines, exploring different restaurants, and occasionally treating herself to a fun shopping trip. These experiences help her stay balanced, energized, and connected to the vibrant community here in San Diego.$b$,
  false, 4
from profiles p where lower(p.email) = 'kristin@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 6. Ishaan Mishra ------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'ishaan-mishra', $name$Ishaan Mishra$name$,
  $t$Academic & College Counselor$t$, $a$Counseling · College Planning$a$,
  '/images/hba/faculty/ishaan-mishra.webp', null, null, null,
  $s$Academic and college counselor focused on helping students navigate college, career pathways, and long-term goals.$s$,
  $b$Ishaan is happy to be joining the team at High Bluff Academy, striving to assist students with their college and career planning. He holds a Bachelor of Arts in Child Development from Point Loma Nazarene University and a Master of Arts in Education with an emphasis in College Counseling and Student Development. Ishaan’s prior experience in K-12 dual enrollment support, as well as university admissions has shaped his passion for college and career preparation.

He is committed to providing students with valuable skills and insights that can equip them for future success. At High Bluff Academy, he will strive to provide enriching experiences for learners and provide consistent communication with families as they navigate through the college admissions process.

Outside of work, Ishaan enjoys reading, running, and trying new food places around San Diego County. He also enjoys learning more about current trends in the field of education so that he can constantly grow in his service.$b$,
  false, 5
from profiles p where lower(p.email) = 'ishaan@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 7. Ellen Sullivan -----------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'ellen-sullivan', $name$Ellen Sullivan$name$,
  $t$English Teacher$t$, $a$English · Humanities$a$,
  '/images/hba/faculty/ellen-sullivan.webp', '2018', null,
  array['English 9','English 10','English 11','English 12','AP English Literature and Composition','AP English Language and Composition','AP Research','AP Seminar','Creative Writing','Public Speaking','Journalism','Art | Poetry | Prose Magazine','Yearbook','Community Service']::text[],
  $s$English and Social Science educator with a background in international affairs and a passion for literacy and communication.$s$,
  $b$After a career in international affairs, Ellen has been an English teacher since 2010 because it provides her the opportunity to work with young people to shape the reading, writing, and oral communication skills she knows are needed in today’s professional world. Encouraging and observing the growth in each of her students is one of Ellen’s greatest joys.

Beyond the classroom, Ellen serves as the faculty advisor for the Art | Poetry | Prose Magazine, HBA's student-run literary and arts publication, and oversees the school yearbook.

Ellen, who holds California teaching credentials in both English and Social Science, received her BA in International Relations at the College of Wooster in Ohio, and completed her courses in education at Old Dominion University in Virginia and journalism at the University of Texas, Austin. When not in school, Ellen is taking photos of her surfing kids; sitting in a beach chair with toes in sand and book in hand; practicing yoga; or finding new and interesting places in the world to visit.$b$,
  false, 6
from profiles p where lower(p.email) = 'ellen@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 8. Alan Saltamachio --------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'alan-saltamachio', $name$Alan Saltamachio$name$,
  $t$Biology & Environmental Science Teacher$t$, $a$Science$a$,
  '/images/hba/faculty/alan-saltamachio.webp', '2023', '1989',
  array['Biology: The Living Earth','AP Biology','Environmental Science','AP Environmental Science','Health']::text[],
  $s$Veteran biology and environmental science teacher with 30+ years of experience and a passion for hands-on learning.$s$,
  $b$Alan earned his degree in Biology from Cal Poly SLO and received his teaching credential from SDSU. Alan has a California single subject teaching credential in Biology with supplemental authorization in introductory Chemistry.

With over 30 years of experience in teaching Biology, AP Biology, and Environmental Science, Alan Saltamachio has dedicated his life to inspiring the next generation of scientists and environmental stewards. After an extensive career at Fallbrook High School, where he made a lasting impact on countless students, Alan came out of retirement to share his wealth of knowledge and passion for the environment at High Bluff Academy in recent years.

Alan is a strong advocate for sustainability and environmental consciousness, and he brings this passion into every lesson. His teaching philosophy is rooted in the idea of “learning by doing,” encouraging his students to step outside the classroom and engage with the world around them through hands-on activities, field research, and real-world projects. His classes are renowned for being interactive and engaging, providing students with practical experience that connects theory to the environment they see and live in.

When Alan isn’t in the classroom, you’ll likely find him out on the waves—surfing is his favorite way to recharge and stay connected to nature.$b$,
  false, 7
from profiles p where lower(p.email) = 'alan@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 9. Fran Dickson -------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'fran-dickson', $name$Fran Dickson$name$,
  $t$Spanish Department Chair$t$, $a$World Languages$a$,
  '/images/hba/faculty/fran-dickson.webp', '2023', '2008 in Santiago, Chile',
  array['Spanish 1','Spanish 2','Spanish 3','Spanish 4','AP Spanish Language and Culture']::text[],
  $s$Spanish teacher from Chile who brings language, culture, and lived experience into every lesson.$s$,
  $b$With 15 years of dedicated teaching experience, Fran Dickson has cultivated a deep passion for education and a special affinity for working with high school and adult students. Over the years, Fran has embraced diverse teaching environments across Santiago, Chile; Scottsdale, Arizona; Seattle, Washington; and most recently Rancho Santa Fe, California. This journey reflects a commitment to embracing cultural diversity and continuously challenging personal and professional growth in new cities and settings.

Fran holds a degree in Spanish and a teaching credential, enabling her to inspire and educate students with a comprehensive understanding of the language and culture of the Spanish-speaking world.

Each summer, Fran enjoys traveling back to her homeland of Chile, reconnecting with her roots and exploring new corners of the country. These travels enrich her teaching, providing firsthand experiences and stories that she shares with her students. Beyond the classroom, Fran enjoys running, cooking healthy meals and spending quality time with her two children, David and Victoria. Driven by a love for children and a belief in the transformative power of education, Fran strives to create meaningful, impactful learning experiences for every student.

Her passion for teaching, her cultural connection to Chile, and her devotion to her family make her an inspiring educator and a wonderful role model for her students.$b$,
  false, 8
from profiles p where lower(p.email) = 'fran@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 10. Tricia Tigli ------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'tricia-tigli', $name$Tricia Tigli$name$,
  $t$French & ESL Teacher$t$, $a$World Languages · ESL · Humanities$a$,
  '/images/hba/faculty/tricia-tigli.webp', 'June 2021',
  '2011 at San Diego Unified School District',
  array['English 9','English 10','English Support','World History','French 1','French 2','French 3','French 4','AP French Language and Culture']::text[],
  $s$French and ESL teacher with a global background, deep linguistic training, and a love of travel and culture.$s$,
  $b$Growing up in a Polish-speaking family in Paris, Ms. Tigli’s exposure to language started young. She moved to the US at the age of 10 and perfected her third language, English. Tricia earned both her B.A. in French and Linguistics with a minor in Political Science and her M.A. in French Literature at San Diego State University. After earning her degrees and teaching credential, she spent a year and a half in Paris at the Sorbonne earning her Certificat de Litérature et Civilization Française. Before joining the staff at HBA, she taught French at La Jolla High, Patrick Henry, and University City High, and Language Academy Immersion School. She has also taught ESL and TOEFL prep.

Tricia Tigli is an inspiring ESL and history teacher known for her dynamic and culturally rich teaching style. With a passion for global exploration, she incorporates lessons from her extensive travels into her classroom, offering students a unique, immersive learning experience. Having visited numerous countries across the world, Tricia shares real-world insights from her journeys, blending personal stories and historical context to make lessons come alive.

Every school holiday, Tricia eagerly sets off to discover new destinations, continuously broadening her understanding of the world. These experiences not only shape her teaching methods but also help her foster a global perspective in her students. With an engaging and hands-on approach, she encourages students to appreciate cultural diversity and develop a deeper understanding of history and language.

Ms. Tigli is the proud parent of two children, Jonathan and Amanda.$b$,
  false, 9
from profiles p where lower(p.email) = 'tricia@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 11. Kris Bunce --------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'kris-bunce', $name$Kris Bunce$name$,
  $t$Math & Science Teacher$t$, $a$Math · Science$a$,
  '/images/hba/faculty/kris-bunce.webp', 'Summer 2022', null,
  array['Integrated Math 1','Integrated Math 2','Integrated Math 3','Integrated Math 1 (H)','Integrated Math 2 (H)','Integrated Math 3 (H)','AP Precalculus','AP Calculus AB','AP Calculus BC','AP Chemistry','AP Physics 1','AP Physics 2']::text[],
  $s$Former nuclear engineer and research scientist teaching math, chemistry, and physics with real-world rigor.$s$,
  $b$Kris is a former Nuclear Engineer/Research Scientist that currently teaches math, chemistry, and physics. He has been a teacher since 2010, teaching math and science courses for High Tech High, SDSU, and University of Phoenix. Kris also helps develop curriculum. In fact, he led two teams of instructional designers in reconstructing the math program at University of Phoenix.

He was recently awarded Distinguished Faculty of the Year for outstanding teaching practices and for creating and facilitating faculty development workshops. In addition to teaching at High Bluff Academy, Kris helps the US Academic Decathlon develop exams, runs a tutoring business, and occasionally gives guest lectures at SDSU.$b$,
  false, 10
from profiles p where lower(p.email) = 'kris@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 12. Will Anderson, Ph.D. ---------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'will-anderson', $name$Will Anderson, Ph.D.$name$,
  $t$Science Teacher$t$, $a$Science$a$,
  '/images/hba/faculty/will-anderson.webp', '2016', null,
  array['Biology: The Living Earth','Biology (H)','AP Biology','Chemistry: In the Earth System','Chemistry: In the Earth System (H)','AP Chemistry','Environmental Science','AP Environmental Science','Psychology','AP Psychology']::text[],
  $s$Ph.D. biochemist and longtime San Diego educator making advanced science accessible and exciting for students.$s$,
  $b$Dr. Will Anderson is a Ph.D. biochemist with nearly two decades of experience living, working, and teaching in San Diego. He earned his degree in Biochemistry and Molecular Biology from Cornell University and his Ph.D. in Chemistry from the University of California, San Diego. He brings a broad background in scientific research to the classroom, having spent over 10 years conducting academic research at Cornell University, UCSD, and The Scripps Research Institute.

In addition to his research career, Dr. Will has spent the past 13 years teaching high school, university, and graduate students. He has taught all levels of Chemistry, Biology, Environmental Science, and Psychology at High Bluff Academy, where he is known for making complex scientific ideas accessible, engaging, and meaningful for students at every level. He continues to mentor former students as they navigate college, graduate school, and professional pathways.

Outside of the classroom, Dr. Will is an ardent supporter of the San Diego Zoo Wildlife Association. He enjoys spending time with the magnificent animals for which they care. He also spends an inordinate amount of time reading for fun, knows way too much about Star Wars, and has two cats named Luke & Leia.$b$,
  false, 11
from profiles p where lower(p.email) = 'will@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 13. Lindy Benson ------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'lindy-benson', $name$Lindy Benson$name$,
  $t$Economics Teacher$t$, $a$Social Science · Economics$a$,
  '/images/hba/faculty/lindy-benson.webp', '2026', '1993',
  array['Economics','AP Microeconomics','AP Macroeconomics','Personal Finance']::text[],
  $s$Economics teacher with deep academic training, a global background, and a passion for both students and animals.$s$,
  $b$Born and raised in South Africa, Lindy holds a Bachelor of Commerce degree with majors in Accounting and Economics, as well as an Honours degree in Economics, from the University of South Africa. She is happily married with four children, and their lively home includes two dogs and five cats. A passionate long-distance runner, she has completed numerous half, full, and ultra marathons, balancing her love of family life with time on the road.

Deeply committed to animal welfare, she fosters cats and kittens for a local rescue organization, opening her home and heart to animals in need. She has been teaching for many years at both school and college level, where she loves sharing her enthusiasm for economics with her students.$b$,
  false, 12
from profiles p where lower(p.email) = 'lindy@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

-- 14. Judy Beck ---------------------------------------------------------
insert into faculty_bios
  (profile_id, slug, name, title, area, image, hba_start, career_start,
   courses_taught, short_bio, full_bio, is_leadership, display_order)
select p.id, 'judy-beck', $name$Judy Beck$name$,
  $t$Studio Art Teacher$t$, $a$Visual Arts$a$,
  '/images/hba/faculty/judy-beck.webp', '2025', '2013',
  array['Studio Art']::text[],
  $s$Artist, designer, and educator with a rich career in art, design, philanthropy, and global travel.$s$,
  $b$Judy attended Massachusetts College of Art, was a toy designer for Hasbro Toys, and went on a career in advertising and design, first with Doyle Dane & Bernbach, and then as the principal partner of Chambers of Design in Santa Monica, which specialized in tourism and travel clients. She also owned an interior design firm for many years.

Judy is an accomplished painter, whose work is in the permanent collection of UCLA at the Eli Broad Bio-Medical Research Center, and in many private collections, and who exhibits her work frequently in shows. She volunteered for many years as an Art Angel at Santa Monica High School with the AP art students.

Judy has a long history of chairing many charitable fundraisers, serves on the Los Angeles Region Red Cross Board, is the Co-chair of the LA Centennial Circle, and has been a member of the Red Cross Tiffany Circle National Council since 2009. She has won the Spirit of the Red Cross Award and the Red Cross Star Award. Judy served on the Board of Trustees for Otis College from 2017–2022 and joined the Board of Governors in September 2022, serving on the Board Affairs Committee. She is involved in many other nonprofits, serving on the board of the IDG Guild at Saint John’s Health Center where she also volunteers.

Judy and her husband, Charles, live in Brentwood, love to travel, and have visited 44 countries so far.$b$,
  false, 13
from profiles p where lower(p.email) = 'judy@highbluffacademy.com'
on conflict (profile_id) do update set
  slug = excluded.slug, name = excluded.name, image = excluded.image,
  is_leadership = excluded.is_leadership, display_order = excluded.display_order;

commit;
