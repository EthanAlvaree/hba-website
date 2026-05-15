-- Fix faculty_bios.image paths after the public/images/ restructure.
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.
--
-- The 0041 seed inserted faculty portrait paths like
-- "/images/faculty/<slug>.webp". The image folders have since moved
-- under public/images/hba/ to match the new symmetric per-tenant
-- layout (HBA images under hba/, PCI under pci/, shared assets under
-- shared/). This migration rewrites the affected DB rows so the
-- portraits keep rendering after the file move.
--
-- Only rewrites rows whose image still points at the old top-level
-- path; rows already on the new path are left alone, so re-running
-- this is a no-op.

begin;

update faculty_bios
set image = replace(image, '/images/faculty/', '/images/hba/faculty/')
where image like '/images/faculty/%';

commit;
