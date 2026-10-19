import { PrismaClient, Role, ArticleStatus, TimelineEventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting digital newsroom database seed ("The Dispatch")...');

  // 1. Clean slate in reverse dependency order
  console.log('[Seed] Cleaning existing records...');
  await prisma.alertDismissal.deleteMany();
  await prisma.articleComment.deleteMany();
  await prisma.timelineEvent.deleteMany();
  
  // Unlink circular revision pointer on articles before deleting revisions
  await prisma.article.updateMany({ data: { publishedRevisionId: null } });
  
  await prisma.articleRevision.deleteMany();
  await prisma.article.deleteMany();
  await prisma.sectionAssignment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.user.deleteMany();

  // 2. Demo Users
  console.log('[Seed] Creating demo newsroom accounts (Editors & Writers)...');
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

  // 3. Sections & Assignments
  console.log('[Seed] Creating sections and assignments...');
  const secTech = await prisma.section.create({
    data: {
      name: 'Technology & Silicon',
      description: 'Computing infrastructure, artificial intelligence, semiconductor geopolitics, and enterprise software.',
      ownerEditorId: editor1.id,
    },
  });

  const secPolitics = await prisma.section.create({
    data: {
      name: 'Politics & Civic Affairs',
      description: 'Municipal finance, legislative hearings, regulatory policymaking, and statehouse coverage.',
      ownerEditorId: editor2.id,
    },
  });

  const secCulture = await prisma.section.create({
    data: {
      name: 'Culture & Modern Arts',
      description: 'Independent literary presses, architectural preservation, film critiques, and urban culture.',
      ownerEditorId: editor1.id,
    },
  });

  const secInvestigate = await prisma.section.create({
    data: {
      name: 'Investigative Desk',
      description: 'Long-term investigative reporting, corporate disclosure analysis, and public FOIA investigations.',
      ownerEditorId: editor2.id,
    },
  });

  // Soft-archived section (Goal 2)
  const secArchived = await prisma.section.create({
    data: {
      name: 'Crypto & Decentralized Web (Archived Desk)',
      description: 'Historical archive of coverage on early DeFi protocols and tokenomics. Read-only.',
      isArchived: true,
      ownerEditorId: editor2.id,
    },
  });

  // Section assignments (Goal 5)
  await prisma.sectionAssignment.createMany({
    data: [
      { sectionId: secTech.id, writerId: writer1.id, assignedById: editor1.id },
      { sectionId: secPolitics.id, writerId: writer2.id, assignedById: editor2.id },
      { sectionId: secPolitics.id, writerId: writer1.id, assignedById: editor2.id }, // Maya writes for both Tech & Politics
      { sectionId: secCulture.id, writerId: writer3.id, assignedById: editor1.id },
      { sectionId: secInvestigate.id, writerId: writer1.id, assignedById: editor2.id },
      { sectionId: secInvestigate.id, writerId: writer2.id, assignedById: editor2.id },
    ],
  });

  // 4. Articles in Various Lifecycle Stages
  console.log('[Seed] Creating articles with full lifecycle states and revisions...');
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Article 1: Published with an active newer Revision in Draft (Goal 4)
  const art1 = await prisma.article.create({
    data: {
      title: 'The Hidden Environmental Cost of Hyperscale AI Compute',
      body: `Behind the soaring valuations of generative AI infrastructure lies an unprecedented physical resource footprint.

Modern megawatt datacenter clusters in Northern Virginia and Phoenix consume upwards of 300 million gallons of evaporative cooling water annually. As regional grid operators struggle with interconnection queues stretching into 2028, municipal utility boards are quietly confronting the trade-offs between clean energy mandates and industrial compute demand.

Industry consortiums argue that closed-loop cooling and direct-to-chip liquid cooling will mitigate near-term water stress. However, regional watershed authorities warn that aquifer drawdowns near suburban campuses show measurable acceleration.`,
      status: ArticleStatus.PUBLISHED,
      sectionId: secTech.id,
      authorId: writer1.id,
      publishAt: yesterday,
      publishedAt: yesterday,
    },
  });

  // Revision 1 (the published version)
  const rev1 = await prisma.articleRevision.create({
    data: {
      articleId: art1.id,
      revisionNumber: 1,
      title: art1.title,
      body: art1.body,
      status: ArticleStatus.PUBLISHED,
      authorId: writer1.id,
      publishedAt: yesterday,
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
  });

  // Link published revision pointer
  await prisma.article.update({
    where: { id: art1.id },
    data: { publishedRevisionId: rev1.id },
  });

  // Revision 2 (Working draft revision proposing EPA updates)
  const rev2 = await prisma.articleRevision.create({
    data: {
      articleId: art1.id,
      revisionNumber: 2,
      title: 'The Hidden Environmental Cost of Hyperscale AI Compute (Updated with EPA Audit)',
      body: `Behind the soaring valuations of generative AI infrastructure lies an unprecedented physical resource footprint.

UPDATED REPORTING: Newly unsealed EPA regional audit documents reveal water diversion volumes across three mid-Atlantic facilities exceeded initial projections by 22%.

Modern megawatt datacenter clusters in Northern Virginia and Phoenix consume upwards of 366 million gallons of evaporative cooling water annually. As regional grid operators struggle with interconnection queues stretching into 2028, municipal utility boards are quietly confronting the trade-offs between clean energy mandates and industrial compute demand.`,
      status: ArticleStatus.DRAFT,
      authorId: writer1.id,
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
  });

  // Timeline events for Article 1
  await prisma.timelineEvent.createMany({
    data: [
      {
        articleId: art1.id,
        actorId: writer1.id,
        actorName: writer1.name,
        eventType: TimelineEventType.CREATED,
        newStatus: ArticleStatus.DRAFT,
        description: 'Article initiated by Maya Patel in Draft status',
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      },
      {
        articleId: art1.id,
        actorId: writer1.id,
        actorName: writer1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.DRAFT,
        newStatus: ArticleStatus.IN_REVIEW,
        description: 'Submitted for editorial review',
        createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
      },
      {
        articleId: art1.id,
        actorId: editor1.id,
        actorName: editor1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.IN_REVIEW,
        newStatus: ArticleStatus.APPROVED,
        description: 'Approved by Sarah Jenkins (editor)',
        createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      },
      {
        articleId: art1.id,
        actorId: editor1.id,
        actorName: editor1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.APPROVED,
        newStatus: ArticleStatus.PUBLISHED,
        description: 'Published immediately to live site as Revision #1',
        createdAt: yesterday,
      },
      {
        articleId: art1.id,
        actorId: writer1.id,
        actorName: writer1.name,
        eventType: TimelineEventType.REVISION_OPENED,
        revisionId: rev2.id,
        description: 'Opened Revision #2 starting at Draft to incorporate new EPA audit metrics',
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
    ],
  });

  // Article 2: OVERDUE SCHEDULED article (Goal 10)
  // Scheduled for 2 hours in the past, still SCHEDULED!
  const art2 = await prisma.article.create({
    data: {
      title: 'City Council Moves to Sunset $400M Riverfront Stadium Subsidy',
      body: `Following an acrimonious four-hour closed hearing, the municipal finance subcommittee voted 5-2 to recommend terminating the planned tax-increment financing package for the proposed riverfront arena.

Civic opposition groups presented independent auditing records indicating that tax revenues from the stadium would fall $120 million short of debt-servicing requirements backed by general revenue bonds.`,
      status: ArticleStatus.SCHEDULED,
      sectionId: secPolitics.id,
      authorId: writer2.id,
      publishAt: twoHoursAgo, // Past scheduled time! Triggers Overdue Alert!
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
        createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      },
      {
        articleId: art2.id,
        actorId: writer2.id,
        actorName: writer2.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.DRAFT,
        newStatus: ArticleStatus.IN_REVIEW,
        description: 'Submitted for editorial review',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        articleId: art2.id,
        actorId: editor2.id,
        actorName: editor2.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.IN_REVIEW,
        newStatus: ArticleStatus.APPROVED,
        description: 'Approved by David Zhao (editor)',
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },
      {
        articleId: art2.id,
        actorId: editor2.id,
        actorName: editor2.name,
        eventType: TimelineEventType.SCHEDULED,
        oldStatus: ArticleStatus.APPROVED,
        newStatus: ArticleStatus.SCHEDULED,
        description: `Scheduled for publication at ${twoHoursAgo.toISOString()}`,
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
    ],
  });

  // Article 3: In Review with editorial comments (Elena Rostova / Sarah Jenkins)
  const art3 = await prisma.article.create({
    data: {
      title: 'The Underground Resurgence of Risograph Print Culture',
      body: `In an era dominated by ephemeral digital feeds and algorithmic curation, an expanding movement of independent publishers has embraced the imperfect, vibrant textures of stencil duplicators.

From Berlin to Tokyo, small presses are turning to vintage Risograph machines to distribute limited-edition literary anthologies, investigative pamphlets, and visual essays. The tactile intimacy of spot colors and ink smudges offers a tangible antidote to endless scrolling.`,
      status: ArticleStatus.IN_REVIEW,
      sectionId: secCulture.id,
      authorId: writer3.id,
    },
  });

  const comment1 = await prisma.articleComment.create({
    data: {
      articleId: art3.id,
      authorId: editor1.id,
      content: 'Lyrical opening! Could you add a quick quote from the founder of Berlin’s StencilWorks on their machine maintenance costs?',
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
        description: 'Created by Elena Rostova',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      },
      {
        articleId: art3.id,
        actorId: writer3.id,
        actorName: writer3.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.DRAFT,
        newStatus: ArticleStatus.IN_REVIEW,
        description: 'Submitted for editorial sign-off',
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

  // Article 4: Approved & Scheduled for Tomorrow
  const art4 = await prisma.article.create({
    data: {
      title: 'State Regulators Greenlight Interstate 80 Autonomous Freight Corridor',
      body: `Commercial driverless long-haul freight operations will formally commence along a 400-mile stretch of Interstate 80 starting next quarter.

Transportation safety officials highlighted mandatory redundant braking protocols and geofenced weather shutdowns. Teamsters representatives voiced fierce opposition, pledging legislative challenges regarding job displacement.`,
      status: ArticleStatus.SCHEDULED,
      sectionId: secTech.id,
      authorId: writer1.id,
      publishAt: tomorrow,
      scheduleSequence: 1,
    },
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        articleId: art4.id,
        actorId: writer1.id,
        actorName: writer1.name,
        eventType: TimelineEventType.CREATED,
        newStatus: ArticleStatus.DRAFT,
        description: 'Created by Maya Patel',
      },
      {
        articleId: art4.id,
        actorId: writer1.id,
        actorName: writer1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.DRAFT,
        newStatus: ArticleStatus.IN_REVIEW,
        description: 'Submitted for review',
      },
      {
        articleId: art4.id,
        actorId: editor1.id,
        actorName: editor1.name,
        eventType: TimelineEventType.STATUS_CHANGED,
        oldStatus: ArticleStatus.IN_REVIEW,
        newStatus: ArticleStatus.APPROVED,
        description: 'Approved by Sarah Jenkins',
      },
      {
        articleId: art4.id,
        actorId: editor1.id,
        actorName: editor1.name,
        eventType: TimelineEventType.SCHEDULED,
        oldStatus: ArticleStatus.APPROVED,
        newStatus: ArticleStatus.SCHEDULED,
        description: `Scheduled for tomorrow at ${tomorrow.toLocaleString()}`,
      },
    ],
  });

  // Article 5: Open Draft
  const art5 = await prisma.article.create({
    data: {
      title: 'Ghost Contractors in Municipal Road Maintenance Allocations',
      body: `Preliminary audit documents reveal millions in annual municipal paving allocations disbursed to corporate entities with nonexistent equipment yards.`,
      status: ArticleStatus.DRAFT,
      sectionId: secInvestigate.id,
      authorId: writer2.id,
    },
  });

  await prisma.timelineEvent.create({
    data: {
      articleId: art5.id,
      actorId: writer2.id,
      actorName: writer2.name,
      eventType: TimelineEventType.CREATED,
      newStatus: ArticleStatus.DRAFT,
      description: 'Draft initiated by James Wilson',
    },
  });

  // Article 6: Case demonstrating Alert Dismissal tied to a scheduleSequence!
  // Scheduled, overdue, dismissed for sequence 1.
  const art6 = await prisma.article.create({
    data: {
      title: 'Regional Housing Commission Publishes Revised Inclusionary Zoning Rules',
      body: `New guidelines will require multifamily residential developers to allocate 18% of units to low-income households.`,
      status: ArticleStatus.SCHEDULED,
      sectionId: secPolitics.id,
      authorId: writer2.id,
      publishAt: twoHoursAgo,
      scheduleSequence: 1,
    },
  });

  // Editor dismissed overdue alert for scheduleSequence 1
  await prisma.alertDismissal.create({
    data: {
      articleId: art6.id,
      scheduleSequence: 1,
      dismissedById: editor2.id,
      dismissedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
  });

  // 5. Historical Published Articles over the last 8 weeks (for Dashboard Trend Chart - Goal 8)
  console.log('[Seed] Generating historical published articles across last 8 weeks...');
  const historicalArticles = [
    { title: 'The Fall of Monolithic Software in Enterprise Finance', weeksAgo: 1, sec: secTech, author: writer1 },
    { title: 'Public Transit Funding Gap Sparks Capitol Hill Debate', weeksAgo: 2, sec: secPolitics, author: writer2 },
    { title: 'Inside the Revival of Heritage Architectural Brickmaking', weeksAgo: 3, sec: secCulture, author: writer3 },
    { title: 'Semiconductor Fabrication Subsidies: One Year Later', weeksAgo: 4, sec: secTech, author: writer1 },
    { title: 'Suburban Water Quality Violations Go Unreported in State Records', weeksAgo: 5, sec: secInvestigate, author: writer2 },
    { title: 'Independent Bookstores Outperform Chain Retailers in Q2', weeksAgo: 6, sec: secCulture, author: writer3 },
    { title: 'Clean Grid Transmission Line Permits Stalled at County Level', weeksAgo: 7, sec: secPolitics, author: writer2 },
  ];

  for (const hist of historicalArticles) {
    const pubDate = new Date(now.getTime() - hist.weeksAgo * 7 * 24 * 60 * 60 * 1000);
    const createdDate = new Date(pubDate.getTime() - 48 * 60 * 60 * 1000);

    const art = await prisma.article.create({
      data: {
        title: hist.title,
        body: `Full reporting on ${hist.title.toLowerCase()} published as part of The Dispatch's weekly editorial coverage.`,
        status: ArticleStatus.PUBLISHED,
        sectionId: hist.sec.id,
        authorId: hist.author.id,
        publishAt: pubDate,
        publishedAt: pubDate,
        createdAt: createdDate,
      },
    });

    const rev = await prisma.articleRevision.create({
      data: {
        articleId: art.id,
        revisionNumber: 1,
        title: art.title,
        body: art.body,
        status: ArticleStatus.PUBLISHED,
        authorId: hist.author.id,
        publishedAt: pubDate,
        createdAt: createdDate,
      },
    });

    await prisma.article.update({
      where: { id: art.id },
      data: { publishedRevisionId: rev.id },
    });

    await prisma.timelineEvent.createMany({
      data: [
        {
          articleId: art.id,
          actorId: hist.author.id,
          actorName: hist.author.name,
          eventType: TimelineEventType.CREATED,
          newStatus: ArticleStatus.DRAFT,
          description: 'Draft initiated',
          createdAt: createdDate,
        },
        {
          articleId: art.id,
          actorId: editor1.id,
          actorName: editor1.name,
          eventType: TimelineEventType.STATUS_CHANGED,
          oldStatus: ArticleStatus.APPROVED,
          newStatus: ArticleStatus.PUBLISHED,
          description: 'Published on schedule',
          createdAt: pubDate,
        },
      ],
    });
  }

  console.log('[Seed] Database successfully populated!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials for Reviewers:');
  console.log('  Managing Editor : editor@dispatch.com       (Sarah Jenkins)');
  console.log('  Senior Editor   : david.editor@dispatch.com (David Zhao)');
  console.log('  Tech Writer     : writer@dispatch.com       (Maya Patel)');
  console.log('  Civic Writer    : james.writer@dispatch.com (James Wilson)');
  console.log('  Culture Writer  : elena.writer@dispatch.com (Elena Rostova)');
  console.log('  Password        : password123 (for all accounts)');
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
