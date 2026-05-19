-- Restore profile images from Clerk (one-time).
-- Replace the two URL variables below, then run.

DO $$
DECLARE
  clerk_user_image_url text := 'https://REPLACE_WITH_CLERK_USER_IMAGE_URL';
  clerk_org_logo_url text := 'https://REPLACE_WITH_CLERK_ORG_IMAGE_URL';
BEGIN
  IF clerk_user_image_url LIKE '%REPLACE_WITH%'
     OR clerk_org_logo_url LIKE '%REPLACE_WITH%' THEN
    RAISE EXCEPTION
      'Replace clerk_user_image_url and clerk_org_logo_url with real Clerk image URLs before running this migration.';
  END IF;

  UPDATE "user"
  SET image = clerk_user_image_url
  WHERE id = 'F2LaBzrU26nMG3dVl8uBsBbNq69FeaT2';

  UPDATE organization
  SET logo = clerk_org_logo_url
  WHERE id = 'YVWL19ooaw0qTkFISrp6ng3d0I648Ykn';
END $$;
