-- Make the audit trail genuinely append-only (architecture doc §35).
--
-- A GRANT/REVOKE alone depends on which role the app connects as, which
-- varies by host. A trigger holds regardless of connection role, including
-- for anyone poking at the table by hand.

CREATE OR REPLACE FUNCTION audit.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'AuditLog is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON audit."AuditLog";
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

DROP TRIGGER IF EXISTS audit_log_no_delete ON audit."AuditLog";
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
