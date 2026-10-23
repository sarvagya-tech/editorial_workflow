import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const TX_OPTIONS = { maxWait: 15000, timeout: 30000 };

/**
 * Format millisecond difference into human-readable overdue duration string.
 */
export function formatHumanOverdueDuration(diffMs) {
  if (diffMs < 0) return 'Scheduled in future';
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'Overdue by < 1 minute';
  if (minutes < 60) return `Overdue by ${minutes} minute${minutes === 1 ? '' : 's'}`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Overdue by ${hours} hour${hours === 1 ? '' : 's'}`;
  
  const days = Math.floor(hours / 24);
  return `Overdue by ${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Retrieve active, non-dismissed overdue scheduled articles scoped by caller authorization.
 * An article is overdue when:
 * 1. Status is SCHEDULED
 * 2. publishAt timestamp is strictly in the past (< now)
 * 3. Section is not archived
 * 4. Has not been dismissed for its current scheduleSequence
 */
export async function getOverdueAlerts({ user, now = new Date() }) {
  let baseWhere = {};

  if (user.role === 'WRITER') {
    const assignments = await prisma.sectionAssignment.findMany({
      where: {
        writerId: user.id,
        section: { isArchived: false },
      },
      select: { sectionId: true },
    });
    const assignedSectionIds = assignments.map((a) => a.sectionId);

    baseWhere = {
      status: 'SCHEDULED',
      publishAt: { lt: now },
      section: { isArchived: false },
      OR: [
        { authorId: user.id },
        { sectionId: { in: assignedSectionIds } },
      ],
    };
  } else {
    baseWhere = {
      status: 'SCHEDULED',
      publishAt: { lt: now },
      section: { isArchived: false },
    };
  }

  const articles = await prisma.article.findMany({
    where: baseWhere,
    orderBy: { publishAt: 'asc' }, // Most overdue articles first
    include: {
      section: { select: { id: true, name: true, isArchived: true } },
      author: { select: { id: true, name: true, email: true, role: true } },
      alertDismissals: {
        select: { scheduleSequence: true, dismissedAt: true },
      },
    },
  });

  // Filter out articles whose current scheduleSequence has already been dismissed
  const activeOverdueArticles = articles.filter((art) => {
    return !art.alertDismissals.some((d) => d.scheduleSequence === art.scheduleSequence);
  });

  const alerts = activeOverdueArticles.map((art) => {
    const overdueDurationMs = Math.max(0, now.getTime() - art.publishAt.getTime());
    return {
      id: `${art.id}-${art.scheduleSequence}`,
      articleId: art.id,
      title: art.title,
      status: art.status,
      sectionId: art.section.id,
      sectionName: art.section.name,
      authorId: art.author.id,
      authorName: art.author.name,
      authorEmail: art.author.email,
      publishAt: art.publishAt.toISOString(),
      scheduleSequence: art.scheduleSequence,
      overdueSince: art.publishAt.toISOString(),
      overdueDurationMs,
      overdueDurationHuman: formatHumanOverdueDuration(overdueDurationMs),
      dismissible: user.role === 'EDITOR',
    };
  });

  return {
    alerts,
    total: alerts.length,
  };
}

/**
 * Dismiss the overdue alert for a specific article and its current scheduleSequence.
 * Tied to scheduleSequence so rescheduling the article naturally revives alerts.
 */
export async function dismissOverdueAlert({ articleId, user, now = new Date() }) {
  if (user.role !== 'EDITOR') {
    throw new AppError('Only editors can dismiss overdue article alerts.', 403);
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      section: { select: { id: true, name: true, isArchived: true } },
      alertDismissals: {
        where: { scheduleSequence: undefined },
        select: { scheduleSequence: true },
      },
    },
  });

  if (!article) {
    throw new AppError('Article not found.', 404);
  }

  // Precondition 1: Must currently be in SCHEDULED status
  if (article.status !== 'SCHEDULED') {
    throw new AppError(
      `Cannot dismiss alert: article status is ${article.status}, expected SCHEDULED.`,
      400
    );
  }

  // Precondition 2: Must be overdue (publishAt < now)
  if (!article.publishAt || article.publishAt.getTime() >= now.getTime()) {
    throw new AppError('Cannot dismiss alert: article is not overdue.', 400);
  }

  // Precondition 3: Idempotency check - has it already been dismissed for this sequence?
  const existingDismissal = await prisma.alertDismissal.findUnique({
    where: {
      articleId_scheduleSequence: {
        articleId,
        scheduleSequence: article.scheduleSequence,
      },
    },
  });

  if (existingDismissal) {
    return {
      success: true,
      message: 'Alert has already been dismissed for this schedule occurrence.',
      articleId,
      scheduleSequence: article.scheduleSequence,
      alreadyDismissed: true,
    };
  }

  // Atomically record dismissal and write immutable audit timeline event
  await prisma.$transaction(async (tx) => {
    // 1. Create AlertDismissal record
    await tx.alertDismissal.create({
      data: {
        articleId,
        scheduleSequence: article.scheduleSequence,
        dismissedById: user.id,
        dismissedAt: now,
      },
    });

    // 2. Create immutable audit timeline event
    await tx.timelineEvent.create({
      data: {
        articleId,
        actorId: user.id,
        actorName: user.name,
        eventType: 'ALERT_DISMISSED',
        description: `Overdue publication alert dismissed for schedule sequence #${article.scheduleSequence} by editor ${user.name}`,
        metadata: {
          scheduleSequence: article.scheduleSequence,
          publishAt: article.publishAt.toISOString(),
          dismissedAt: now.toISOString(),
        },
      },
    });
  }, TX_OPTIONS);

  return {
    success: true,
    message: 'Overdue alert dismissed successfully.',
    articleId,
    scheduleSequence: article.scheduleSequence,
  };
}
