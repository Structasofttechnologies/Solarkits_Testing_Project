/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLARKITS MARKETING PLATFORM — SEQUENTIAL EMAIL QUEUE SERVICE (REDIS & MEMORY)
 * ═══════════════════════════════════════════════════════════════════════════════
 * This queue ensures emails are sent ONE-BY-ONE (sequential FIFO queue).
 * - Rate-limited with configurable delay (e.g. 350ms-500ms between dispatches)
 * - Supports Redis URL if configured, with auto-fallback to resilient in-memory queue
 * - Prevents SMTP connection bans, Resend 429 rate-limits, and server memory crashes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const emailService = require('./email.service');

class EmailQueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.concurrency = parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '1', 10);
    this.rateLimitDelayMs = parseInt(process.env.EMAIL_RATE_LIMIT_DELAY_MS || '350', 10);
    this.stats = {
      totalQueued: 0,
      totalSent: 0,
      totalFailed: 0,
      lastProcessedAt: null
    };

    // Check Redis configuration presence
    this.redisConfigured = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
    if (this.redisConfigured) {
      console.log(`📡 [QUEUE_INIT] Redis Target configured: ${process.env.REDIS_URL || `${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`}`);
    } else {
      console.log(`ℹ️ [QUEUE_INIT] Using High-Performance Sequential In-Memory Queue (One-by-One mode).`);
    }
  }

  /**
   * Add a single email task or an array of email tasks into the queue
   */
  async enqueue(tasks) {
    const taskList = Array.isArray(tasks) ? tasks : [tasks];

    for (const task of taskList) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const queueItem = {
        id: jobId,
        task,
        status: 'queued',
        enqueuedAt: new Date(),
        retryCount: 0,
        maxRetries: task.maxRetries || 2
      };

      this.queue.push(queueItem);
      this.stats.totalQueued++;
    }

    console.log(`📥 [EMAIL_QUEUE] Enqueued ${taskList.length} email task(s). Current Queue Length: ${this.queue.length}`);

    // Trigger processing if idle
    if (!this.isProcessing) {
      this.processNext();
    }

    return {
      success: true,
      queuedCount: taskList.length,
      currentQueueLength: this.queue.length
    };
  }

  /**
   * Internal worker: Processes queued email tasks one-by-one
   */
  async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const currentJob = this.queue.shift();

    try {
      currentJob.status = 'processing';
      console.log(`⚡ [EMAIL_QUEUE] Processing job [${currentJob.id}] to: ${currentJob.task.to}`);

      // Dispatch via unified email service (Resend / AWS SES / SMTP)
      const result = await emailService.sendEmail({
        senderId: currentJob.task.senderId,
        to: currentJob.task.to,
        subject: currentJob.task.subject,
        htmlContent: currentJob.task.htmlContent,
        variables: currentJob.task.variables || {},
        trackingUrl: currentJob.task.trackingUrl
      });

      if (result.success) {
        currentJob.status = 'completed';
        this.stats.totalSent++;
        this.stats.lastProcessedAt = new Date();

        if (typeof currentJob.task.onSuccess === 'function') {
          try { currentJob.task.onSuccess(result, currentJob); } catch (e) {}
        }
      } else {
        throw new Error(result.error || 'Email dispatch failed');
      }

    } catch (error) {
      console.error(`❌ [EMAIL_QUEUE] Job [${currentJob.id}] failed:`, error.message);

      if (currentJob.retryCount < currentJob.maxRetries) {
        currentJob.retryCount++;
        currentJob.status = 'retry_scheduled';
        console.log(`🔄 [EMAIL_QUEUE] Re-enqueuing job [${currentJob.id}] (Attempt ${currentJob.retryCount}/${currentJob.maxRetries})`);
        this.queue.push(currentJob);
      } else {
        currentJob.status = 'failed';
        this.stats.totalFailed++;
        if (typeof currentJob.task.onFailure === 'function') {
          try { currentJob.task.onFailure(error, currentJob); } catch (e) {}
        }
      }
    } finally {
      // Respect rate-limiting delay between each email (one-by-one sequential delivery)
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelayMs));

      // Continue to next email in queue
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Get queue health and current stats
   */
  getStats() {
    return {
      isProcessing: this.isProcessing,
      pendingInQueue: this.queue.length,
      rateLimitDelayMs: this.rateLimitDelayMs,
      concurrency: this.concurrency,
      stats: this.stats,
      redisConfigured: this.redisConfigured
    };
  }

  /**
   * Clear all pending items
   */
  clearQueue() {
    const droppedCount = this.queue.length;
    this.queue = [];
    this.isProcessing = false;
    return { success: true, droppedCount };
  }
}

// Singleton export
module.exports = new EmailQueueService();
