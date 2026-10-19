-- ==============================================================================
-- POSTGRESQL-SPECIFIC DATABASE INTEGRITY & ENHANCEMENT MIGRATION
-- Project: Editorial Workflow Management System
-- Purpose: Supplements Prisma schema with engine-level triggers, full-text search,
--          and cross-table validation constraints that Prisma cannot natively express.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FULL-TEXT SEARCH: GIN Index on Articles (Title & Body)
-- Purpose: Fulfills Functional Requirement H (server-side search over title and body)
--          without expensive table scans (LIKE '%...%').
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_articles_fts ON articles 
USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '')));

-- ------------------------------------------------------------------------------
-- 2. CHECK CONSTRAINTS: Data Hygiene and Structural Invariants
-- ------------------------------------------------------------------------------

-- Ensure emails are strictly lowercase at the engine level to prevent duplicate case-variant accounts
ALTER TABLE users 
ADD CONSTRAINT chk_users_email_lowercase 
CHECK (email = lower(email));

-- Ensure revision numbers are positive sequential integers
ALTER TABLE article_revisions 
ADD CONSTRAINT chk_revisions_number_positive 
CHECK (revision_number >= 1);

-- Ensure schedule sequences are non-negative
ALTER TABLE articles 
ADD CONSTRAINT chk_articles_schedule_sequence_nonneg 
CHECK (schedule_sequence >= 0);

-- Workflow Invariant: An article cannot have a future publish_at unless it is SCHEDULED or PUBLISHED
ALTER TABLE articles 
ADD CONSTRAINT chk_articles_publish_at_status 
CHECK (
  (publish_at IS NULL) OR 
  (status IN ('SCHEDULED', 'PUBLISHED'))
);

-- ------------------------------------------------------------------------------
-- 3. TAMPER-PROOF AUDIT ENFORCEMENT: Trigger on timeline_events
-- Purpose: Fulfills Functional Requirement F (History you cannot rewrite).
--          Guarantees that timeline events are strictly APPEND-ONLY.
--          Any attempt to UPDATE or DELETE an event is blocked with an exception,
--          even if executed by an admin or rogue backend query.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_timeline_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Editorial Audit Violation: timeline_events records are strictly immutable and cannot be updated or deleted. (Event ID: %)', OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_timeline_immutable ON timeline_events;

CREATE TRIGGER trg_timeline_immutable
BEFORE UPDATE OR DELETE ON timeline_events
FOR EACH ROW
EXECUTE FUNCTION prevent_timeline_mutation();

-- ------------------------------------------------------------------------------
-- 4. SECTION OWNERSHIP INTEGRITY: Trigger on sections
-- Purpose: Guarantees that the owner_editor_id references a user whose role is 'EDITOR'.
--          Prevents assigning a WRITER as a section owner at the database level.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_section_owner_is_editor()
RETURNS TRIGGER AS $$
DECLARE
    owner_role "Role";
BEGIN
    SELECT role INTO owner_role FROM users WHERE id = NEW.owner_editor_id;
    
    IF owner_role IS NULL THEN
        RAISE EXCEPTION 'Foreign Key Violation: User ID % does not exist.', NEW.owner_editor_id;
    ELSIF owner_role <> 'EDITOR' THEN
        RAISE EXCEPTION 'Integrity Violation: Section owner must have role EDITOR. User % has role %.', NEW.owner_editor_id, owner_role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_section_owner ON sections;

CREATE TRIGGER trg_verify_section_owner
BEFORE INSERT OR UPDATE OF owner_editor_id ON sections
FOR EACH ROW
EXECUTE FUNCTION verify_section_owner_is_editor();

-- ------------------------------------------------------------------------------
-- 5. REVISION INTEGRITY: Published Revision Pointer Verification
-- Purpose: Ensures that if an article points to a published_revision_id,
--          that revision belongs to that EXACT article.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_published_revision_belongs_to_article()
RETURNS TRIGGER AS $$
DECLARE
    rev_article_id TEXT;
BEGIN
    IF NEW.published_revision_id IS NOT NULL THEN
        SELECT article_id INTO rev_article_id FROM article_revisions WHERE id = NEW.published_revision_id;
        
        IF rev_article_id IS NULL THEN
            RAISE EXCEPTION 'Foreign Key Violation: Revision ID % does not exist.', NEW.published_revision_id;
        ELSIF rev_article_id <> NEW.id THEN
            RAISE EXCEPTION 'Cross-Table Integrity Violation: Published revision % belongs to article %, not article %.', 
                NEW.published_revision_id, rev_article_id, NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_published_revision ON articles;

CREATE TRIGGER trg_verify_published_revision
BEFORE INSERT OR UPDATE OF published_revision_id ON articles
FOR EACH ROW
EXECUTE FUNCTION verify_published_revision_belongs_to_article();
