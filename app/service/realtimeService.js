

import { commandQueue, PRIORITY, CMD_STATUS } from './commandQueue.js';
import { deviceHealthTracker, HEALTH_STATUS } from './deviceHealthTracker.js';
import { mqttClient } from './mqtt.js';

class RealtimeService {
    constructor() {
        this.io = null;
        this.mqttClient = mqttClient;
        this.schedulerLogs = [];
        this.maxSchedulerLogs = 100;

        this._setupEventListeners();
        console.log('Realtime Service initialized');
    }

    init(io) {
        this.io = io;
        this._setupSocketListeners();
        console.log('Realtime Service connected to Socket.IO');
    }


    _setupEventListeners() {

        commandQueue.on('executeCommand', (cmd) => {
            this._executeCommand(cmd);
        });

        commandQueue.on('commandCompleted', (cmd) => {
            this._notifyCommandStatus(cmd, 'completed');
            deviceHealthTracker.recordSuccess(cmd.device_code);
        });

        commandQueue.on('commandFailed', (cmd) => {
            this._notifyCommandStatus(cmd, 'failed');
            deviceHealthTracker.recordFailure(cmd.device_code, new Error(cmd.lastError));
        });

        commandQueue.on('commandRetry', (cmd) => {
            this._notifyCommandStatus(cmd, 'retrying');
        });

        //   deviceHealthTracker.on('deviceOffline', ({ device_code }) => {
        //       console.log(`📴 Device offline: ${device_code}`);
        //       commandQueue.cancelAllForDevice(device_code);
        //       this._notifyDeviceStatus(device_code, 'offline');
        //   });

        deviceHealthTracker.on('circuitOpen', ({ device_code }) => {
            console.log(`⚡ Circuit breaker triggered: ${device_code}`);
            this._notifyDeviceStatus(device_code, 'circuit_open');
        });

        deviceHealthTracker.on('circuitClosed', ({ device_code }) => {
            console.log(`✅ Circuit breaker reset: ${device_code}`);
            this._notifyDeviceStatus(device_code, 'circuit_closed');
        });

        deviceHealthTracker.on('statusChanged', ({ device_code, from, to }) => {
            this._notifyDeviceStatus(device_code, to, { previousStatus: from });
        });
    }

    _setupSocketListeners() {
        if (!this.io) return;

        this.io.on('connection', (socket) => {
            // Join scheduler logs room
            socket.on('join-scheduler-logs', () => {
                socket.join('scheduler-logs');
                console.log(`📋 ${socket.id} joined scheduler-logs`);
            });

            // ขอประวัติการทำงาน scheduler
            socket.on('getSchedulerHistory', (options = {}, callback) => {
                const history = this.getSchedulerHistory(options);
                if (callback) callback(history);
            });

            // Queue Status Request
            socket.on('getQueueStatus', (device_code, callback) => {
                const status = commandQueue.getQueueStatus(device_code);
                if (callback) callback(status);
            });

            // Device Health Request
            socket.on('getDeviceHealth', (device_code, callback) => {
                const health = deviceHealthTracker.getHealth(device_code);
                if (callback) callback(health);
            });

            // All Stats
            socket.on('getRealtimeStats', (callback) => {
                if (callback) {
                    callback({
                        queue: commandQueue.getStats(),
                        health: deviceHealthTracker.getStats()
                    });
                }
            });

            // Cancel Command
            socket.on('cancelCommand', (commandId, callback) => {
                const result = commandQueue.cancel(commandId);
                if (callback) callback({ success: result });
            });
        });
    }

    async sendCommand(device_code, command, options = {}) {
        const canSend = deviceHealthTracker.canSendCommand(device_code);

        if (!canSend.allowed) {
            console.warn(`⛔ Cannot send to ${device_code}: ${canSend.reason}`);
            return {
                success: false,
                reason: canSend.reason,
                retryAfter: canSend.retryAfter
            };
        }

        if (canSend.warning) {
            console.warn(`⚠️ Sending with warning to ${device_code}: ${canSend.reason}`);
        }

        // เพิ่มเข้า Queue
        const commandId = commandQueue.enqueue(device_code, command, options);

        return {
            success: true,
            commandId,
            warning: canSend.warning ? canSend.reason : null
        };
    }

    /**
     * ส่งคำสั่งหลายอุปกรณ์พร้อมกัน
     */
    async sendBulkCommand(device_codes, command, options = {}) {
        const results = [];

        for (const device_code of device_codes) {
            const result = await this.sendCommand(device_code, command, options);
            results.push({
                device_code,
                ...result
            });
        }

        return results;
    }

    /**
     * Execute Command (MQTT)
     */
    _executeCommand(cmd) {
        const { device_code, command, id } = cmd;
        const CMD_TOPIC = `@msg/smartpaddy/cmd/${device_code}`;

        const payload = JSON.stringify({
            device_id: device_code,
            command_id: id,
            ...command
        });

        const startTime = Date.now();

        this.mqttClient.publish(CMD_TOPIC, payload, { qos: 1 }, (err) => {
            const responseTime = Date.now() - startTime;

            if (err) {
                console.error(`❌ MQTT publish failed: ${id}`, err.message);
                commandQueue.acknowledge(id, false, { error: err.message });
            } else {
                console.log(`📤 Command sent: ${id} (${responseTime}ms)`);

                // Record heartbeat with response time
                deviceHealthTracker.recordHeartbeat(device_code, responseTime);

                // Auto-acknowledge (สำหรับ fire-and-forget commands)
                if (command.autoAck !== false) {
                    commandQueue.acknowledge(id, true, { responseTime });
                }
            }
        });
    }

    /**
     * Notify command status via Socket.IO
     */
    _notifyCommandStatus(cmd, status) {
        if (!this.io) return;

        const data = {
            commandId: cmd.id,
            status,
            device_code: cmd.device_code,
            command: cmd.command.type,
            timestamp: new Date().toISOString()
        };

        if (status === 'failed') {
            data.error = cmd.lastError;
            data.retryCount = cmd.retryCount;
        }

        this.io.to(`device:${cmd.device_code}`).emit('commandStatus', data);
        this.io.to('all-devices').emit('commandStatus', data);
    }

    /**
     * Notify device status via Socket.IO
     */
    _notifyDeviceStatus(device_code, status, extra = {}) {
        if (!this.io) return;

        const data = {
            device_code,
            status,
            timestamp: new Date().toISOString(),
            ...extra
        };

        this.io.to(`device:${device_code}`).emit('deviceHealth', data);
        this.io.to('all-devices').emit('deviceHealth', data);
    }

    // ============= Convenience Methods =============

    /**
     * ส่งคำสั่งถ่ายรูป
     */
    takePhoto(device_code, options = {}) {
        return this.sendCommand(device_code, {
            type: 'takePhoto'
        }, {
            priority: PRIORITY.HIGH,
            ...options
        });
    }

    /**
     * ส่งคำสั่งเปิด/ปิดปั๊ม
     */
    controlPump(device_code, action = 'ON', options = {}) {
        return this.sendCommand(device_code, {
            type: action === 'ON' ? 'pump_on' : 'pump_off',
            pump: device_code
        }, {
            priority: PRIORITY.CRITICAL,  // คำสั่งปั๊มสำคัญมาก
            ...options
        });
    }

    /**
     * ส่งคำสั่ง Disconnect
     */
    disconnectDevice(device_code, options = {}) {
        return this.sendCommand(device_code, {
            type: 'disconnect'
        }, {
            priority: PRIORITY.HIGH,
            ...options
        });
    }

    /**
     * ส่งคำสั่งแบบกำหนดเอง
     */
    sendCustomCommand(device_code, type, payload = {}, options = {}) {
        return this.sendCommand(device_code, {
            type,
            ...payload
        }, options);
    }

    // ============= Status Methods =============

    /**
     * ดูสถานะ Queue ของ Device
     */
    getQueueStatus(device_code) {
        return commandQueue.getQueueStatus(device_code);
    }

    /**
     * ดูสถานะสุขภาพ Device
     */
    getDeviceHealth(device_code) {
        return deviceHealthTracker.getHealth(device_code);
    }

    /**
     * ดู Device ที่พร้อมใช้งาน
     */
    getAvailableDevices() {
        return deviceHealthTracker.getOnlineDevices();
    }

    /**
     * ดูสถิติรวม
     */
    getStats() {
        return {
            queue: commandQueue.getStats(),
            health: deviceHealthTracker.getStats()
        };
    }

    // ============= Scheduler Events =============

    /**
     * ส่ง Scheduler Log ไปหน้าบ้าน และเก็บประวัติ
     */
    emitSchedulerLog(type, data) {
        const payload = {
            type,
            timestamp: new Date().toISOString(),
            ...data
        };

        // เก็บประวัติการทำงาน (เพิ่มตัวใหม่ที่หน้าสุด)
        this.schedulerLogs.unshift(payload);

        // จำกัดจำนวนประวัติ
        if (this.schedulerLogs.length > this.maxSchedulerLogs) {
            this.schedulerLogs = this.schedulerLogs.slice(0, this.maxSchedulerLogs);
        }

        // ส่งไป frontend ถ้ามี socket connection
        if (this.io) {
            this.io.to('scheduler-logs').emit('schedulerLog', payload);
            this.io.to('all-devices').emit('schedulerLog', payload);
        }
    }

    /**
     * ดึงประวัติการทำงาน scheduler
     * @param {Object} options - ตัวเลือกการกรอง
     * @param {string} options.type - กรองตามประเภท (start, device_status, complete, error)
     * @param {string} options.device_code - กรองตาม device
     * @param {number} options.limit - จำนวนรายการที่ต้องการ (default: 50)
     */
    getSchedulerHistory(options = {}) {
        let logs = [...this.schedulerLogs];

        // กรองตามประเภท
        if (options.type) {
            logs = logs.filter(log => log.type === options.type);
        }

        // กรองตาม device
        if (options.device_code) {
            logs = logs.filter(log => log.device_code === options.device_code);
        }

        // จำกัดจำนวน
        const limit = options.limit || 50;
        logs = logs.slice(0, limit);

        return {
            total: this.schedulerLogs.length,
            filtered: logs.length,
            logs
        };
    }

    /**
     * แจ้งเริ่มต้น Scheduler
     */
    notifySchedulerStart() {
        this.emitSchedulerLog('start', {
            message: 'เริ่มการตรวจสอบรอบการวิเคราะห์ประจำวัน'
        });
    }

    /**
     * แจ้งสถานะ Device ในการ Schedule
     */
    notifyDeviceScheduleStatus(device_code, status, details = {}) {
        this.emitSchedulerLog('device_status', {
            device_code,
            status,  // 'checking' | 'due' | 'not_due' | 'queued' | 'error'
            ...details
        });
    }

    /**
     * แจ้งสรุปผล Scheduler
     */
    notifySchedulerComplete(summary) {
        this.emitSchedulerLog('complete', {
            message: 'ตรวจสอบเสร็จสิ้น',
            ...summary
        });
    }
}

// Singleton instance
export const realtimeService = new RealtimeService();

export default RealtimeService;
