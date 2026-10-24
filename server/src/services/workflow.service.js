import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  validateFutureDate,
  validateOptionalString,
  validateBulkArticleIds,
} from '../utils/validator.js';

const TX_OPTIONS = { maxWait: 15000, timeout: 30000 };

/**
 * System actor representation for autonomous background jobs.
 * Authorized with EDITOR role, with explicit actorName and null actorId to satisfy foreign keys.
 */
export const SYSTEM_ACTOR = Object.freeze({
  id: null,
  name: 'System Scheduler',
  role: 'EDITOR',
  isSystem: true,
});

/**
 * Loads article with required relations and enforces zero-disclosure authorization.
 */
async function getArticleAndValidateAccess(articleId, user) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      section: { select: { id: true, name: true, isArchived: true } },
      author: { select: { id: true, name: true, email: true, role: true } },
      publishedRevision: {
        select: {
          id: true,
          revisionNumber: true,
          title: true,
          body: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
      },
      revisions: {
        orderBy: { revisionNumber: 'desc' },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  if (!article) {
    throw new AppError('Article not found.', 404);
  }

  // Zero-disclosure policy: Writers cannot even learn about unassigned articles
  if (user.role === 'WRITER') {
    if (article.authorId !== user.id) {
      const assignment = await prisma.sectionAssignment.findUnique({
        where: {
          sectionId_writerId: {
            sectionId: article.sectionId,
            writerId: user.id,
          },
        },
      });
      if (!assignment) {
        throw new AppError('Article not found.', 404);
      }
    }
  }

  // Defensive auto-healing: ensure article has at least Revision #1
  if (!article.revisions || article.revisions.length === 0) {
    const rev1 = await prisma.articleRevision.create({
      data: {
        articleId: article.id,
        revisionNumber: 1,
        title: article.title,
        body: article.body || 'Draft body content.',
        status: article.status,
        authorId: article.authorId,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    article.revisions = [rev1];
  }

  return article;
}

/**
 * Resolves the relevant working revision from the article's revision collection.
 */
function resolveWorkingRevision(article, requestedRevisionId) {
  if (requestedRevisionId) {
    const found = article.revisions.find((r) => r.id === requestedRevisionId);
    if (!found) {
      throw new AppError('Specified revision does not belong to this article.', 400);
    }
    return found;
  }

  // When article is SCHEDULED, prefer the specific revision marked SCHEDULED
  if (article.status === 'SCHEDULED') {
    const scheduledRev = article.revisions.find((r) => r.status === 'SCHEDULED');
    if (scheduledRev) return scheduledRev;
  }

  // When article is APPROVED, prefer the specific revision marked APPROVED
  if (article.status === 'APPROVED') {
    const approvedRev = article.revisions.find((r) => r.status === 'APPROVED');
    if (approvedRev) return approvedRev;
  }

  // Default to newest revision
  const latestRev = article.revisions[0];
  if (!latestRev) {
    throw new AppError('No revision found for this article.', 400);
  }
  return latestRev;
}

/**
 * Formats response object distinguishing working revision and published revision.
 */
function formatArticleResponse(article, workingRevision) {
  return {
    id: article.id,
    title: article.title,
    body: article.body,
    status: article.status,
    sectionId: article.sectionId,
    authorId: article.authorId,
    publishAt: article.publishAt,
    publishedAt: article.publishedAt,
    scheduleSequence: article.scheduleSequence,
    version: article.version,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    section: article.section,
    author: article.author,
    workingRevision: {
      id: workingRevision.id,
      revisionNumber: workingRevision.revisionNumber,
      title: workingRevision.title,
      status: workingRevision.status,
      publishedAt: workingRevision.publishedAt,
      author: workingRevision.author,
      createdAt: workingRevision.createdAt,
      updatedAt: workingRevision.updatedAt,
    },
    publishedRevision: article.publishedRevision || null,
  };
}

/**
 * Transition A: Submit for review (DRAFT -> IN_REVIEW)
 */
export async function submitArticle({ articleId, revisionId, user }) {
  const article = await getArticleAndValidateAccess(articleId, user);
  const workingRev = resolveWorkingRevision(article, revisionId);

  // Writer authorization: only the author can submit their own draft
  if (user.role === 'WRITER') {
    if (article.authorId !== user.id && workingRev.authorId !== user.id) {
      throw new AppError('Writers can only submit their own articles for review.', 403);
    }
  }

  // State validation: must be in DRAFT
  if (workingRev.status !== 'DRAFT') {
    throw new AppError(
      `Cannot submit article for review: current revision status is ${workingRev.status}, expected DRAFT.`,
      400
    );
  }

  const isPublishedArticle = article.status === 'PUBLISHED';

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update working revision status to IN_REVIEW
      const updatedRev = await tx.articleRevision.update({
        where: { id: workingRev.id },
        data: { status: 'IN_REVIEW' },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // 2. Update article status if not already published
      const updatedArticle = await tx.article.update({
        where: {
          id: articleId,
          version: article.version,
        },
        data: {
          ...(isPublishedArticle ? {} : { status: 'IN_REVIEW' }),
          version: { increment: 1 },
        },
        include: {
          section: { select: { id: true, name: true, isArchived: true } },
          author: { select: { id: true, name: true, email: true, role: true } },
          publishedRevision: true,
        },
      });

      // 3. Insert audit timeline event
      await tx.timelineEvent.create({
        data: {
          articleId,
          actorId: user.id,
          actorName: user.name,
          eventType: 'STATUS_CHANGED',
          oldStatus: 'DRAFT',
          newStatus: 'IN_REVIEW',
          revisionId: workingRev.id,
          description: `Revision #${workingRev.revisionNumber} submitted for editorial review by ${user.name}`,
          metadata: {
            revisionNumber: workingRev.revisionNumber,
            isReplacementRevision: isPublishedArticle,
          },
        },
      });

      return { article: updatedArticle, workingRev: updatedRev };
    }, TX_OPTIONS);

    return formatArticleResponse(result.article, result.workingRev);
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Concurrent workflow modification conflict. Please refresh and try again.', 409);
    }
    throw error;
  }
}

/**
 * Transition B: Approve article (IN_REVIEW -> APPROVED)
 */
export async function approveArticle({ articleId, revisionId, user }) {
  if (user.role !== 'EDITOR') {
    throw new AppError('Only editors can approve articles.', 403);
  }

  const article = await getArticleAndValidateAccess(articleId, user);
  const workingRev = resolveWorkingRevision(article, revisionId);

  // Self-approval prohibition: Author cannot approve their own work, even if an editor
  if (article.authorId === user.id || workingRev.authorId === user.id) {
    throw new AppError('Editorial Integrity Violation: Editors cannot approve their own articles.', 403);
  }

  // State validation: must be IN_REVIEW
  if (workingRev.status !== 'IN_REVIEW') {
    throw new AppError(
      `Cannot approve article: current revision status is ${workingRev.status}, expected IN_REVIEW.`,
      400
    );
  }

  const isPublishedArticle = article.status === 'PUBLISHED';

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update working revision to APPROVED
      const updatedRev = await tx.articleRevision.update({
        where: { id: workingRev.id },
        data: { status: 'APPROVED' },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // 2. Update article status if not already published
      const updatedArticle = await tx.article.update({
        where: {
          id: articleId,
          version: article.version,
        },
        data: {
          ...(isPublishedArticle ? {} : { status: 'APPROVED' }),
          version: { increment: 1 },
        },
        include: {
          section: { select: { id: true, name: true, isArchived: true } },
          author: { select: { id: true, name: true, email: true, role: true } },
          publishedRevision: true,
        },
      });

      // 3. Insert audit timeline event
      await tx.timelineEvent.create({
        data: {
          articleId,
          actorId: user.id,
          actorName: user.name,
          eventType: 'STATUS_CHANGED',
          oldStatus: 'IN_REVIEW',
          newStatus: 'APPROVED',
          revisionId: workingRev.id,
          description: `Revision #${workingRev.revisionNumber} approved for publication by editor ${user.name}`,
          metadata: {
            approvedById: user.id,
            approvedByName: user.name,
            revisionNumber: workingRev.revisionNumber,
            isReplacementRevision: isPublishedArticle,
          },
        },
      });

      return { article: updatedArticle, workingRev: updatedRev };
    }, TX_OPTIONS);

    return formatArticleResponse(result.article, result.workingRev);
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Concurrent workflow modification conflict. Please refresh and try again.', 409);
    }
    throw error;
  }
}

/**
 * Transition C: Schedule article (APPROVED -> SCHEDULED)
 */
export async function scheduleArticle({ articleId, revisionId, scheduledAt, user }) {
  if (user.role !== 'EDITOR') {
    throw new AppError('Only editors can schedule articles.', 403);
  }

  const publishAtDate = validateFutureDate(scheduledAt, 'scheduledAt');

  const article = await getArticleAndValidateAccess(articleId, user);
  const workingRev = resolveWorkingRevision(article, revisionId);

  // State validation: must be in APPROVED or SCHEDULED status (supports initial scheduling and rescheduling)
  if (workingRev.status !== 'APPROVED' && workingRev.status !== 'SCHEDULED') {
    throw new AppError(
      `Cannot schedule article: current revision status is ${workingRev.status}, expected APPROVED or SCHEDULED.`,
      400
    );
  }

  const isPublishedArticle = article.status === 'PUBLISHED';
  const nextScheduleSequence = article.scheduleSequence + 1;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update working revision to SCHEDULED
      const updatedRev = await tx.articleRevision.update({
        where: { id: workingRev.id },
        data: { status: 'SCHEDULED' },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // 2. Update article schedule fields and status
      const updatedArticle = await tx.article.update({
        where: {
          id: articleId,
          version: article.version,
        },
        data: {
          publishAt: publishAtDate,
          scheduleSequence: nextScheduleSequence,
          ...(isPublishedArticle ? {} : { status: 'SCHEDULED' }),
          version: { increment: 1 },
        },
        include: {
          section: { select: { id: true, name: true, isArchived: true } },
          author: { select: { id: true, name: true, email: true, role: true } },
          publishedRevision: true,
        },
      });

      // 3. Insert audit timeline event
      await tx.timelineEvent.create({
        data: {
          articleId,
          actorId: user.id,
          actorName: user.name,
          eventType: 'SCHEDULED',
          oldStatus: workingRev.status,
          newStatus: 'SCHEDULED',
          revisionId: workingRev.id,
          description:
            workingRev.status === 'SCHEDULED'
              ? `Article publication rescheduled for ${publishAtDate.toISOString()} by ${user.name}`
              : `Article scheduled for publication at ${publishAtDate.toISOString()} by ${user.name}`,
          metadata: {
            publishAt: publishAtDate.toISOString(),
            scheduleSequence: nextScheduleSequence,
            revisionNumber: workingRev.revisionNumber,
          },
        },
      });

      return { article: updatedArticle, workingRev: updatedRev };
    }, TX_OPTIONS);

    return formatArticleResponse(result.article, result.workingRev);
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Concurrent workflow modification conflict. Please refresh and try again.', 409);
    }
    throw error;
  }
}

/**
 * Transition D & E: Publish article (APPROVED or due SCHEDULED -> PUBLISHED)
 */
export async function publishArticle({
  articleId,
  revisionId,
  user,
  expectedScheduleSequence,
  referenceTime,
}) {
  if (user.role !== 'EDITOR') {
    throw new AppError('Only editors can publish articles.', 403);
  }

  const article = await getArticleAndValidateAccess(articleId, user);
  const workingRev = resolveWorkingRevision(article, revisionId);

  // Validate schedule sequence if specified (concurrency & rescheduling protection)
  if (
    expectedScheduleSequence !== undefined &&
    article.scheduleSequence !== expectedScheduleSequence
  ) {
    throw new AppError(
      `Schedule sequence mismatch: article has sequence ${article.scheduleSequence}, expected ${expectedScheduleSequence}. The article may have been rescheduled.`,
      409
    );
  }

  // Validate state
  const effectiveTime = referenceTime ? new Date(referenceTime).getTime() : Date.now();
  if (workingRev.status === 'SCHEDULED') {
    // Scheduled article: enforce that scheduled publication time has arrived
    if (article.publishAt && article.publishAt.getTime() > effectiveTime) {
      throw new AppError('Cannot publish scheduled article before its scheduled publication time.', 400);
    }
  } else if (workingRev.status !== 'APPROVED') {
    throw new AppError(
      `Cannot publish article: current revision status is ${workingRev.status}. Articles must be in APPROVED or due SCHEDULED status.`,
      400
    );
  }

  const now = new Date();
  const isReplacementRevision =
    Boolean(article.publishedRevisionId) && article.publishedRevisionId !== workingRev.id;
  const isAutomated = Boolean(user.isSystem);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark working revision as PUBLISHED with publishedAt timestamp
      const updatedRev = await tx.articleRevision.update({
        where: { id: workingRev.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
        },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // 2. Atomically update article to point to new publishedRevision, and update denormalized active content
      const updatedArticle = await tx.article.update({
        where: {
          id: articleId,
          version: article.version,
        },
        data: {
          status: 'PUBLISHED',
          publishedRevisionId: workingRev.id,
          publishedAt: article.publishedAt || now,
          publishAt: null, // Clear schedule since it is now published
          title: workingRev.title,
          body: workingRev.body,
          version: { increment: 1 },
        },
        include: {
          section: { select: { id: true, name: true, isArchived: true } },
          author: { select: { id: true, name: true, email: true, role: true } },
          publishedRevision: true,
        },
      });

      // 3. Insert audit timeline event
      const eventDescription = isAutomated
        ? isReplacementRevision
          ? `Revision #${workingRev.revisionNumber} published live automatically by system scheduler`
          : `Article published live automatically by system scheduler`
        : isReplacementRevision
        ? `Revision #${workingRev.revisionNumber} published live to replace previous revision by editor ${user.name}`
        : `Article published live by editor ${user.name}`;

      await tx.timelineEvent.create({
        data: {
          articleId,
          actorId: user.id || null,
          actorName: user.name,
          eventType: isReplacementRevision ? 'REVISION_PUBLISHED' : 'STATUS_CHANGED',
          oldStatus: workingRev.status,
          newStatus: 'PUBLISHED',
          revisionId: workingRev.id,
          description: eventDescription,
          metadata: {
            publishedRevisionId: workingRev.id,
            revisionNumber: workingRev.revisionNumber,
            isReplacementRevision,
            isAutomated,
            publishedBy: isAutomated ? 'SYSTEM_SCHEDULER' : 'MANUAL_EDITOR',
            scheduleSequence: article.scheduleSequence,
          },
        },
      });

      return { article: updatedArticle, workingRev: updatedRev };
    }, TX_OPTIONS);

    return formatArticleResponse(result.article, result.workingRev);
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Concurrent workflow modification conflict. Please refresh and try again.', 409);
    }
    throw error;
  }
}


/**
 * Transition F: Unpublish article (SCHEDULED or PUBLISHED -> APPROVED)
 */
export async function unpublishArticle({ articleId, revisionId, reason, user }) {
  if (user.role !== 'EDITOR') {
    throw new AppError('Only editors can unpublish articles.', 403);
  }

  const cleanReason = validateOptionalString(reason, 'reason', 500);

  const article = await getArticleAndValidateAccess(articleId, user);
  const workingRev = resolveWorkingRevision(article, revisionId);

  // Must currently be SCHEDULED or PUBLISHED
  const isScheduled = article.status === 'SCHEDULED' || workingRev.status === 'SCHEDULED';
  const isPublished = article.status === 'PUBLISHED' || workingRev.status === 'PUBLISHED';

  if (!isScheduled && !isPublished) {
    throw new AppError(
      `Cannot unpublish article: current status is ${article.status}. Only SCHEDULED or PUBLISHED articles can be unpublished.`,
      400
    );
  }

  const previousStatus = isPublished ? 'PUBLISHED' : 'SCHEDULED';

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Revert working revision to APPROVED
      const updatedRev = await tx.articleRevision.update({
        where: { id: workingRev.id },
        data: { status: 'APPROVED' },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // 2. Revert article status to APPROVED, clear future publishAt schedule
      const updatedArticle = await tx.article.update({
        where: {
          id: articleId,
          version: article.version,
        },
        data: {
          status: 'APPROVED',
          publishAt: null,
          version: { increment: 1 },
        },
        include: {
          section: { select: { id: true, name: true, isArchived: true } },
          author: { select: { id: true, name: true, email: true, role: true } },
          publishedRevision: true,
        },
      });

      // 3. Insert audit timeline event
      await tx.timelineEvent.create({
        data: {
          articleId,
          actorId: user.id,
          actorName: user.name,
          eventType: 'UNPUBLISHED',
          oldStatus: previousStatus,
          newStatus: 'APPROVED',
          revisionId: workingRev.id,
          description: `Article unpublished and reverted to Approved by ${user.name}${
            cleanReason ? `: "${cleanReason}"` : ''
          }`,
          metadata: {
            reason: cleanReason || null,
            previousStatus,
            unpublishedAt: new Date().toISOString(),
          },
        },
      });

      return { article: updatedArticle, workingRev: updatedRev };
    }, TX_OPTIONS);

    return formatArticleResponse(result.article, result.workingRev);
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Concurrent workflow modification conflict. Please refresh and try again.', 409);
    }
    throw error;
  }
}

/**
 * Bulk Transition: Schedule multiple articles for a shared future timestamp.
 * Evaluates each article independently with isolated transactions and per-item reporting.
 */
export async function bulkScheduleArticles({ articleIds, scheduledAt, user }) {
  if (user.role !== 'EDITOR') {
    throw new AppError('Only editors can schedule articles.', 403);
  }

  const cleanIds = validateBulkArticleIds(articleIds);
  validateFutureDate(scheduledAt, 'scheduledAt');

  const results = [];
  let succeeded = 0;
  let failed = 0;

  for (const articleId of cleanIds) {
    let existingArticle = null;
    try {
      existingArticle = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
          revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 },
        },
      });

      const updated = await scheduleArticle({
        articleId,
        scheduledAt,
        user,
      });

      succeeded++;
      const previousStatus = existingArticle?.revisions[0]?.status || existingArticle?.status || 'APPROVED';
      results.push({
        articleId,
        success: true,
        previousStatus,
        currentStatus: 'SCHEDULED',
      });
    } catch (err) {
      failed++;
      const reason = err instanceof AppError ? err.message : 'Internal error processing article scheduling.';
      const previousStatus = existingArticle?.revisions[0]?.status || existingArticle?.status;

      results.push({
        articleId,
        success: false,
        reason,
        ...(previousStatus ? { previousStatus } : {}),
      });
    }
  }

  return {
    message: 'Bulk scheduling completed',
    summary: {
      requested: cleanIds.length,
      succeeded,
      failed,
    },
    results,
  };
}

/**
 * Bulk Transition: Unpublish multiple articles (reverting SCHEDULED or PUBLISHED to APPROVED).
 * Evaluates each article independently with isolated transactions and per-item reporting.
 */
export async function bulkUnpublishArticles({ articleIds, reason, user }) {
  if (user.role !== 'EDITOR') {
    throw new AppError('Only editors can unpublish articles.', 403);
  }

  const cleanIds = validateBulkArticleIds(articleIds);
  const cleanReason = validateOptionalString(reason, 'reason', 500);

  const results = [];
  let succeeded = 0;
  let failed = 0;

  for (const articleId of cleanIds) {
    let existingArticle = null;
    try {
      existingArticle = await prisma.article.findUnique({
        where: { id: articleId },
        select: { id: true, status: true },
      });

      const updated = await unpublishArticle({
        articleId,
        reason: cleanReason,
        user,
      });

      succeeded++;
      const previousStatus = existingArticle?.status || 'PUBLISHED';
      results.push({
        articleId,
        success: true,
        previousStatus,
        currentStatus: updated.status,
      });
    } catch (err) {
      failed++;
      const errorReason = err instanceof AppError ? err.message : 'Internal error processing article unpublishing.';

      results.push({
        articleId,
        success: false,
        reason: errorReason,
        ...(existingArticle?.status ? { previousStatus: existingArticle.status } : {}),
      });
    }
  }

  return {
    message: 'Bulk unpublishing completed',
    summary: {
      requested: cleanIds.length,
      succeeded,
      failed,
    },
    results,
  };
}

