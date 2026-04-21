-- Prevent duplicate pending invitations for the same (organizationId, email).
-- A partial unique index constrains only rows in the "pending" state so
-- accepted / canceled / expired rows can coexist with a fresh pending
-- invitation to the same address.
--
-- Lowercases the email so two invites to "Alice@Co" and "alice@co" collide
-- (emails are case-insensitive on the local part per RFC5321 + common SMTP
-- behavior; our inviteMember normalizes with .toLowerCase() too).

CREATE UNIQUE INDEX "Invitation_org_email_pending_uq"
  ON "Invitation" ("organizationId", LOWER(email))
  WHERE status = 'pending';
