import { prisma } from '../prisma.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Sanitizes a CSV cell to prevent CSV Formula Injection (CWE-1236) and properly escape delimiters.
 * Any cell value starting with =, +, -, @, \t, or \r is prefixed with a single quote.
 * Values containing commas, double quotes, or newlines are wrapped in double quotes.
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  let str = String(value);

  // Spreadsheet formula injection mitigation: prepend single quote if starting with risky characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If the cell contains quotes, commas, newlines, or our formula protection quote, wrap in double quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.startsWith("'")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Parses and validates an optional date query parameter.
 */
function parseDateParam(dateStr, paramName, isEndOfDay = false) {
  if (!dateStr || typeof dateStr !== 'string') return undefined;

  let isoString = dateStr.trim();
  // If date format is YYYY-MM-DD, set appropriate time boundary
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
    isoString = isEndOfDay ? `${isoString}T23:59:59.999Z` : `${isoString}T00:00:00.000Z`;
  }

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new AppError(`Invalid '${paramName}' date format. Expected valid ISO-8601 date.`, 400);
  }

  return date;
}

/**
 * Queries raw calendar articles scoped by role authorization and optional date filters.
 */
async function getCalendarArticlesRaw({ from, to, sectionId, user }) {
  const fromDate = parseDateParam(from, 'from', false);
  const toDate = parseDateParam(to, 'to', true);

  if (fromDate && toDate && fromDate > toDate) {
    throw new AppError("'from' date must be before or equal to 'to' date.", 400);
  }

  const where = {
    AND: [
      { status: { in: ['SCHEDULED', 'PUBLISHED'] } },
    ],
  };

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

  if (sectionId) {
    where.AND.push({ sectionId });
  }

  // Date range filtering
  if (fromDate) {
    where.AND.push({
      OR: [
        { status: 'SCHEDULED', publishAt: { gte: fromDate } },
        { status: 'PUBLISHED', publishedAt: { gte: fromDate } },
      ],
    });
  }

  if (toDate) {
    where.AND.push({
      OR: [
        { status: 'SCHEDULED', publishAt: { lte: toDate } },
        { status: 'PUBLISHED', publishedAt: { lte: toDate } },
      ],
    });
  }

  const finalWhere = where.AND.length > 0 ? where : {};

  return prisma.article.findMany({
    where: finalWhere,
    orderBy: [
      { publishAt: 'asc' },
      { publishedAt: 'asc' },
      { id: 'asc' },
    ],
    include: {
      section: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, email: true } },
      publishedRevision: {
        select: { id: true, revisionNumber: true, title: true, publishedAt: true },
      },
      revisions: {
        orderBy: { revisionNumber: 'desc' },
        take: 1,
        select: { id: true, revisionNumber: true, title: true },
      },
    },
  });
}

/**
 * Returns calendar articles formatted as clean JSON objects for the frontend calendar view.
 */
export async function getCalendarArticles({ from, to, sectionId, user }) {
  const articles = await getCalendarArticlesRaw({ from, to, sectionId, user });
  return articles.map((art) => {
    const isPublished = art.status === 'PUBLISHED';
    return {
      id: art.id,
      title: isPublished ? (art.publishedRevision?.title || art.title) : (art.revisions[0]?.title || art.title),
      status: art.status,
      publishAt: art.publishAt,
      publishedAt: art.publishedAt,
      section: art.section,
      author: art.author,
      revisionNumber: isPublished ? (art.publishedRevision?.revisionNumber ?? 1) : (art.revisions[0]?.revisionNumber ?? 1),
    };
  });
}

/**
 * Generates an editorial calendar CSV export scoped by role authorization and optional filters.
 */
export async function exportCalendarCsv({ from, to, sectionId, user }) {
  const articles = await getCalendarArticlesRaw({ from, to, sectionId, user });

  // CSV Header
  const headers = [
    'Article ID',
    'Article Title',
    'Section Name',
    'Author Name',
    'Author Email',
    'Current Status',
    'Scheduled Publish Time',
    'Actual Published Time',
    'Revision Number',
  ];

  const rows = [headers.join(',')];

  for (const art of articles) {
    const isPublished = art.status === 'PUBLISHED';
    const activeTitle = isPublished
      ? (art.publishedRevision?.title || art.title)
      : (art.revisions[0]?.title || art.title);
    const revisionNumber = isPublished
      ? (art.publishedRevision?.revisionNumber ?? 1)
      : (art.revisions[0]?.revisionNumber ?? 1);

    const rowCells = [
      art.id,
      activeTitle,
      art.section?.name || '',
      art.author?.name || '',
      art.author?.email || '',
      art.status,
      art.publishAt ? art.publishAt.toISOString() : '',
      art.publishedAt ? art.publishedAt.toISOString() : '',
      revisionNumber,
    ];

    rows.push(rowCells.map(sanitizeCsvCell).join(','));
  }

  return rows.join('\r\n') + '\r\n';
}
