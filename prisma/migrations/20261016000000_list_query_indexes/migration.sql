-- #393 — foreign-key indexes used by list and authorization queries.
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx"
  ON "OrganizationMember"("userId");
CREATE INDEX IF NOT EXISTS "Event_organizationId_idx"
  ON "Event"("organizationId");
CREATE INDEX IF NOT EXISTS "TicketType_eventId_idx"
  ON "TicketType"("eventId");
CREATE INDEX IF NOT EXISTS "Ticket_eventId_idx"
  ON "Ticket"("eventId");
CREATE INDEX IF NOT EXISTS "Ticket_ticketTypeId_idx"
  ON "Ticket"("ticketTypeId");
CREATE INDEX IF NOT EXISTS "ResaleListing_sellerId_idx"
  ON "ResaleListing"("sellerId");

-- #394 — marketplace feed filters by status and orders by createdAt.
CREATE INDEX IF NOT EXISTS "ResaleListing_status_createdAt_idx"
  ON "ResaleListing"("status", "createdAt");
