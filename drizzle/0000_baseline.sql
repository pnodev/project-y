-- Baseline migration: production databases already contain this schema.
-- This migration exists so Drizzle can diff against the pre-git snapshot in meta/.
SELECT 1;
