import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as articleService from '../services/article.service.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// All article endpoints require authentication
router.use(authenticate);

/**
 * POST /api/articles
 * Create a new article with initial Revision #1 in DRAFT status.
 */
router.post('/', async (req, res, next) => {
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
});

/**
 * GET /api/articles
 * List articles with server-side filtering, role scoping, and pagination.
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, sectionId, authorId, status } = req.query;
    const result = await articleService.listArticles({
      pageQuery: page,
      limitQuery: limit,
      sectionId,
      authorId,
      status,
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
});

/**
 * GET /api/articles/:id
 * Retrieve details for a specific article.
 */
router.get('/:id', async (req, res, next) => {
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
});

/**
 * PATCH /api/articles/:id
 * Update working draft content (title/body).
 */
router.patch('/:id', async (req, res, next) => {
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
});

/**
 * DELETE /api/articles/:id
 * Explicitly reject deletion to maintain audit trail and permanent editorial history.
 */
router.delete('/:id', (req, res, next) => {
  next(new AppError('Articles represent permanent editorial records and cannot be deleted.', 405));
});

// ----------------------------------------------------
// REVISION ENDPOINTS
// ----------------------------------------------------

/**
 * GET /api/articles/:id/revisions
 * List all revisions for an article.
 */
router.get('/:id/revisions', async (req, res, next) => {
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
});

/**
 * GET /api/articles/:id/revisions/:revisionId
 * Retrieve a specific revision snapshot.
 */
router.get('/:id/revisions/:revisionId', async (req, res, next) => {
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
});

/**
 * POST /api/articles/:id/revisions
 * Open a new revision for an article without mutating published content.
 */
router.post('/:id/revisions', async (req, res, next) => {
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
});

// ----------------------------------------------------
// COMMENT ENDPOINTS
// ----------------------------------------------------

/**
 * GET /api/articles/:id/comments
 * List chronological comments on an article.
 */
router.get('/:id/comments', async (req, res, next) => {
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
});

/**
 * POST /api/articles/:id/comments
 * Add an editorial comment and record an audit timeline event atomically.
 */
router.post('/:id/comments', async (req, res, next) => {
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
});

// ----------------------------------------------------
// TIMELINE ENDPOINT
// ----------------------------------------------------

/**
 * GET /api/articles/:id/timeline
 * Retrieve immutable audit timeline events for an article.
 */
router.get('/:id/timeline', async (req, res, next) => {
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
});

export default router;
