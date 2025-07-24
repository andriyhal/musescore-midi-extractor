export class BatchQueue {
    constructor(batchSize, onBatchReady, flushIntervalMs = 30000) {
        this.batchSize = batchSize;
        this.onBatchReady = onBatchReady;
        this.queue = [];
        this.processing = false;
        this.flushIntervalMs = flushIntervalMs;
        this._resetFlushTimer();
    }

    async add(item) {
        this.queue.push(item);
        if (this.queue.length >= this.batchSize && !this.processing) {
            await this.flush();
        } else {
            this._resetFlushTimer();
        }
    }

    async flush(force = false) {
        if (this.processing) return;
        if (this.queue.length === 0) return;
        if (!force && this.queue.length < this.batchSize) return;

        this.processing = true;
        const batch = this.queue.splice(0, this.batchSize);
        try {
            await this.onBatchReady(batch);
        } catch (e) {
            console.error("Batch update error:", e);
        }
        this.processing = false;
        if (this.queue.length > 0) {
            this._resetFlushTimer();
        }
    }

    _resetFlushTimer() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            this.flush(true);
        }, this.flushIntervalMs);
    }
}
