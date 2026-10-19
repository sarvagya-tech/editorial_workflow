import { Router } from 'express';
import { SectionService } from '../services/section.service.js';
import { authenticate, requireEditor } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/sections
 * Create a new section (Editor only).
 */
router.post('/', authenticate, requireEditor, async (req, res, next) => {
  try {
    const { name, description, ownerEditorId } = req.body || {};
    const section = await SectionService.createSection({
      name,
      description,
      ownerEditorId,
      actorId: req.user.id,
    });
    res.status(201).json(section);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sections
 * List sections (scoped: Writers only see assigned active; Editors see all or filtered).
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const archivedOnly = req.query.archived === 'true';

    const sections = await SectionService.listSections({
      user: req.user,
      includeArchived,
      archivedOnly,
    });
    res.json(sections);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sections/:id
 * Get section details (Writers only if assigned and active; Editors allowed).
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const section = await SectionService.getSectionById({
      sectionId: req.params.id,
      user: req.user,
    });
    res.json(section);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/sections/:id
 * Update section name, description, or owner (Editor only).
 */
router.patch('/:id', authenticate, requireEditor, async (req, res, next) => {
  try {
    const updated = await SectionService.updateSection({
      sectionId: req.params.id,
      data: req.body || {},
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/sections/:id/archive
 * Soft-archive a section (Editor only, idempotent).
 */
router.patch('/:id/archive', authenticate, requireEditor, async (req, res, next) => {
  try {
    const result = await SectionService.archiveSection({
      sectionId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/sections/:id/restore
 * Restore an archived section (Editor only, idempotent).
 */
router.patch('/:id/restore', authenticate, requireEditor, async (req, res, next) => {
  try {
    const result = await SectionService.restoreSection({
      sectionId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sections/:id/assignments
 * List assignments for a section (Editors see all; Writers only see own).
 */
router.get('/:id/assignments', authenticate, async (req, res, next) => {
  try {
    const result = await SectionService.listAssignments({
      sectionId: req.params.id,
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sections/:id/assignments
 * Assign a writer to an active section (Editor only).
 */
router.post('/:id/assignments', authenticate, requireEditor, async (req, res, next) => {
  try {
    const { writerId } = req.body || {};
    const assignment = await SectionService.assignWriter({
      sectionId: req.params.id,
      writerId,
      actorId: req.user.id,
    });
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/sections/:id/assignments/:writerId
 * Remove a writer from a section (Editor only).
 */
router.delete('/:id/assignments/:writerId', authenticate, requireEditor, async (req, res, next) => {
  try {
    const result = await SectionService.removeWriter({
      sectionId: req.params.id,
      writerId: req.params.writerId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
