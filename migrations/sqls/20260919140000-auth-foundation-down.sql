DROP TABLE IF EXISTS audit_logs;

ALTER TABLE users
  DROP COLUMN IF EXISTS display_name,
  DROP COLUMN IF EXISTS must_change_password,
  DROP COLUMN IF EXISTS temporary_password_expires_at,
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS failed_login_attempts,
  DROP COLUMN IF EXISTS locked_until,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

DELETE FROM user_roles
WHERE user_role IN ('OWNER', 'MANAGER', 'TECH_SUPPORT', 'TESTER')
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE users.role_id = user_roles.role_id
  );

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_role_key;
