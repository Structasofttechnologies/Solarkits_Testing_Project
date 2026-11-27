/**
 * Sequential FIFO queue for Email and Campaign dispatches with rate limiting,
 * automatic retries, per-campaign cancellation, and recent error history.
 */
const emailService = require('./email.service');

class EmailQueueService {
  constructor() {
    this.queue = [];
    this.recentHistory = [];
    this.isProcessing = false;
    this.concurrency = parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '1', 10);
    this.rateLimitDelayMs = parseInt(process.env.EMAIL_RATE_LIMIT_DELAY_MS || '350', 10);
    this.stats = {
      totalQueued: 0,
      totalSent: 0,
      totalFailed: 0,
      lastProcessedAt: null,
      lastError: null
    };

    this.redisConfigured = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
    if (this.redisConfigured) {
      console.log(`📡 [QUEUE_INIT] Redis Target configured: ${process.env.REDIS_URL || `${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`}`);
    } else {
      console.log(`ℹ️ [QUEUE_INIT] Using Sequential In-Memory Marketing Queue (Rate-limit delay: ${this.rateLimitDelayMs}ms).`);
    }
  }

  _recordHistory(entry) {
    this.recentHistory.unshift(entry);
    if (this.recentHistory.length > 50) {
      this.recentHistory.length = 50;
    }
  }

  /**
   * Add a single job or array of jobs into the sequential queue.
   * Tasks may provide a custom async `run(job)` handler or standard `sendEmail` payload fields.
   */
  async enqueue(tasks) {
    const taskList = Array.isArray(tasks) ? tasks : [tasks];

    for (const task of taskList) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const queueItem = {
        id: jobId,
        campaignId: task.campaignId ? String(task.campaignId) : null,
        task,
        status: 'queued',
        enqueuedAt: new Date(),
        retryCount: 0,
        maxRetries: task.maxRetries !== undefined ? Number(task.maxRetries) : 1
      };

      this.queue.push(queueItem);
      this.stats.totalQueued++;
    }

    console.log(`📥 [MARKETING_QUEUE] Enqueued ${taskList.length} job(s). Queue depth: ${this.queue.length}`);

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
   * Internal sequential worker processing queued jobs one-by-one.
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
      const targetLabel = currentJob.task.to || currentJob.task.phone || currentJob.id;
      console.log(`⚡ [MARKETING_QUEUE] Processing [${currentJob.id}] -> ${targetLabel} (attempt ${currentJob.retryCount + 1})`);

      let result;
      if (typeof currentJob.task.run === 'function') {
        result = await currentJob.task.run(currentJob);
      } else {
        result = await emailService.sendEmail({
          senderId: currentJob.task.senderId,
          purpose: currentJob.task.purpose,
          to: currentJob.task.to,
          subject: currentJob.task.subject,
          htmlContent: currentJob.task.htmlContent,
          variables: currentJob.task.variables || {},
          trackingUrl: currentJob.task.trackingUrl,
          unsubscribeUrl: currentJob.task.unsubscribeUrl,
          campaignId: currentJob.task.campaignId || null,
          templateId: currentJob.task.templateId || null,
          epcId: currentJob.task.epcId || null,
          leadId: currentJob.task.leadId || null,
          recipientName: currentJob.task.recipientName || null,
          sourceType: currentJob.task.sourceType || (currentJob.retryCount > 0 ? 'queue_retry' : 'campaign'),
          jobId: currentJob.id,
          attempt: currentJob.retryCount + 1
        });
      }

      if (result && result.cancelled) {
        currentJob.status = 'cancelled';
        this._recordHistory({
          id: currentJob.id,
          campaignId: currentJob.campaignId,
          target: targetLabel,
          status: 'cancelled',
          timestamp: new Date()
        });
      } else if (result && result.skipped) {
        currentJob.status = 'skipped';
        if (typeof currentJob.task.onComplete === 'function') {
          try { await currentJob.task.onComplete(result, currentJob); } catch (_) {}
        }
      } else if (result && result.success) {
        currentJob.status = 'completed';
        this.stats.totalSent++;
        this.stats.lastProcessedAt = new Date();
        this._recordHistory({
          id: currentJob.id,
          campaignId: currentJob.campaignId,
          target: targetLabel,
          provider: result.provider || null,
          status: 'completed',
          timestamp: new Date()
        });

        if (typeof currentJob.task.onSuccess === 'function') {
          try { await currentJob.task.onSuccess(result, currentJob); } catch (_) {}
        }
        if (typeof currentJob.task.onComplete === 'function') {
          try { await currentJob.task.onComplete(result, currentJob); } catch (_) {}
        }
      } else {
        const err = new Error(result?.error || 'Dispatch failed');
        err.code = result?.errorCode || 'DISPATCH_FAILED';
        err.result = result;
        throw err;
      }
    } catch (error) {
      const targetLabel = currentJob.task.to || currentJob.task.phone || currentJob.id;
      console.error(`❌ [MARKETING_QUEUE] Job [${currentJob.id}] failed (${error.message})`);

      const nonRetryableCodes = ['INVALID_RECIPIENT', 'NO_EMAIL_PROVIDER_CONFIGURED', 'MISSING_META_CREDENTIALS', 'SENDER_NOT_AVAILABLE', 'SENDER_CONFIG_ERROR'];
      const canRetry = !nonRetryableCodes.includes(error.code) && currentJob.retryCount < currentJob.maxRetries;

      if (canRetry) {
        currentJob.retryCount++;
        currentJob.status = 'retry_scheduled';
        console.log(`🔄 [MARKETING_QUEUE] Re-enqueuing [${currentJob.id}] (Attempt ${currentJob.retryCount + 1}/${currentJob.maxRetries + 1})`);
        this.queue.push(currentJob);
      } else {
        currentJob.status = 'failed';
        this.stats.totalFailed++;
        this.stats.lastProcessedAt = new Date();
        this.stats.lastError = error.message;
        this._recordHistory({
          id: currentJob.id,
          campaignId: currentJob.campaignId,
          target: targetLabel,
          provider: error.result?.provider || null,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });

        if (typeof currentJob.task.onFailure === 'function') {
          try { await currentJob.task.onFailure(error, currentJob); } catch (_) {}
        }
        if (typeof currentJob.task.onComplete === 'function') {
          try { await currentJob.task.onComplete(error.result || { success: false, error: error.message }, currentJob); } catch (_) {}
        }
      }
    } finally {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimitDelayMs));
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Drop any queued (not yet started) jobs belonging to a paused/cancelled campaign.
   */
  clearCampaignJobs(campaignId) {
    if (!campaignId) return { removed: 0 };
    const idStr = String(campaignId);
    const before = this.queue.length;
    this.queue = this.queue.filter((item) => item.campaignId !== idStr);
    const removed = before - this.queue.length;
    if (removed > 0) {
      console.log(`🛑 [MARKETING_QUEUE] Removed ${removed} queued job(s) for campaign ${idStr}`);
    }
    return { removed };
  }

  /**
   * Get queue health, stats, and recent history.
   */
  getStats() {
    return {
      isProcessing: this.isProcessing,
      pendingInQueue: this.queue.length,
      rateLimitDelayMs: this.rateLimitDelayMs,
      concurrency: this.concurrency,
      stats: this.stats,
      recentHistory: this.recentHistory.slice(0, 20),
      redisConfigured: this.redisConfigured
    };
  }

  /**
   * Clear all pending items.
   */
  clearQueue() {
    const droppedCount = this.queue.length;
    this.queue = [];
    this.isProcessing = false;
    return { success: true, droppedCount };
  }
}

module.exports = new EmailQueueService();
