// server/src/controllers/article.controller.js
import * as articleService from '../services/article.service.js';
import * as workflowService from '../services/workflow.service.js';
import * as alertService from '../services/alert.service.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/articles
 * Create a new article with initial Revision #1 in DRAFT status.
 */
export async function createArticle(req, res, next) {
  try {
    const { title, body, sectionId } = req.body;
    const article = await articleService.createArticle({
      title,
      body,
      sectionId,
      user: req.user,
    });
    res.status(201).json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/articles
 * List articles with server-side filtering, role scoping, and pagination.
 */
export async function listArticles(req, res, next) {
  try {
    const { page, limit, sectionId, authorId, status, q, sortBy, order } = req.query;
    const result = await articleService.listArticles({
      pageQuery: page,
      limitQuery: limit,
      sectionId,
      authorId,
      status,
      q,
      sortBy,
      order,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      data: result.articles,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/articles/:id
 * Retrieve details for a specific article.
 */
export async function getArticleById(req, res, next) {
  try {
    const article = await articleService.getArticleById({
      id: req.params.id,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/articles/:id
 * Update working draft content (title/body).
 */
export async function updateArticle(req, res, next) {
  try {
    const { title, body } = req.body;
    const updated = await articleService.updateArticle({
      id: req.params.id,
      title,
      body,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/articles/:id
 * Explicitly reject deletion to maintain audit trail and permanent editorial history.
 */
export function deleteArticle(req, res, next) {
  next(new AppError('Articles represent permanent editorial records and cannot be deleted.', 405));
}

/**
 * POST /api/articles/bulk/schedule
 * Bulk schedule articles for a future timestamp.
 */
export async function bulkSchedule(req, res, next) {
  try {
    const { articleIds, scheduledAt } = req.body || {};
    const result = await workflowService.bulkScheduleArticles({
      articleIds,
      scheduledAt,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: result.message,
      summary: result.summary,
      results: result.results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/bulk/unpublish
 * Bulk unpublish articles (reverting SCHEDULED or PUBLISHED to APPROVED).
 */
export async function bulkUnpublish(req, res, next) {
  try {
    const { articleIds, reason } = req.body || {};
    const result = await workflowService.bulkUnpublishArticles({
      articleIds,
      reason,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: result.message,
      summary: result.summary,
      results: result.results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/:id/submit
 * Submit working draft revision for editorial review (DRAFT -> IN_REVIEW).
 */
export async function submitArticle(req, res, next) {
  try {
    const { revisionId } = req.body || {};
    const article = await workflowService.submitArticle({
      articleId: req.params.id,
      revisionId,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: 'Article successfully submitted for editorial review.',
      data: article,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/:id/approve
 * Editor approves article for publication (IN_REVIEW -> APPROVED).
 * Enforces self-approval block (editor cannot approve own article).
 */
export async function approveArticle(req, res, next) {
  try {
    const { revisionId } = req.body || {};
    const article = await workflowService.approveArticle({
      articleId: req.params.id,
      revisionId,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: 'Article successfully approved for publication.',
      data: article,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/:id/schedule
 * Editor schedules approved article for future publication (APPROVED -> SCHEDULED).
 */
export async function scheduleArticle(req, res, next) {
  try {
    const { scheduledAt, revisionId } = req.body || {};
    const article = await workflowService.scheduleArticle({
      articleId: req.params.id,
      revisionId,
      scheduledAt,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: 'Article publication scheduled successfully.',
      data: article,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/:id/publish
 * Editor publishes article immediately (APPROVED -> PUBLISHED) or publishes due SCHEDULED article.
 */
export async function publishArticle(req, res, next) {
  try {
    const { revisionId } = req.body || {};
    const article = await workflowService.publishArticle({
      articleId: req.params.id,
      revisionId,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: 'Article published live successfully.',
      data: article,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/:id/unpublish
 * Editor unpublishes a SCHEDULED or PUBLISHED article back to APPROVED status.
 */
export async function unpublishArticle(req, res, next) {
  try {
    const { reason, revisionId } = req.body || {};
    const article = await workflowService.unpublishArticle({
      articleId: req.params.id,
      revisionId,
      reason,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: 'Article unpublished and returned to Approved status.',
      data: article,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/:id/alerts/dismiss
 * Dismiss overdue publication alert for the article and its current scheduleSequence.
 */
export async function dismissArticleAlert(req, res, next) {
  try {
    const result = await alertService.dismissOverdueAlert({
      articleId: req.params.id,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/articles/:id/revisions
 * List all revisions for an article.
 */
export async function listRevisions(req, res, next) {
  try {
    const revisions = await articleService.listRevisions({
      articleId: req.params.id,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      data: revisions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/articles/:id/revisions/:revisionId
 * Retrieve a specific revision snapshot.
 */
export async function getRevisionById(req, res, next) {
  try {
    const revision = await articleService.getRevisionById({
      articleId: req.params.id,
      revisionId: req.params.revisionId,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      data: revision,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/:id/revisions
 * Open a new revision for an article without mutating published content.
 */
export async function createRevision(req, res, next) {
  try {
    const { title, body } = req.body;
    const revision = await articleService.createRevision({
      articleId: req.params.id,
      title,
      body,
      user: req.user,
    });
    res.status(201).json({
      success: true,
      message: 'New revision opened successfully',
      data: revision,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/articles/:id/comments
 * List chronological comments on an article.
 */
export async function listComments(req, res, next) {
  try {
    const comments = await articleService.listComments({
      articleId: req.params.id,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/articles/:id/comments
 * Add an editorial comment and record an audit timeline event atomically.
 */
export async function createComment(req, res, next) {
  try {
    const { content, revisionId } = req.body;
    const comment = await articleService.createComment({
      articleId: req.params.id,
      revisionId,
      content,
      user: req.user,
    });
    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/articles/:id/timeline
 * Retrieve immutable audit timeline events for an article.
 */
export async function listTimelineEvents(req, res, next) {
  try {
    const events = await articleService.listTimelineEvents({
      articleId: req.params.id,
      user: req.user,
    });
    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
}
