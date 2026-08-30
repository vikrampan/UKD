-- Same reasoning as task codes: atomic, one round trip, no COUNT(*) race.
CREATE SEQUENCE IF NOT EXISTS work.issue_code_seq START 1;
