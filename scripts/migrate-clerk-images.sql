-- Restore profile images from Clerk (one-time).
-- Get URLs from Clerk Dashboard → Users / Organizations → profile image URL.
-- Clerk URLs often look like: https://img.clerk.com/...

-- User profile photo
UPDATE "user"
SET image = 'https://REPLACE_WITH_CLERK_USER_IMAGE_URL'
WHERE id = 'F2LaBzrU26nMG3dVl8uBsBbNq69FeaT2';

-- Organization logo
UPDATE organization
SET logo = 'https://REPLACE_WITH_CLERK_ORG_IMAGE_URL'
WHERE id = 'YVWL19ooaw0qTkFISrp6ng3d0I648Ykn';
