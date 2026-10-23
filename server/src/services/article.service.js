import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  validateRequired,
  validateString,
  validateEnum,
  validatePagination,
} from '../utils/validator.js';

const ALLOWED_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'];
const ALLOWED_SORT_FIELDS = [
  'updatedAt',
  'createdAt',
  'status',
  'publishAt',
  'scheduledAt',
  'publishedAt',
  'title',
];
const ALLOWED_ORDERS = ['asc', 'desc'];

/**
 * Verifies that the requesting user has permission to read the specified article.
 * Editors: Full access.
 * Writers: Permitted if author OR assigned to the section.
 * Throws 404 on failure to adhere to the zero-disclosure policy.
 */
async function getAuthorizedArticleOrThrow(articleId, user) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      section: { select: { id: true, name: true, isArchived: true, ownerEditorId: true } },
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
        // Zero-disclosure: Do not leak existence of unauthorized article
        throw new AppError('Article not found.', 404);
      }
    }
  }

  return article;
}

/**
 * Create a new article with initial Revision #1 and audit timeline event.
 */
export async function createArticle({ title, body, sectionId, user }) {
  validateRequired({ title, body, sectionId }, ['title', 'body', 'sectionId']);
  const cleanTitle = validateString(title, 'title', 3, 255);
  const cleanBody = validateString(body, 'body', 10, 500000);

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
  });

  if (!section) {
    throw new AppError('Section not found.', 404);
  }

  if (section.isArchived) {
    throw new AppError('Cannot create an article in an archived section.', 400);
  }

  // Permission Check: Writer must be assigned to this section
  if (user.role === 'WRITER') {
    const assignment = await prisma.sectionAssignment.findUnique({
      where: {
        sectionId_writerId: {
          sectionId,
          writerId: user.id,
        },
      },
    });

    if (!assignment) {
      throw new AppError('Writers can only create articles in sections they are assigned to.', 403);
    }
  }

  // Transaction: Create Article + Revision #1 + TimelineEvent
  const result = await prisma.$transaction(async (tx) => {
    const article = await tx.article.create({
      data: {
        title: cleanTitle,
        body: cleanBody,
        sectionId,
        authorId: user.id,
        status: 'DRAFT',
        version: 1,
      },
    });

    const revision = await tx.articleRevision.create({
      data: {
        articleId: article.id,
        revisionNumber: 1,
        title: cleanTitle,
        body: cleanBody,
        status: 'DRAFT',
        authorId: user.id,
      },
    });

    await tx.timelineEvent.create({
      data: {
        articleId: article.id,
        actorId: user.id,
        actorName: user.name,
        eventType: 'CREATED',
        newStatus: 'DRAFT',
        revisionId: revision.id,
        description: `Article initiated by ${user.name} in Draft status`,
      },
    });

    return { article, revision };
  });

  return {
    ...result.article,
    section: {
      id: section.id,
      name: section.name,
      isArchived: section.isArchived,
    },
    author: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    workingRevision: result.revision,
    publishedRevision: null,
  };
}

/**
 * List articles with server-side filtering, role scoping, full-text search, and pagination.
 */
export async function listArticles({
  pageQuery,
  limitQuery,
  sectionId,
  authorId,
  status,
  q,
  sortBy,
  order,
  user,
}) {
  const { page, limit, skip } = validatePagination(pageQuery, limitQuery, 20, 100);

  // Validate sortBy if provided
  let sortField = 'updatedAt';
  if (sortBy !== undefined && sortBy !== null && sortBy !== '') {
    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      throw new AppError(
        `Invalid sortBy field '${sortBy}'. Allowed fields: ${ALLOWED_SORT_FIELDS.join(', ')}`,
        400
      );
    }
    sortField = sortBy === 'scheduledAt' ? 'publishAt' : sortBy;
  }

  // Validate order if provided
  let sortOrder = 'desc';
  if (order !== undefined && order !== null && order !== '') {
    const cleanOrder = String(order).trim().toLowerCase();
    if (!ALLOWED_ORDERS.includes(cleanOrder)) {
      throw new AppError("Invalid order value. Allowed values: 'asc', 'desc'.", 400);
    }
    sortOrder = cleanOrder;
  }

  const where = { AND: [] };

  // Role scoping: Writers can see only their own articles OR articles in assigned active sections
  if (user.role === 'WRITER') {
    const assignments = await prisma.sectionAssignment.findMany({
      where: {
        writerId: user.id,
        section: { isArchived: false },
      },
      select: { sectionId: true },
    });
    const assignedSectionIds = assignments.map((a) => a.sectionId);

    where.AND.push({
      OR: [
        { authorId: user.id },
        { sectionId: { in: assignedSectionIds } },
      ],
    });
  }

  // Search query (searches title and body content)
  if (q !== undefined && q !== null) {
    const cleanQ = String(q).trim();
    if (cleanQ.length > 0) {
      where.AND.push({
        OR: [
          { title: { contains: cleanQ, mode: 'insensitive' } },
          { body: { contains: cleanQ, mode: 'insensitive' } },
          { revisions: { some: { body: { contains: cleanQ, mode: 'insensitive' } } } },
        ],
      });
    }
  }

  if (sectionId) {
    where.AND.push({ sectionId });
  }

  if (authorId) {
    where.AND.push({ authorId });
  }

  if (status) {
    validateEnum(status, 'status', ALLOWED_STATUSES);
    where.AND.push({ status });
  }

  const finalWhere = where.AND.length > 0 ? where : {};

  // Deterministic tie-breaking order
  const orderBy = [{ [sortField]: sortOrder }, { id: 'desc' }];

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: finalWhere,
      skip,
      take: limit,
      orderBy,
      include: {
        section: { select: { id: true, name: true, isArchived: true } },
        author: { select: { id: true, name: true, email: true, role: true } },
        publishedRevision: {
          select: { id: true, revisionNumber: true, publishedAt: true },
        },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            revisionNumber: true,
            title: true,
            status: true,
            updatedAt: true,
          },
        },
        _count: {
          select: { revisions: true, comments: true, timelineEvents: true },
        },
      },
    }),
    prisma.article.count({ where: finalWhere }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const formattedArticles = articles.map((art) => {
    const workingRevision = art.revisions[0] || null;
    const { revisions, body, ...rest } = art;
    return {
      ...rest,
      workingRevision,
    };
  });

  return {
    articles: formattedArticles,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  };
}

/**
 * Retrieve article details with working revision and published revision distinguished.
 */
export async function getArticleById({ id, user }) {
  const article = await getAuthorizedArticleOrThrow(id, user);

  const workingRevision = article.revisions[0] || null;

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
    workingRevision,
    publishedRevision: article.publishedRevision,
    revisionsCount: article.revisions.length,
  };
}

/**
 * Update working draft content (title/body).
 * Enforces:
 * - Writers can only edit their own articles.
 * - Published articles cannot be directly edited via generic update (must open revision).
 * - Workflow state transitions (APPROVED/SCHEDULED) cannot be bypassed here.
 */
export async function updateArticle({ id, title, body, user }) {
  if (title === undefined && body === undefined) {
    throw new AppError('Must supply at least title or body to update.', 400);
  }

  const cleanTitle = title !== undefined ? validateString(title, 'title', 3, 255) : undefined;
  const cleanBody = body !== undefined ? validateString(body, 'body', 10, 500000) : undefined;

  const article = await getAuthorizedArticleOrThrow(id, user);

  // Writer authorization: must be author
  if (user.role === 'WRITER' && article.authorId !== user.id) {
    throw new AppError('Writers can only edit their own articles.', 403);
  }

  // Workflow protection: cannot directly edit published content
  if (article.status === 'PUBLISHED') {
    throw new AppError('Published articles cannot be edited directly. Please open a new revision.', 400);
  }

  // Workflow protection: editing APPROVED or SCHEDULED articles requires Phase 5 workflow engine
  if (article.status === 'APPROVED' || article.status === 'SCHEDULED') {
    throw new AppError(
      'Cannot edit an article in APPROVED or SCHEDULED status via generic update. Workflow state transitions are managed by the editorial workflow engine in Phase 5.',
      400
    );
  }

  const latestWorkingRev = article.revisions[0] || null;

  const updatedArticle = await prisma.$transaction(async (tx) => {
    // If working revision is still in DRAFT or IN_REVIEW, update its snapshot to match
    if (latestWorkingRev && latestWorkingRev.status !== 'PUBLISHED') {
      await tx.articleRevision.update({
        where: { id: latestWorkingRev.id },
        data: {
          ...(cleanTitle !== undefined ? { title: cleanTitle } : {}),
          ...(cleanBody !== undefined ? { body: cleanBody } : {}),
        },
      });
    }

    const updated = await tx.article.update({
      where: { id },
      data: {
        ...(cleanTitle !== undefined ? { title: cleanTitle } : {}),
        ...(cleanBody !== undefined ? { body: cleanBody } : {}),
        version: { increment: 1 },
      },
      include: {
        section: { select: { id: true, name: true, isArchived: true } },
        author: { select: { id: true, name: true, email: true, role: true } },
        publishedRevision: true,
      },
    });

    await tx.timelineEvent.create({
      data: {
        articleId: id,
        actorId: user.id,
        actorName: user.name,
        eventType: 'CONTENT_UPDATED',
        revisionId: latestWorkingRev?.id || null,
        description: `Article content updated by ${user.name}`,
        metadata: {
          updatedFields: [cleanTitle ? 'title' : null, cleanBody ? 'body' : null].filter(Boolean),
        },
      },
    });

    return updated;
  });

  return updatedArticle;
}

/**
 * List revisions for an article in descending revision order.
 */
export async function listRevisions({ articleId, user }) {
  await getAuthorizedArticleOrThrow(articleId, user);

  return prisma.articleRevision.findMany({
    where: { articleId },
    orderBy: { revisionNumber: 'desc' },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

/**
 * Retrieve a single revision snapshot by ID.
 * Guarantees revision belongs to the requested article.
 */
export async function getRevisionById({ articleId, revisionId, user }) {
  await getAuthorizedArticleOrThrow(articleId, user);

  const revision = await prisma.articleRevision.findUnique({
    where: { id: revisionId },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!revision || revision.articleId !== articleId) {
    throw new AppError('Revision not found for this article.', 404);
  }

  return revision;
}

/**
 * Open a new revision for an article without mutating published content or older snapshots.
 */
export async function createRevision({ articleId, title, body, user }) {
  const article = await getAuthorizedArticleOrThrow(articleId, user);

  if (user.role === 'WRITER' && article.authorId !== user.id) {
    throw new AppError('Writers can only open revisions on their own articles.', 403);
  }

  const cleanTitle = title !== undefined ? validateString(title, 'title', 3, 255) : undefined;
  const cleanBody = body !== undefined ? validateString(body, 'body', 10, 500000) : undefined;

  const newRevision = await prisma.$transaction(async (tx) => {
    const latest = await tx.articleRevision.findFirst({
      where: { articleId },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true, title: true, body: true },
    });

    const nextRevNumber = (latest?.revisionNumber || 0) + 1;
    const revTitle = cleanTitle || latest?.title || article.title;
    const revBody = cleanBody || latest?.body || article.body;

    const revision = await tx.articleRevision.create({
      data: {
        articleId,
        revisionNumber: nextRevNumber,
        title: revTitle,
        body: revBody,
        status: 'DRAFT',
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await tx.timelineEvent.create({
      data: {
        articleId,
        actorId: user.id,
        actorName: user.name,
        eventType: 'REVISION_OPENED',
        revisionId: revision.id,
        description: `Opened Revision #${nextRevNumber} in Draft status by ${user.name}`,
      },
    });

    return revision;
  });

  return newRevision;
}

/**
 * List comments on an article in chronological order.
 */
export async function listComments({ articleId, user }) {
  await getAuthorizedArticleOrThrow(articleId, user);

  return prisma.articleComment.findMany({
    where: { articleId },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      revision: { select: { id: true, revisionNumber: true, status: true } },
    },
  });
}

/**
 * Add a comment on an article and record an audit timeline event atomically.
 */
export async function createComment({ articleId, revisionId, content, user }) {
  await getAuthorizedArticleOrThrow(articleId, user);
  validateRequired({ content }, ['content']);
  const cleanContent = validateString(content, 'content', 1, 2000);

  if (revisionId) {
    const rev = await prisma.articleRevision.findUnique({
      where: { id: revisionId },
      select: { id: true, articleId: true },
    });
    if (!rev || rev.articleId !== articleId) {
      throw new AppError('Revision does not belong to this article.', 400);
    }
  }

  const comment = await prisma.$transaction(async (tx) => {
    const newComment = await tx.articleComment.create({
      data: {
        articleId,
        revisionId: revisionId || null,
        authorId: user.id,
        content: cleanContent,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        revision: { select: { id: true, revisionNumber: true, status: true } },
      },
    });

    const snippet = cleanContent.length > 60 ? cleanContent.slice(0, 57) + '...' : cleanContent;
    await tx.timelineEvent.create({
      data: {
        articleId,
        actorId: user.id,
        actorName: user.name,
        eventType: 'COMMENT_ADDED',
        revisionId: revisionId || null,
        description: `Comment by ${user.name}: "${snippet}"`,
        metadata: { commentId: newComment.id },
      },
    });

    return newComment;
  });

  return comment;
}

/**
 * Retrieve immutable audit timeline for an article in chronological order.
 */
export async function listTimelineEvents({ articleId, user }) {
  await getAuthorizedArticleOrThrow(articleId, user);

  return prisma.timelineEvent.findMany({
    where: { articleId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
      revision: { select: { id: true, revisionNumber: true, status: true } },
    },
  });
}
