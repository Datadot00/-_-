-- Remove the six fixed-ID home-screen projects that were created only as
-- prototype/demo data. Child participations, reviews, and scraps are removed
-- through their ON DELETE CASCADE foreign keys.

delete from public.projects
where id in (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555555'::uuid,
  '66666666-6666-6666-6666-666666666666'::uuid
);
