WITH ranked_contacts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, LOWER(email)
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_number
  FROM contacts
)
DELETE FROM contacts
WHERE id IN (
  SELECT id
  FROM ranked_contacts
  WHERE row_number > 1
);

ALTER TABLE contacts
  DROP CONSTRAINT IF EXISTS contacts_user_id_email_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_workspace_email_key'
      AND conrelid = 'contacts'::regclass
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_workspace_email_key
      UNIQUE (workspace_id, email);
  END IF;
END$$;
