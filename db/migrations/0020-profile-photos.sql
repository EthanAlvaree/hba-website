-- HBA Phase C — profile photos
--
-- How to apply:
--   1. Paste this file into the Supabase SQL editor and run.
--   2. Create a Storage bucket named "profile-photos" via the Supabase
--      dashboard. Make it PUBLIC — photos are visible to anyone in the
--      portal community and we want to render them with plain <img>
--      tags without signed-URL refresh.
--   3. Set max file size on the bucket to ~5 MB (server also enforces
--      this; the bucket limit is belt-and-suspenders).
--
-- Why this design:
--   - photo_path holds the Supabase Storage object key, e.g.
--     "<profile-id>/<random>.jpg". Render via lib/profile-photos.ts
--     which builds the public URL from siteConfig.
--   - Stored on profiles (not students) so faculty photos and admin
--     headshots use the same code path. A student's photo is reached
--     through students.profile.photo_path.

begin;

alter table profiles add column if not exists photo_path text;

commit;
