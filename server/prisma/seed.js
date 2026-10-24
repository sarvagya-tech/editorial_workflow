import { PrismaClient, Role, ArticleStatus, TimelineEventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting production-level digital newsroom database seed ("The Dispatch")...');

  // 1. Clean slate in reverse dependency order
  console.log('[Seed] Purging all existing mock articles, revisions, timelines, and alert dismissals...');
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "timeline_events", "article_comments", "alert_dismissals", "article_revisions", "articles", "section_assignments", "sections", "users" CASCADE;'
    );
  } catch (truncateErr) {
    console.log('[Seed] TRUNCATE fallback to trigger toggle:', truncateErr.message);
    await prisma.$executeRawUnsafe('ALTER TABLE timeline_events DISABLE TRIGGER trg_timeline_immutable;');
    await prisma.alertDismissal.deleteMany();
    await prisma.articleComment.deleteMany();
    await prisma.timelineEvent.deleteMany();
    await prisma.article.updateMany({ data: { publishedRevisionId: null } });
    await prisma.articleRevision.deleteMany();
    await prisma.article.deleteMany();
    await prisma.sectionAssignment.deleteMany();
    await prisma.section.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$executeRawUnsafe('ALTER TABLE timeline_events ENABLE TRIGGER trg_timeline_immutable;');
  }

  // 2. Demo Users
  console.log('[Seed] Provisioning newsroom staff accounts (Editors & Beat Writers)...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const editor1 = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins',
      email: 'editor@dispatch.com',
      passwordHash,
      role: Role.EDITOR,
    },
  });

  const editor2 = await prisma.user.create({
    data: {
      name: 'David Zhao',
      email: 'david.editor@dispatch.com',
      passwordHash,
      role: Role.EDITOR,
    },
  });

  const writer1 = await prisma.user.create({
    data: {
      name: 'Maya Patel',
      email: 'writer@dispatch.com',
      passwordHash,
      role: Role.WRITER,
    },
  });

  const writer2 = await prisma.user.create({
    data: {
      name: 'James Wilson',
      email: 'james.writer@dispatch.com',
      passwordHash,
      role: Role.WRITER,
    },
  });

  const writer3 = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'elena.writer@dispatch.com',
      passwordHash,
      role: Role.WRITER,
    },
  });

  // 3. Sections & Beat Desks
  console.log('[Seed] Configuring newsroom editorial reporting desks...');
  const secTech = await prisma.section.create({
    data: {
      name: 'Technology & Silicon',
      description: 'Computing infrastructure, semiconductor supply chains, artificial intelligence, and enterprise software.',
      ownerEditorId: editor1.id,
    },
  });

  const secPolitics = await prisma.section.create({
    data: {
      name: 'Politics & Civic Affairs',
      description: 'Municipal finance, legislative hearings, antitrust regulatory policymaking, and statehouse coverage.',
      ownerEditorId: editor2.id,
    },
  });

  const secCulture = await prisma.section.create({
    data: {
      name: 'Culture & Modern Arts',
      description: 'Independent literary movements, architectural heritage, urban ecology, and contemporary culture.',
      ownerEditorId: editor1.id,
    },
  });

  const secInvestigate = await prisma.section.create({
    data: {
      name: 'Investigative Desk',
      description: 'Long-term investigative reporting, public records analysis, and critical infrastructure safety audits.',
      ownerEditorId: editor2.id,
    },
  });

  // Soft-archived historical section
  await prisma.section.create({
    data: {
      name: 'Crypto & Decentralized Web (Archived Desk)',
      description: 'Historical archive of coverage on early DeFi protocols and tokenomics. Read-only.',
      isArchived: true,
      ownerEditorId: editor2.id,
    },
  });

  // Beat Desk assignments
  await prisma.sectionAssignment.createMany({
    data: [
      { sectionId: secTech.id, writerId: writer1.id, assignedById: editor1.id },
      { sectionId: secPolitics.id, writerId: writer2.id, assignedById: editor2.id },
      { sectionId: secPolitics.id, writerId: writer1.id, assignedById: editor2.id },
      { sectionId: secCulture.id, writerId: writer3.id, assignedById: editor1.id },
      { sectionId: secInvestigate.id, writerId: writer1.id, assignedById: editor2.id },
      { sectionId: secInvestigate.id, writerId: writer2.id, assignedById: editor2.id },
    ],
  });

  // 4. Fresh Production News Stories (5 distinct news items across the 5 lifecycle states)
  console.log('[Seed] Seeding 5 fresh, high-impact production news stories...');
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // -------------------------------------------------------------
  // STORY 1: PUBLISHED (Live Lead Story with replacement revision)
  // -------------------------------------------------------------
  const art1 = await prisma.article.create({
    data: {
      title: 'Next-Gen Small Modular Reactors Cleared for Hyperscale AI Data Campuses',
      body: `WASHINGTON — Federal nuclear regulators have granted preliminary site-permitting approval for the nation's first fleet of commercial Small Modular Reactors (SMRs) co-located directly at hyperscale computing campuses across Virginia and Ohio.

The landmark ruling allows modular 300-megawatt light-water reactors to plug directly into behind-the-meter industrial microgrids. The initiative circumvents regional transmission interconnection queues stretching well past 2030, offering compute operators dedicated 24/7 carbon-free baseload power.

"This establishes a viable regulatory pathway for clean, uninterrupted compute capacity while insulating residential ratepayer grids from sudden industrial surges," stated NRC leadership during the morning briefing. Regional watershed authorities, however, have requested ongoing monitoring of evaporative cooling thermal discharge into local river basins.`,
      status: ArticleStatus.PUBLISHED,
      sectionId: secTech.id,
      authorId: writer1.id,
      publishAt: twoHoursAgo,
      publishedAt: twoHoursAgo,
    },
  });

  const rev1 = await prisma.articleRevision.create({
    data: {
      articleId: art1.id,
      revisionNumber: 1,
      title: art1.title,
      body: art1.body,
      status: ArticleStatus.PUBLISHED,
      authorId: writer1.id,
      publishedAt: twoHoursAgo,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  });

  await prisma.article.update({
    where: { id: art1.id },
    data: { publishedRevisionId: rev1.id },
  });

  // Working draft revision #2 (demonstrates replacement revision workflow)
  await prisma.articleRevision.create({
    data: {
      articleId: art1.id,
      revisionNumber: 2,
      title: 'Next-Gen Small Modular Reactors Cleared for Hyperscale AI Data Campuses (Updated with EPA Findings)',
      body: `${art1.body}

UPDATE: Regional water authorities have released supplementary thermal runoff models projecting a maximum 0.8°C elevation during peak August operating conditions.`,
      status: ArticleStatus.DRAFT,
      authorId: writer1.id,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        articleId: art1.id,
        actorId: writer1.id,
        actorName: writer1.name,
        eventType: TimelineEventType.CREATED,
        newStatus: ArticleStatus.DRAFT,
        description: 'Story drafted by Maya Patel',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        articleId: art1.id,
        actorId: writer1.id,
        actorName: writer1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.DRAFT,
        newStatus: ArticleStatus.IN_REVIEW,
        description: 'Submitted for editorial review',
        createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      },
      {
        articleId: art1.id,
        actorId: editor1.id,
        actorName: editor1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.IN_REVIEW,
        newStatus: ArticleStatus.APPROVED,
        description: 'Approved by Sarah Jenkins (editor)',
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      {
        articleId: art1.id,
        actorId: editor1.id,
        actorName: editor1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.APPROVED,
        newStatus: ArticleStatus.PUBLISHED,
        description: 'Published live as Revision #1',
        createdAt: twoHoursAgo,
      },
      {
        articleId: art1.id,
        actorId: writer1.id,
        actorName: writer1.name,
        eventType: TimelineEventType.REVISION_OPENED,
        description: 'Opened Revision #2 in Draft to incorporate water authority updates',
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
    ],
  });

  // -------------------------------------------------------------
  // STORY 2: SCHEDULED (Upcoming Scheduled Drop)
  // -------------------------------------------------------------
  const art2 = await prisma.article.create({
    data: {
      title: 'Global Antitrust Taskforce Finalizes Interoperability Standards for Frontier AI Models',
      body: `BRUSSELS / GENEVA — A multilateral coalition representing 18 international competition authorities will formally publish an unprecedented regulatory accord tomorrow morning, establishing strict interoperability mandates for multi-trillion-parameter AI foundation models.

The draft framework requires proprietary model providers to publish standardized API schema definitions for automated weights export, synthetic benchmark disclosures, and cross-platform context mobility.

European Commissioner Margrethe Vestager and FTC leadership jointly affirmed that proprietary ecosystem lock-in represents an intolerable barrier to fair market contestability. Tier-one enterprise software firms are expected to respond before quarterly earnings calls next week.`,
      status: ArticleStatus.SCHEDULED,
      sectionId: secPolitics.id,
      authorId: writer2.id,
      publishAt: tomorrow,
      scheduleSequence: 1,
    },
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        articleId: art2.id,
        actorId: writer2.id,
        actorName: writer2.name,
        eventType: TimelineEventType.CREATED,
        newStatus: ArticleStatus.DRAFT,
        description: 'Draft initiated by James Wilson',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        articleId: art2.id,
        actorId: writer2.id,
        actorName: writer2.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.DRAFT,
        newStatus: ArticleStatus.IN_REVIEW,
        description: 'Submitted for editorial sign-off',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
      {
        articleId: art2.id,
        actorId: editor2.id,
        actorName: editor2.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.IN_REVIEW,
        newStatus: ArticleStatus.APPROVED,
        description: 'Approved by David Zhao (editor)',
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        articleId: art2.id,
        actorId: editor2.id,
        actorName: editor2.name,
        eventType: TimelineEventType.SCHEDULED,
        oldStatus: ArticleStatus.APPROVED,
        newStatus: ArticleStatus.SCHEDULED,
        description: `Scheduled for tomorrow at ${tomorrow.toLocaleString()}`,
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      },
    ],
  });

  // -------------------------------------------------------------
  // STORY 3: IN_REVIEW (Major Feature with Editorial Commentary)
  // -------------------------------------------------------------
  const art3 = await prisma.article.create({
    data: {
      title: 'Urban Micro-Forestry Initiatives Cut Metropolitan Heat Island Indices by 4.2°C',
      body: `Across twelve European and North American metropolitan centers, municipal planners are discovering that hyper-dense botanical pocket installations — known as Miyawaki micro-forests — deliver cooling dividends far exceeding conventional urban parklands.

Satellite thermal radiometry conducted by the Copernicus Climate Change Service observed ambient surface temperature reductions averaging 4.2°C across dense urban corridors in Milan, Paris, and Montreal.

The densely packed native saplings achieve canopy closure within 36 months, generating localized microclimates and evaporative cooling effects that curb asphalt heat radiation and capture 300% more stormwater runoff than standard turf grass.`,
      status: ArticleStatus.IN_REVIEW,
      sectionId: secCulture.id,
      authorId: writer3.id,
    },
  });

  const comment1 = await prisma.articleComment.create({
    data: {
      articleId: art3.id,
      authorId: editor1.id,
      content: 'Exceptional field reporting, Elena! Could you verify whether municipal public works departments encountered subterranean root interference with municipal conduit lines in Montreal?',
    },
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        articleId: art3.id,
        actorId: writer3.id,
        actorName: writer3.name,
        eventType: TimelineEventType.CREATED,
        newStatus: ArticleStatus.DRAFT,
        description: 'Draft initiated by Elena Rostova',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
      {
        articleId: art3.id,
        actorId: writer3.id,
        actorName: writer3.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.DRAFT,
        newStatus: ArticleStatus.IN_REVIEW,
        description: 'Submitted to Editorial Desk for review',
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },
      {
        articleId: art3.id,
        actorId: editor1.id,
        actorName: editor1.name,
        eventType: TimelineEventType.COMMENT_ADDED,
        description: `Comment by Sarah Jenkins: "${comment1.content}"`,
        createdAt: comment1.createdAt,
      },
    ],
  });

  // -------------------------------------------------------------
  // STORY 4: APPROVED (Ready for publication or scheduling)
  // -------------------------------------------------------------
  const art4 = await prisma.article.create({
    data: {
      title: 'Federal Rail Commission Mandates Ultrasonic Sensor Grids on Freight Corridors',
      body: `Following an exhaustive sixteen-month investigation into hazardous chemical transport derailments, federal transportation authorities will require Class I freight operators to install wayside ultrasonic bearing acoustic monitors every 12 miles along mainline tracks.

The Dispatch reviewed non-public inspection logs revealing that legacy infrared defect detectors failed to alert train crews to overheated axle bearings in 34% of documented thermal failure incidents over the prior three years.

Rail carrier trade associations initially lobbied against the $840 million capital rollout, but accepted the binding administrative timetable following Congressional oversight hearings.`,
      status: ArticleStatus.APPROVED,
      sectionId: secInvestigate.id,
      authorId: writer2.id,
    },
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        articleId: art4.id,
        actorId: writer2.id,
        actorName: writer2.name,
        eventType: TimelineEventType.CREATED,
        newStatus: ArticleStatus.DRAFT,
        description: 'Investigative draft created by James Wilson',
        createdAt: new Date(now.getTime() - 16 * 60 * 60 * 1000),
      },
      {
        articleId: art4.id,
        actorId: writer2.id,
        actorName: writer2.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.DRAFT,
        newStatus: ArticleStatus.IN_REVIEW,
        description: 'Submitted for editorial sign-off',
        createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      },
      {
        articleId: art4.id,
        actorId: editor1.id,
        actorName: editor1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.IN_REVIEW,
        newStatus: ArticleStatus.APPROVED,
        description: 'Approved by Editor Sarah Jenkins',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  // -------------------------------------------------------------
  // STORY 5: DRAFT (Active Working Reporter Copy)
  // -------------------------------------------------------------
  const art5 = await prisma.article.create({
    data: {
      title: 'Deep-Sea Extraction Consortium Delays Pacific Clarion-Clipperton Mining Trials',
      body: `KINGSTON, JAMAICA — A multinational mining consortium backed by leading battery manufacturers has quietly postponed its planned deep-ocean polymetallic nodule harvesting trials in the central Pacific until late 2027.

Confidential briefing memorandums obtained by The Dispatch indicate environmental assessment trials conducted 4,000 meters beneath the surface triggered persistent benthic sediment plumes that traveled three times farther than computational dispersion models predicted.

International Seabed Authority delegates meeting in Kingston are preparing to introduce a formal moratorium resolution during the upcoming plenary session.`,
      status: ArticleStatus.DRAFT,
      sectionId: secTech.id,
      authorId: writer1.id,
    },
  });

  await prisma.timelineEvent.create({
    data: {
      articleId: art5.id,
      actorId: writer1.id,
      actorName: writer1.name,
      eventType: TimelineEventType.CREATED,
      newStatus: ArticleStatus.DRAFT,
      description: 'Draft initiated by Maya Patel',
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
  });

  console.log('[Seed] Database successfully populated with 5 fresh production stories!');
  console.log('----------------------------------------------------');
  console.log('Production News Stories Seeded:');
  console.log(`  1. [PUBLISHED]  ${art1.title}`);
  console.log(`  2. [SCHEDULED]  ${art2.title}`);
  console.log(`  3. [IN_REVIEW]  ${art3.title}`);
  console.log(`  4. [APPROVED]   ${art4.title}`);
  console.log(`  5. [DRAFT]      ${art5.title}`);
  console.log('----------------------------------------------------');
  console.log('Staff Credentials:');
  console.log('  Managing Editor : editor@dispatch.com       (Sarah Jenkins)');
  console.log('  Senior Editor   : david.editor@dispatch.com (David Zhao)');
  console.log('  Tech Reporter   : writer@dispatch.com       (Maya Patel)');
  console.log('  Civic Reporter  : james.writer@dispatch.com (James Wilson)');
  console.log('  Culture Reporter: elena.writer@dispatch.com (Elena Rostova)');
  console.log('  Password        : password123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
