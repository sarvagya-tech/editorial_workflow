import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  // 1. Full-text search GIN index
  `CREATE INDEX IF NOT EXISTS idx_articles_fts ON articles 
   USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '')));`,

  // 2. Check constraint: lowercase email
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_email_lowercase') THEN
       ALTER TABLE users ADD CONSTRAINT chk_users_email_lowercase CHECK (email = lower(email));
     END IF;
   END $$;`,

  // 3. Check constraint: revision_number positive
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_revisions_number_positive') THEN
       ALTER TABLE article_revisions ADD CONSTRAINT chk_revisions_number_positive CHECK (revision_number >= 1);
     END IF;
   END $$;`,

  // 4. Check constraint: schedule_sequence non-negative
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_articles_schedule_sequence_nonneg') THEN
       ALTER TABLE articles ADD CONSTRAINT chk_articles_schedule_sequence_nonneg CHECK (schedule_sequence >= 0);
     END IF;
   END $$;`,

  // 5. Check constraint: publish_at only on SCHEDULED or PUBLISHED
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_articles_publish_at_status') THEN
       ALTER TABLE articles ADD CONSTRAINT chk_articles_publish_at_status CHECK ((publish_at IS NULL) OR (status IN ('SCHEDULED', 'PUBLISHED')));
     END IF;
   END $$;`,

  // 6. Append-only trigger function for timeline_events
  `CREATE OR REPLACE FUNCTION prevent_timeline_mutation()
   RETURNS TRIGGER AS $$
   BEGIN
       RAISE EXCEPTION 'Editorial Audit Violation: timeline_events records are strictly immutable and cannot be updated or deleted. (Event ID: %)', OLD.id;
   END;
   $$ LANGUAGE plpgsql;`,

  // 7. Trigger on timeline_events
  `DROP TRIGGER IF EXISTS trg_timeline_immutable ON timeline_events;`,
  `CREATE TRIGGER trg_timeline_immutable
   BEFORE UPDATE OR DELETE ON timeline_events
   FOR EACH ROW
   EXECUTE FUNCTION prevent_timeline_mutation();`,

  // 8. Section owner role verification function
  `CREATE OR REPLACE FUNCTION verify_section_owner_is_editor()
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
   $$ LANGUAGE plpgsql;`,

  // 9. Trigger on sections
  `DROP TRIGGER IF EXISTS trg_verify_section_owner ON sections;`,
  `CREATE TRIGGER trg_verify_section_owner
   BEFORE INSERT OR UPDATE OF owner_editor_id ON sections
   FOR EACH ROW
   EXECUTE FUNCTION verify_section_owner_is_editor();`,

  // 10. Revision ownership cross-check function
  `CREATE OR REPLACE FUNCTION verify_published_revision_belongs_to_article()
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
   $$ LANGUAGE plpgsql;`,

  // 11. Trigger on articles
  `DROP TRIGGER IF EXISTS trg_verify_published_revision ON articles;`,
  `CREATE TRIGGER trg_verify_published_revision
   BEFORE INSERT OR UPDATE OF published_revision_id ON articles
   FOR EACH ROW
   EXECUTE FUNCTION verify_published_revision_belongs_to_article();`
];

async function run() {
  console.log('[Migration] Applying custom PostgreSQL triggers, checks, and GIN index to Neon...');
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log('✅ All custom PostgreSQL triggers, GIN index and check constraints applied successfully!');
}

run()
  .catch((err) => {
    console.error('[Migration Error]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
