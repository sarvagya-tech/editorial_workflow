import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateRequired, validateString, validateOptionalString } from '../utils/validator.js';

export class SectionService {
  /**
   * Create a new editorial section (Editor only).
   */
  static async createSection({ name, description, ownerEditorId, actorId }) {
    validateRequired({ name, ownerEditorId }, ['name', 'ownerEditorId']);
    const trimmedName = validateString(name, 'name', 2, 80);
    const trimmedDesc = validateOptionalString(description, 'description', 1000);

    // 1. Verify owner exists and has role EDITOR
    const owner = await prisma.user.findUnique({
      where: { id: ownerEditorId },
      select: { id: true, name: true, role: true, email: true },
    });

    if (!owner) {
      throw new AppError('Assigned section owner not found.', 404);
    }

    if (owner.role !== 'EDITOR') {
      throw new AppError(
        `Invalid section owner: User '${owner.name}' has role '${owner.role}'. Section owners must have the EDITOR role.`,
        400
      );
    }

    // 2. Prevent duplicate section names
    const existing = await prisma.section.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      throw new AppError(`A section with the name '${trimmedName}' already exists.`, 409);
    }

    // 3. Create section
    const section = await prisma.section.create({
      data: {
        name: trimmedName,
        description: trimmedDesc || '',
        ownerEditorId: owner.id,
      },
      include: {
        ownerEditor: { select: { id: true, name: true, email: true } },
        _count: { select: { articles: true, assignments: true } },
      },
    });

    return section;
  }

  /**
   * List sections with role-based scoping and archive filters.
   */
  static async listSections({ user, includeArchived = false, archivedOnly = false }) {
    if (user.role === 'EDITOR') {
      let where = {};
      if (archivedOnly) {
        where.isArchived = true;
      } else if (!includeArchived) {
        where.isArchived = false;
      }

      const sections = await prisma.section.findMany({
        where,
        include: {
          ownerEditor: { select: { id: true, name: true, email: true } },
          _count: { select: { articles: true, assignments: true } },
        },
        orderBy: { name: 'asc' },
      });

      return sections;
    }

    // For writers: ONLY sections assigned to them and NOT archived
    const sections = await prisma.section.findMany({
      where: {
        isArchived: false,
        assignments: {
          some: { writerId: user.id },
        },
      },
      include: {
        ownerEditor: { select: { id: true, name: true, email: true } },
        _count: { select: { articles: true } },
      },
      orderBy: { name: 'asc' },
    });

    return sections;
  }

  /**
   * Get single section details with non-disclosure protection for unauthorized writers.
   */
  static async getSectionById({ sectionId, user }) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        ownerEditor: { select: { id: true, name: true, email: true } },
        _count: { select: { articles: true, assignments: true } },
      },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    // If writer, verify assignment and active status.
    // Return 404 if not permitted to prevent ID enumeration.
    if (user.role === 'WRITER') {
      if (section.isArchived) {
        throw new AppError('Section not found.', 404);
      }

      const assignment = await prisma.sectionAssignment.findUnique({
        where: {
          sectionId_writerId: {
            sectionId,
            writerId: user.id,
          },
        },
      });

      if (!assignment) {
        throw new AppError('Section not found.', 404);
      }
    }

    return section;
  }

  /**
   * Update section name, description, or owner (Editor only).
   */
  static async updateSection({ sectionId, data }) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    const updateData = {};

    if (data.name !== undefined) {
      const trimmedName = validateString(data.name, 'name', 2, 80);
      if (trimmedName !== section.name) {
        const existing = await prisma.section.findFirst({
          where: { name: trimmedName, id: { not: sectionId } },
        });
        if (existing) {
          throw new AppError(`A section with the name '${trimmedName}' already exists.`, 409);
        }
        updateData.name = trimmedName;
      }
    }

    if (data.description !== undefined) {
      updateData.description = validateOptionalString(data.description, 'description', 1000) || '';
    }

    if (data.ownerEditorId !== undefined) {
      const newOwner = await prisma.user.findUnique({
        where: { id: data.ownerEditorId },
        select: { id: true, name: true, role: true },
      });

      if (!newOwner) {
        throw new AppError('New section owner not found.', 404);
      }

      if (newOwner.role !== 'EDITOR') {
        throw new AppError(
          `Invalid section owner: User '${newOwner.name}' has role '${newOwner.role}'. Section owners must have the EDITOR role.`,
          400
        );
      }

      updateData.ownerEditorId = newOwner.id;
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: updateData,
      include: {
        ownerEditor: { select: { id: true, name: true, email: true } },
        _count: { select: { articles: true, assignments: true } },
      },
    });

    return updated;
  }

  /**
   * Archive section (Editor only, soft-archive, idempotent).
   */
  static async archiveSection({ sectionId }) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    if (section.isArchived) {
      return { message: 'Section is already archived.', section };
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: { isArchived: true },
      include: {
        ownerEditor: { select: { id: true, name: true, email: true } },
      },
    });

    return { message: 'Section archived successfully.', section: updated };
  }

  /**
   * Restore an archived section (Editor only, idempotent).
   */
  static async restoreSection({ sectionId }) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    if (!section.isArchived) {
      return { message: 'Section is already active.', section };
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: { isArchived: false },
      include: {
        ownerEditor: { select: { id: true, name: true, email: true } },
      },
    });

    return { message: 'Section restored successfully.', section: updated };
  }

  /**
   * List assignments for a section.
   * Editors see all assignments; Writers only see their own assignment record.
   */
  static async listAssignments({ sectionId, user }) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    if (user.role === 'WRITER') {
      if (section.isArchived) {
        throw new AppError('Section not found.', 404);
      }

      const ownAssignment = await prisma.sectionAssignment.findUnique({
        where: {
          sectionId_writerId: {
            sectionId,
            writerId: user.id,
          },
        },
        include: {
          writer: { select: { id: true, name: true, email: true } },
        },
      });

      if (!ownAssignment) {
        throw new AppError('Section not found.', 404);
      }

      return {
        sectionId,
        isAssigned: true,
        assignments: [ownAssignment],
      };
    }

    // Editor sees all assignments
    const assignments = await prisma.sectionAssignment.findMany({
      where: { sectionId },
      include: {
        writer: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      sectionId,
      assignments,
      total: assignments.length,
    };
  }

  /**
   * Assign a writer to a section (Editor only).
   */
  static async assignWriter({ sectionId, writerId, actorId }) {
    validateRequired({ writerId }, ['writerId']);

    // 1. Verify section exists and is active
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    if (section.isArchived) {
      throw new AppError('Cannot assign writers to an archived section. Please restore the section first.', 400);
    }

    // 2. Verify target user exists and has role WRITER
    const writer = await prisma.user.findUnique({
      where: { id: writerId },
      select: { id: true, name: true, role: true, email: true },
    });

    if (!writer) {
      throw new AppError('Target writer not found.', 404);
    }

    if (writer.role !== 'WRITER') {
      throw new AppError(
        `Invalid assignment: User '${writer.name}' has role '${writer.role}'. Only users with the WRITER role can be assigned to sections.`,
        400
      );
    }

    // 3. Prevent duplicate assignment
    const existing = await prisma.sectionAssignment.findUnique({
      where: {
        sectionId_writerId: {
          sectionId,
          writerId,
        },
      },
    });

    if (existing) {
      throw new AppError(`Writer '${writer.name}' is already assigned to this section.`, 409);
    }

    // 4. Create assignment
    const assignment = await prisma.sectionAssignment.create({
      data: {
        sectionId,
        writerId,
        assignedById: actorId,
      },
      include: {
        writer: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    });

    return assignment;
  }

  /**
   * Remove a writer from a section (Editor only).
   * Does NOT delete articles written by the writer.
   */
  static async removeWriter({ sectionId, writerId }) {
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    const assignment = await prisma.sectionAssignment.findUnique({
      where: {
        sectionId_writerId: {
          sectionId,
          writerId,
        },
      },
    });

    if (!assignment) {
      throw new AppError('Assignment not found: Writer is not currently assigned to this section.', 404);
    }

    await prisma.sectionAssignment.delete({
      where: { id: assignment.id },
    });

    return { message: 'Writer removed from section successfully.' };
  }
}
