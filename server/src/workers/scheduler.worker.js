import { prisma } from '../prisma.js';
import { config } from '../config/index.js';
import { publishArticle, SYSTEM_ACTOR } from '../services/workflow.service.js';

let workerIntervalId = null;
let isCycleRunning = false;
let totalCyclesRun = 0;
let lastRunAt = null;
let lastResult = null;

/**
 * Retrieves the current database clock time from PostgreSQL.
 * Protects against application server and database server clock drift.
 */
export async function getDatabaseClock() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as now`;
    if (result && result[0] && result[0].now) {
      return new Date(result[0].now);
    }
  } catch (error) {
    console.warn('[Scheduler Worker] Failed to fetch database clock, falling back to local clock:', error.message);
  }
  return new Date();
}

/**
 * Finds and publishes all articles currently in SCHEDULED state whose publishAt is due.
 *
 * Concurrency & Idempotency Safeguards:
 * 1. Database Clock: Evaluates publication due status against PostgreSQL NOW().
 * 2. Schedule Sequence Validation: Validates article.scheduleSequence to abort stale publications
 *    if an editor rescheduled or canceled the article while the worker was polling.
 * 3. Optimistic Concurrency Control: Leverages article.version inside the transactional publishArticle
 *    state machine to guarantee that concurrent workers or simultaneous manual edits never create duplicate
 *    revisions or timeline events.
 * 4. Revision Integrity: Publishes only the approved and scheduled revision.
 * 5. Safe System Actor: Uses SYSTEM_ACTOR (actorName: "System Scheduler", actorId: null) to satisfy
 *    authorization checks and audit immutability without impersonating a normal user.
 *
 * @param {Object} options
 * @param {Date} [options.now] - Optional reference time override (e.g. for testing)
 * @param {number} [options.batchSize] - Max articles to process in this cycle
 * @param {Object} [options.actor] - System actor context
 * @returns {Promise<Object>} Execution summary
 */
export async function processDueScheduledArticles({
  now = null,
  batchSize = config.schedulerBatchSize || 50,
  actor = SYSTEM_ACTOR,
} = {}) {
  const startTime = Date.now();
  const effectiveNow = now || (await getDatabaseClock());

  // Find articles that are SCHEDULED and due
  const dueArticles = await prisma.article.findMany({
    where: {
      status: 'SCHEDULED',
      publishAt: { lte: effectiveNow },
    },
    orderBy: { publishAt: 'asc' },
    take: batchSize,
    select: {
      id: true,
      title: true,
      status: true,
      scheduleSequence: true,
      version: true,
      publishAt: true,
    },
  });

  const published = [];
  const skipped = [];
  const failed = [];

  for (const article of dueArticles) {
    try {
      // Reuses core publication state machine with sequence lock and reference time
      const result = await publishArticle({
        articleId: article.id,
        user: actor,
        expectedScheduleSequence: article.scheduleSequence,
        referenceTime: effectiveNow,
      });

      published.push({
        id: article.id,
        title: article.title,
        publishedAt: result.publishedAt,
        publishedRevisionId: result.publishedRevision?.id || null,
      });
    } catch (err) {
      // 409 Conflict: Concurrent modification, already published, or schedule sequence mismatch
      // 400 Bad Request: State changed (e.g. unpublished to DRAFT) or rescheduled to the future
      if (err.statusCode === 409 || err.statusCode === 400) {
        skipped.push({
          id: article.id,
          title: article.title,
          reason: err.message,
          code: err.statusCode,
        });
      } else {
        // Unexpected system failure: log safely without leaking sensitive information
        failed.push({
          id: article.id,
          title: article.title,
          error: err.message || 'Unknown error occurred during publication',
        });
        console.error(`[Scheduler Worker] Error publishing article ${article.id}:`, err.message);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const summary = {
    processedCount: dueArticles.length,
    publishedCount: published.length,
    skippedCount: skipped.length,
    failedCount: failed.length,
    published,
    skipped,
    failed,
    referenceTime: effectiveNow.toISOString(),
    durationMs,
  };

  lastRunAt = new Date().toISOString();
  lastResult = summary;
  totalCyclesRun++;

  return summary;
}

/**
 * Executes a single protected scheduler cycle, preventing overlapping runs.
 */
export async function runSchedulerCycle() {
  if (isCycleRunning) {
    return {
      skippedDueToOverlap: true,
      message: 'Previous scheduler cycle is still executing. Skipping tick.',
    };
  }

  isCycleRunning = true;
  try {
    return await processDueScheduledArticles();
  } catch (err) {
    console.error('[Scheduler Worker] Unhandled exception in scheduler cycle:', err.message);
    return {
      unhandledError: true,
      error: err.message,
    };
  } finally {
    isCycleRunning = false;
  }
}

/**
 * Starts the in-process background scheduled publishing worker.
 */
export function startSchedulerWorker({ intervalMs = config.schedulerIntervalMs || 30000 } = {}) {
  if (workerIntervalId) {
    return { isRunning: true, intervalMs, alreadyRunning: true };
  }

  console.log(`[Scheduler Worker] Starting background publishing worker (interval: ${intervalMs}ms)`);

  // Run initial cycle shortly after startup (non-blocking)
  setTimeout(() => {
    runSchedulerCycle().catch((err) => {
      console.error('[Scheduler Worker] Startup cycle error:', err.message);
    });
  }, 2000);

  workerIntervalId = setInterval(async () => {
    await runSchedulerCycle();
  }, intervalMs);

  return { isRunning: true, intervalMs, started: true };
}

/**
 * Stops the in-process background scheduled publishing worker gracefully.
 */
export function stopSchedulerWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log('[Scheduler Worker] Background publishing worker stopped.');
    return { isRunning: false, stopped: true };
  }
  return { isRunning: false, stopped: false };
}

/**
 * Returns current scheduler operational status.
 */
export function getSchedulerStatus() {
  return {
    isRunning: Boolean(workerIntervalId),
    isCycleRunning,
    intervalMs: config.schedulerIntervalMs,
    batchSize: config.schedulerBatchSize,
    totalCyclesRun,
    lastRunAt,
    lastResult,
  };
}
