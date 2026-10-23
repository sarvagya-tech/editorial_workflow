import { prisma } from '../prisma.js';
import { getOverdueAlerts } from './alert.service.js';

/**
 * Computes the Monday 00:00:00.000Z start of the week and Sunday 23:59:59.999Z end of the week in UTC.
 */
export function getUtcWeekBoundaries(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diffToMonday, 0, 0, 0, 0)
  );
  const sunday = new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6, 23, 59, 59, 999)
  );

  return { monday, sunday };
}

/**
 * Returns an array of the last 8 calendar weeks ending with the current week (oldest to newest).
 */
export function getLastEightWeeks(referenceDate = new Date()) {
  const { monday: currentMonday } = getUtcWeekBoundaries(referenceDate);
  const weeks = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(
      Date.UTC(
        currentMonday.getUTCFullYear(),
        currentMonday.getUTCMonth(),
        currentMonday.getUTCDate() - i * 7,
        0,
        0,
        0,
        0
      )
    );
    const weekEnd = new Date(
      Date.UTC(
        weekStart.getUTCFullYear(),
        weekStart.getUTCMonth(),
        weekStart.getUTCDate() + 6,
        23,
        59,
        59,
        999
      )
    );
    const weekLabel = weekStart.toISOString().split('T')[0];

    weeks.push({
      weekStart,
      weekEnd,
      weekLabel,
    });
  }

  return weeks;
}

/**
 * Retrieve comprehensive newsroom dashboard metrics scoped by caller authorization.
 */
export async function getDashboardMetrics({ user, referenceDate = new Date() }) {
  // 1. Role Scoping:
  // - Writers: only see articles they authored OR articles in active sections assigned to them
  // - Editors: see newsroom-wide articles in active sections
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
      section: {
        isArchived: false,
      },
      OR: [
        { authorId: user.id },
        { sectionId: { in: assignedSectionIds } },
      ],
    };
  } else {
    baseWhere = {
      section: {
        isArchived: false,
      },
    };
  }

  // 2. Week Boundaries
  const { monday: currentWeekStart, sunday: currentWeekEnd } = getUtcWeekBoundaries(referenceDate);
  const eightWeeks = getLastEightWeeks(referenceDate);

  // 3. Summary Metric Counts (executed concurrently)
  const [inReview, openDrafts, scheduledThisWeek, publishedThisWeek] = await Promise.all([
    prisma.article.count({
      where: {
        ...baseWhere,
        status: 'IN_REVIEW',
      },
    }),
    prisma.article.count({
      where: {
        ...baseWhere,
        status: 'DRAFT',
      },
    }),
    prisma.article.count({
      where: {
        ...baseWhere,
        status: 'SCHEDULED',
        publishAt: {
          gte: currentWeekStart,
          lte: currentWeekEnd,
        },
      },
    }),
    prisma.article.count({
      where: {
        ...baseWhere,
        status: 'PUBLISHED',
        publishedAt: {
          gte: currentWeekStart,
          lte: currentWeekEnd,
        },
      },
    }),
  ]);

  // 4. Status Breakdown: canonical list covering all 5 workflow states
  const CANONICAL_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'];

  const statusGroups = await prisma.article.groupBy({
    by: ['status'],
    where: baseWhere,
    _count: {
      id: true,
    },
  });

  const statusMap = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count.id])
  );

  const byStatus = CANONICAL_STATUSES.map((status) => ({
    status,
    count: statusMap[status] || 0,
  }));

  // 5. Section Breakdown: active sections accessible to caller
  const sectionFilter = user.role === 'WRITER'
    ? { isArchived: false, assignments: { some: { writerId: user.id } } }
    : { isArchived: false };

  const accessibleSections = await prisma.section.findMany({
    where: sectionFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const sectionGroups = await prisma.article.groupBy({
    by: ['sectionId'],
    where: baseWhere,
    _count: {
      id: true,
    },
  });

  const sectionMap = Object.fromEntries(
    sectionGroups.map((g) => [g.sectionId, g._count.id])
  );

  const bySection = accessibleSections.map((sec) => ({
    sectionId: sec.id,
    sectionName: sec.name,
    count: sectionMap[sec.id] || 0,
  }));

  // If writer authored articles in sections where they are no longer assigned, include those sections as well
  const includedSectionIds = new Set(accessibleSections.map((s) => s.id));
  for (const g of sectionGroups) {
    if (!includedSectionIds.has(g.sectionId)) {
      const extraSec = await prisma.section.findUnique({
        where: { id: g.sectionId },
        select: { id: true, name: true },
      });
      if (extraSec) {
        bySection.push({
          sectionId: extraSec.id,
          sectionName: extraSec.name,
          count: g._count.id,
        });
      }
    }
  }

  // 6. Eight-Week Publication Trend (Chronological oldest to newest)
  const weeklyPublications = await Promise.all(
    eightWeeks.map(async ({ weekStart, weekEnd, weekLabel }) => {
      const count = await prisma.article.count({
        where: {
          ...baseWhere,
          status: 'PUBLISHED',
          publishedAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      });
      return {
        weekStart: weekLabel,
        count,
      };
    })
  );

  // 7. Active Overdue Alerts
  const overdueData = await getOverdueAlerts({ user, now: referenceDate });

  return {
    summary: {
      inReview,
      scheduledThisWeek,
      publishedThisWeek,
      openDrafts,
      overdueAlerts: overdueData.total,
    },
    overdueAlerts: overdueData.alerts,
    byStatus,
    bySection,
    weeklyPublications,
  };
}
