/**
 * Command Queue System
 * ระบบจัดคิวส่งคำสั่งแบบ Real-time
 * - ป้องกันการส่งคำสั่งชนกัน
 * - จัดลำดับความสำคัญ (Priority Queue)
 * - Retry เมื่อส่งไม่สำเร็จ
 * - Rate Limiting ป้องกัน Device Overload
 */

import EventEmitter from 'events';

// Priority Levels
export const PRIORITY = {
    CRITICAL: 1,    // คำสั่งเร่งด่วน (เช่น หยุดปั๊ม)
    HIGH: 2,        // คำสั่งสำคัญ (เช่น ถ่ายรูป)
    NORMAL: 3,      // คำสั่งทั่วไป
    LOW: 4          // คำสั่งไม่เร่งด่วน
};

// Command Status
export const CMD_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    TIMEOUT: 'timeout',
    CANCELLED: 'cancelled'
};

class CommandQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 2000;           // 2 วินาที
        this.commandTimeout = options.commandTimeout || 30000;   // 30 วินาที
        this.rateLimit = options.rateLimit || 1000;             // 1 คำสั่ง/วินาที ต่อ device
        this.maxQueueSize = options.maxQueueSize || 1000;
        
        // Queue Storage (Map by device_code)
        this.queues = new Map();           // device_code -> Array of commands
        this.processing = new Map();       // device_code -> current command
        this.lastSent = new Map();         // device_code -> timestamp
        this.commandHistory = new Map();   // commandId -> command details
        
        // Statistics
        this.stats = {
            totalEnqueued: 0,
            totalProcessed: 0,
            totalFailed: 0,
            totalRetried: 0
        };
        
        // Processing timers
        this.processingTimers = new Map();
        
        console.log('📋 Command Queue initialized');
    }

    /**
     * เพิ่มคำสั่งเข้าคิว
     */
    enqueue(device_code, command, options = {}) {
        const {
            priority = PRIORITY.NORMAL,
            timeout = this.commandTimeout,
            maxRetries = this.maxRetries,
            metadata = {}
        } = options;

        // สร้าง Command ID
        const commandId = `${device_code}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const cmd = {
            id: commandId,
            device_code,
            command,
            priority,
            timeout,
            maxRetries,
            retryCount: 0,
            status: CMD_STATUS.PENDING,
            createdAt: new Date(),
            metadata
        };

        // ตรวจสอบขนาดคิว
        if (!this.queues.has(device_code)) {
            this.queues.set(device_code, []);
        }

        const queue = this.queues.get(device_code);
        
        if (queue.length >= this.maxQueueSize) {
            console.warn(`⚠️ Queue full for ${device_code}, removing oldest command`);
            const removed = queue.shift();
            this.emit('commandDropped', removed);
        }

        // เพิ่มเข้าคิวตาม Priority (Priority Queue)
        let inserted = false;
        for (let i = 0; i < queue.length; i++) {
            if (queue[i].priority > priority) {
                queue.splice(i, 0, cmd);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            queue.push(cmd);
        }

        // บันทึกประวัติ
        this.commandHistory.set(commandId, cmd);
        this.stats.totalEnqueued++;

        console.log(`📥 Enqueued: ${commandId} (Priority: ${priority}, Queue size: ${queue.length})`);
        
        this.emit('commandEnqueued', cmd);
        
        // เริ่ม Process ถ้ายังไม่ได้ทำ
        this._processNext(device_code);
        
        return commandId;
    }

    /**
     * ประมวลผลคำสั่งถัดไป
     */
    async _processNext(device_code) {
        // ถ้ากำลัง process อยู่ ให้รอ
        if (this.processing.has(device_code)) {
            return;
        }

        const queue = this.queues.get(device_code);
        if (!queue || queue.length === 0) {
            return;
        }

        // Rate Limiting
        const now = Date.now();
        const lastSentTime = this.lastSent.get(device_code) || 0;
        const timeSinceLastSent = now - lastSentTime;
        
        if (timeSinceLastSent < this.rateLimit) {
            const delay = this.rateLimit - timeSinceLastSent;
            setTimeout(() => this._processNext(device_code), delay);
            return;
        }

        // ดึงคำสั่งออกจากคิว
        const cmd = queue.shift();
        cmd.status = CMD_STATUS.PROCESSING;
        cmd.startedAt = new Date();
        
        this.processing.set(device_code, cmd);
        this.lastSent.set(device_code, now);

        console.log(`🔄 Processing: ${cmd.id}`);
        this.emit('commandProcessing', cmd);

        // ตั้ง Timeout
        const timeoutTimer = setTimeout(() => {
            this._handleTimeout(device_code, cmd);
        }, cmd.timeout);

        this.processingTimers.set(cmd.id, timeoutTimer);

        // Execute command
        try {
            const result = await this._executeCommand(cmd);
            this._handleSuccess(device_code, cmd, result);
        } catch (error) {
            this._handleFailure(device_code, cmd, error);
        }
    }

    /**
     * Execute command (Override ได้)
     */
    async _executeCommand(cmd) {
        // Default: emit event และรอ acknowledge
        return new Promise((resolve, reject) => {
            const listener = (result) => {
                if (result.commandId === cmd.id) {
                    this.off('commandAck', listener);
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'Command failed'));
                    }
                }
            };
            
            this.on('commandAck', listener);
            this.emit('executeCommand', cmd);
            
            // Auto timeout
            setTimeout(() => {
                this.off('commandAck', listener);
                reject(new Error('Execute timeout'));
            }, cmd.timeout);
        });
    }

    /**
     * Acknowledge command completion (เรียกจากภายนอก)
     */
    acknowledge(commandId, success = true, result = {}) {
        this.emit('commandAck', { commandId, success, ...result });
    }

    /**
     * Handle success
     */
    _handleSuccess(device_code, cmd, result) {
        // Clear timeout
        const timer = this.processingTimers.get(cmd.id);
        if (timer) {
            clearTimeout(timer);
            this.processingTimers.delete(cmd.id);
        }

        cmd.status = CMD_STATUS.COMPLETED;
        cmd.completedAt = new Date();
        cmd.result = result;
        
        this.processing.delete(device_code);
        this.stats.totalProcessed++;

        console.log(`✅ Completed: ${cmd.id}`);
        this.emit('commandCompleted', cmd);

        // Process next
        setImmediate(() => this._processNext(device_code));
    }

    /**
     * Handle failure
     */
    _handleFailure(device_code, cmd, error) {
        // Clear timeout
        const timer = this.processingTimers.get(cmd.id);
        if (timer) {
            clearTimeout(timer);
            this.processingTimers.delete(cmd.id);
        }

        cmd.retryCount++;
        cmd.lastError = error.message;

        console.warn(`❌ Failed: ${cmd.id} (Attempt ${cmd.retryCount}/${cmd.maxRetries})`);

        if (cmd.retryCount < cmd.maxRetries) {
            // Retry
            cmd.status = CMD_STATUS.PENDING;
            this.processing.delete(device_code);
            this.stats.totalRetried++;

            // Re-queue with higher priority
            const queue = this.queues.get(device_code) || [];
            queue.unshift(cmd);
            this.queues.set(device_code, queue);

            console.log(`🔁 Retry scheduled: ${cmd.id}`);
            this.emit('commandRetry', cmd);

            // Delay before retry
            setTimeout(() => this._processNext(device_code), this.retryDelay);
        } else {
            // Max retries reached
            cmd.status = CMD_STATUS.FAILED;
            cmd.failedAt = new Date();
            
            this.processing.delete(device_code);
            this.stats.totalFailed++;

            console.error(`💀 Max retries reached: ${cmd.id}`);
            this.emit('commandFailed', cmd);

            // Process next
            setImmediate(() => this._processNext(device_code));
        }
    }

    /**
     * Handle timeout
     */
    _handleTimeout(device_code, cmd) {
        this.processingTimers.delete(cmd.id);
        cmd.status = CMD_STATUS.TIMEOUT;
        
        console.warn(`⏱️ Timeout: ${cmd.id}`);
        
        this._handleFailure(device_code, cmd, new Error('Command timeout'));
    }

    /**
     * ยกเลิกคำสั่ง
     */
    cancel(commandId) {
        const cmd = this.commandHistory.get(commandId);
        if (!cmd) return false;

        if (cmd.status === CMD_STATUS.PENDING) {
            const queue = this.queues.get(cmd.device_code);
            const idx = queue?.findIndex(c => c.id === commandId);
            if (idx > -1) {
                queue.splice(idx, 1);
                cmd.status = CMD_STATUS.CANCELLED;
                console.log(`🚫 Cancelled: ${commandId}`);
                this.emit('commandCancelled', cmd);
                return true;
            }
        }
        return false;
    }

    /**
     * ยกเลิกทุกคำสั่งของ Device
     */
    cancelAllForDevice(device_code) {
        const queue = this.queues.get(device_code);
        if (queue) {
            queue.forEach(cmd => {
                cmd.status = CMD_STATUS.CANCELLED;
                this.emit('commandCancelled', cmd);
            });
            this.queues.set(device_code, []);
            console.log(`🚫 Cancelled all commands for: ${device_code}`);
        }
    }

    /**
     * ดูสถานะคิว
     */
    getQueueStatus(device_code) {
        const queue = this.queues.get(device_code) || [];
        const current = this.processing.get(device_code);
        
        return {
            device_code,
            queueLength: queue.length,
            processing: current ? {
                id: current.id,
                command: current.command.type,
                startedAt: current.startedAt
            } : null,
            pending: queue.map(c => ({
                id: c.id,
                command: c.command.type,
                priority: c.priority
            }))
        };
    }

    /**
     * ดูสถิติทั้งหมด
     */
    getStats() {
        return {
            ...this.stats,
            activeDevices: this.queues.size,
            processing: this.processing.size
        };
    }

    /**
     * Clear ประวัติเก่า (เรียกเป็นระยะ)
     */
    clearOldHistory(maxAge = 3600000) { // 1 ชั่วโมง
        const now = Date.now();
        let cleared = 0;
        
        for (const [id, cmd] of this.commandHistory) {
            const age = now - cmd.createdAt.getTime();
            if (age > maxAge && cmd.status !== CMD_STATUS.PENDING && cmd.status !== CMD_STATUS.PROCESSING) {
                this.commandHistory.delete(id);
                cleared++;
            }
        }
        
        if (cleared > 0) {
            console.log(`🧹 Cleared ${cleared} old command records`);
        }
    }
}

// Singleton instance
export const commandQueue = new CommandQueue();

// Auto-clear history ทุก 30 นาที
setInterval(() => {
    commandQueue.clearOldHistory();
}, 30 * 60 * 1000);

export default CommandQueue;
