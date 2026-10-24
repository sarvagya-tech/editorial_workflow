// server/src/routes/article.routes.js
import { Router } from 'express';
import { authenticate, requireEditor } from '../middleware/auth.js';
import * as articleController from '../controllers/article.controller.js';

const router = Router();

// All article endpoints require authentication
router.use(authenticate);

// ----------------------------------------------------
// Bulk Operations
// ----------------------------------------------------
router.post('/bulk/schedule', requireEditor, articleController.bulkSchedule);
router.post('/bulk/unpublish', requireEditor, articleController.bulkUnpublish);

// ----------------------------------------------------
// Article CRUD & Core Details
// ----------------------------------------------------
router.post('/', articleController.createArticle);
router.get('/', articleController.listArticles);
router.get('/:id', articleController.getArticleById);
router.patch('/:id', articleController.updateArticle);
router.delete('/:id', articleController.deleteArticle);

// ----------------------------------------------------
// Workflow State Transitions
// ----------------------------------------------------
router.post('/:id/submit', articleController.submitArticle);
router.post('/:id/approve', articleController.approveArticle);
router.post('/:id/schedule', articleController.scheduleArticle);
router.post('/:id/publish', articleController.publishArticle);
router.post('/:id/unpublish', articleController.unpublishArticle);

// ----------------------------------------------------
// Overdue Alert Dismissal
// ----------------------------------------------------
router.post('/:id/alerts/dismiss', requireEditor, articleController.dismissArticleAlert);

// ----------------------------------------------------
// Revisions
// ----------------------------------------------------
router.get('/:id/revisions', articleController.listRevisions);
router.get('/:id/revisions/:revisionId', articleController.getRevisionById);
router.post('/:id/revisions', articleController.createRevision);

// ----------------------------------------------------
// Editorial Comments
// ----------------------------------------------------
router.get('/:id/comments', articleController.listComments);
router.post('/:id/comments', articleController.createComment);

// ----------------------------------------------------
// Immutable Audit Timeline Events
// ----------------------------------------------------
router.get('/:id/timeline', articleController.listTimelineEvents);

export default router;
