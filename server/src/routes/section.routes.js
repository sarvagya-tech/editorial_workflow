// server/src/routes/section.routes.js
import { Router } from 'express';
import { authenticate, requireEditor } from '../middleware/auth.js';
import * as sectionController from '../controllers/section.controller.js';

const router = Router();

// All section endpoints require authentication
router.use(authenticate);

// Section CRUD & Archival
router.post('/', requireEditor, sectionController.createSection);
router.get('/', sectionController.listSections);
router.get('/:id', sectionController.getSectionById);
router.patch('/:id', requireEditor, sectionController.updateSection);
router.patch('/:id/archive', requireEditor, sectionController.archiveSection);
router.patch('/:id/restore', requireEditor, sectionController.restoreSection);

// Section Writer Assignments
router.get('/:id/assignments', sectionController.listAssignments);
router.post('/:id/assignments', requireEditor, sectionController.assignWriter);
router.delete('/:id/assignments/:writerId', requireEditor, sectionController.removeWriter);

export default router;
