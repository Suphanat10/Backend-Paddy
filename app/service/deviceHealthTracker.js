/**
 * Device Health Tracker
 * ระบบติดตามสุขภาพอุปกรณ์แบบ Real-time
 * - ตรวจสอบ Device Online/Offline
 * - วัด Response Time
 * - ตรวจจับ Device ล่ม
 * - Circuit Breaker Pattern
 */

import EventEmitter from 'events';

// Device Health Status
export const HEALTH_STATUS = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
    OFFLINE: 'offline',
    UNKNOWN: 'unknown'
};

// Circuit Breaker States
const CIRCUIT_STATE = {
    CLOSED: 'closed',       // ปกติ
    OPEN: 'open',           // ตัดการเชื่อมต่อ
    HALF_OPEN: 'half_open'  // ทดสอบ
};

class DeviceHealthTracker extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.heartbeatInterval = options.heartbeatInterval || 30000;     // 30 วินาที
        this.offlineThreshold = options.offlineThreshold || 3;          // พลาด 3 ครั้ง = offline
        this.responseTimeThreshold = options.responseTimeThreshold || 5000;  // 5 วินาที
        this.degradedThreshold = options.degradedThreshold || 3000;     // 3 วินาที
        
        // Circuit Breaker Config
        this.failureThreshold = options.failureThreshold || 5;          // ล้มเหลว 5 ครั้ง = เปิด circuit
        this.resetTimeout = options.resetTimeout || 60000;              // 1 นาที ก่อนลอง half-open
        this.successThreshold = options.successThreshold || 2;          // สำเร็จ 2 ครั้ง = ปิด circuit
        
        // Device tracking
        this.devices = new Map();  // device_code -> DeviceHealth
        
        // Start periodic health check
        this._startHealthCheck();
        
        console.log('🏥 Device Health Tracker initialized');
    }

    /**
     * โครงสร้างข้อมูลสุขภาพอุปกรณ์
     */
    _createDeviceHealth(device_code) {
        return {
            device_code,
            status: HEALTH_STATUS.UNKNOWN,
            lastSeen: null,
            lastHeartbeat: null,
            missedHeartbeats: 0,
            
            // Performance metrics
            avgResponseTime: 0,
            responseTimes: [],  // เก็บ 10 ค่าล่าสุด
            
            // Error tracking
            consecutiveFailures: 0,
            totalFailures: 0,
            totalSuccesses: 0,
            lastError: null,
            
            // Circuit Breaker
            circuitState: CIRCUIT_STATE.CLOSED,
            circuitOpenedAt: null,
            halfOpenSuccesses: 0,
            
            // Metadata
            registeredAt: new Date(),
            statusHistory: []
        };
    }

    /**
     * ลงทะเบียน Device
     */
    registerDevice(device_code) {
        if (!this.devices.has(device_code)) {
            const health = this._createDeviceHealth(device_code);
            this.devices.set(device_code, health);
            console.log(`📌 Device registered: ${device_code}`);
            this.emit('deviceRegistered', { device_code });
        }
        return this.devices.get(device_code);
    }

    /**
     * ยกเลิกการลงทะเบียน Device
     */
    unregisterDevice(device_code) {
        if (this.devices.has(device_code)) {
            this.devices.delete(device_code);
            console.log(`📤 Device unregistered: ${device_code}`);
            this.emit('deviceUnregistered', { device_code });
        }
    }

    /**
     * อัพเดทเมื่อได้รับ Heartbeat/Data จาก Device
     */
    recordHeartbeat(device_code, responseTime = null) {
        let health = this.devices.get(device_code);
        if (!health) {
            health = this.registerDevice(device_code);
        }

        const now = new Date();
        health.lastSeen = now;
        health.lastHeartbeat = now;
        health.missedHeartbeats = 0;

        // อัพเดท Response Time
        if (responseTime !== null) {
            health.responseTimes.push(responseTime);
            if (health.responseTimes.length > 10) {
                health.responseTimes.shift();
            }
            health.avgResponseTime = health.responseTimes.reduce((a, b) => a + b, 0) / health.responseTimes.length;
        }

        // อัพเดท Status
        this._updateHealthStatus(health);
        
        // Circuit Breaker: Success
        this._recordSuccess(health);

        this.emit('heartbeatReceived', { device_code, responseTime });
    }

    /**
     * บันทึกความสำเร็จ
     */
    recordSuccess(device_code, responseTime = null) {
        let health = this.devices.get(device_code);
        if (!health) {
            health = this.registerDevice(device_code);
        }

        health.lastSeen = new Date();
        health.totalSuccesses++;
        health.consecutiveFailures = 0;

        if (responseTime !== null) {
            this.recordHeartbeat(device_code, responseTime);
        }

        this._recordSuccess(health);
        this._updateHealthStatus(health);

        this.emit('commandSuccess', { device_code });
    }

    /**
     * บันทึกความล้มเหลว
     */
    recordFailure(device_code, error = null) {
        let health = this.devices.get(device_code);
        if (!health) {
            health = this.registerDevice(device_code);
        }

        health.consecutiveFailures++;
        health.totalFailures++;
        health.lastError = {
            message: error?.message || 'Unknown error',
            timestamp: new Date()
        };

        this._recordFailure(health);
        this._updateHealthStatus(health);

        this.emit('commandFailure', { device_code, error: health.lastError });
    }

    /**
     * Circuit Breaker: Record Success
     */
    _recordSuccess(health) {
        if (health.circuitState === CIRCUIT_STATE.HALF_OPEN) {
            health.halfOpenSuccesses++;
            if (health.halfOpenSuccesses >= this.successThreshold) {
                this._closeCircuit(health);
            }
        }
        health.consecutiveFailures = 0;
    }

    /**
     * Circuit Breaker: Record Failure
     */
    _recordFailure(health) {
        if (health.circuitState === CIRCUIT_STATE.HALF_OPEN) {
            this._openCircuit(health);
        } else if (health.circuitState === CIRCUIT_STATE.CLOSED) {
            if (health.consecutiveFailures >= this.failureThreshold) {
                this._openCircuit(health);
            }
        }
    }

    /**
     * เปิด Circuit (ตัดการเชื่อมต่อ)
     */
    _openCircuit(health) {
        const prevState = health.circuitState;
        health.circuitState = CIRCUIT_STATE.OPEN;
        health.circuitOpenedAt = new Date();
        health.halfOpenSuccesses = 0;

        console.warn(`🔴 Circuit OPEN: ${health.device_code}`);
        this.emit('circuitOpen', { device_code: health.device_code });

        // ตั้งเวลา Half-Open
        setTimeout(() => {
            if (health.circuitState === CIRCUIT_STATE.OPEN) {
                this._halfOpenCircuit(health);
            }
        }, this.resetTimeout);
    }

    /**
     * Half-Open Circuit (ทดสอบ)
     */
    _halfOpenCircuit(health) {
        health.circuitState = CIRCUIT_STATE.HALF_OPEN;
        health.halfOpenSuccesses = 0;

        console.log(`🟡 Circuit HALF-OPEN: ${health.device_code}`);
        this.emit('circuitHalfOpen', { device_code: health.device_code });
    }

    /**
     * ปิด Circuit (กลับมาปกติ)
     */
    _closeCircuit(health) {
        health.circuitState = CIRCUIT_STATE.CLOSED;
        health.circuitOpenedAt = null;
        health.halfOpenSuccesses = 0;
        health.consecutiveFailures = 0;

        console.log(`🟢 Circuit CLOSED: ${health.device_code}`);
        this.emit('circuitClosed', { device_code: health.device_code });
    }

    /**
     * ตรวจสอบว่าส่งคำสั่งได้หรือไม่
     */
    canSendCommand(device_code) {
        const health = this.devices.get(device_code);
        if (!health) {
            return { allowed: true, reason: 'New device' };
        }

        // Circuit Breaker Check
        if (health.circuitState === CIRCUIT_STATE.OPEN) {
            return {
                allowed: false,
                reason: 'Circuit breaker open',
                retryAfter: this.resetTimeout - (Date.now() - health.circuitOpenedAt?.getTime())
            };
        }

        // Half-Open: อนุญาตบางส่วน
        if (health.circuitState === CIRCUIT_STATE.HALF_OPEN) {
            return {
                allowed: true,
                reason: 'Testing (half-open)',
                warning: true
            };
        }

        // Offline Check
        if (health.status === HEALTH_STATUS.OFFLINE) {
            return {
                allowed: false,
                reason: 'Device offline',
                lastSeen: health.lastSeen
            };
        }

        return { allowed: true, reason: 'OK' };
    }

    /**
     * อัพเดทสถานะสุขภาพ
     */
    _updateHealthStatus(health) {
        const prevStatus = health.status;
        let newStatus;

        // ตรวจสอบ Offline
        if (health.missedHeartbeats >= this.offlineThreshold) {
            newStatus = HEALTH_STATUS.OFFLINE;
        }
        // ตรวจสอบ Unhealthy
        else if (health.circuitState === CIRCUIT_STATE.OPEN) {
            newStatus = HEALTH_STATUS.UNHEALTHY;
        }
        // ตรวจสอบ Degraded
        else if (health.avgResponseTime > this.degradedThreshold || 
                 health.consecutiveFailures > 0) {
            newStatus = HEALTH_STATUS.DEGRADED;
        }
        // Healthy
        else if (health.lastSeen) {
            newStatus = HEALTH_STATUS.HEALTHY;
        }
        else {
            newStatus = HEALTH_STATUS.UNKNOWN;
        }

        if (newStatus !== prevStatus) {
            health.status = newStatus;
            health.statusHistory.push({
                from: prevStatus,
                to: newStatus,
                timestamp: new Date()
            });

            // เก็บแค่ 20 records
            if (health.statusHistory.length > 20) {
                health.statusHistory.shift();
            }

            console.log(`📊 ${health.device_code}: ${prevStatus} → ${newStatus}`);
            this.emit('statusChanged', {
                device_code: health.device_code,
                from: prevStatus,
                to: newStatus
            });
        }
    }

    /**
     * Periodic Health Check
     */
    _startHealthCheck() {
        setInterval(() => {
            const now = Date.now();
            
            for (const [device_code, health] of this.devices) {
                // ตรวจสอบ Heartbeat timeout
                if (health.lastHeartbeat) {
                    const timeSinceLastHeartbeat = now - health.lastHeartbeat.getTime();
                    if (timeSinceLastHeartbeat > this.heartbeatInterval) {
                        health.missedHeartbeats++;
                        console.warn(`⚠️ Missed heartbeat: ${device_code} (${health.missedHeartbeats})`);
                        
                        this._updateHealthStatus(health);
                        
                        if (health.missedHeartbeats === this.offlineThreshold) {
                            this.emit('deviceOffline', { device_code, lastSeen: health.lastSeen });
                        }
                    }
                }
            }
        }, this.heartbeatInterval);
    }

    /**
     * ดึงข้อมูลสุขภาพ Device
     */
    getHealth(device_code) {
        const health = this.devices.get(device_code);
        if (!health) {
            return null;
        }

        return {
            device_code: health.device_code,
            status: health.status,
            lastSeen: health.lastSeen,
            avgResponseTime: Math.round(health.avgResponseTime),
            consecutiveFailures: health.consecutiveFailures,
            circuitState: health.circuitState,
            totalSuccesses: health.totalSuccesses,
            totalFailures: health.totalFailures
        };
    }

    /**
     * ดึงข้อมูลสุขภาพทุก Device
     */
    getAllHealth() {
        const result = [];
        for (const [device_code] of this.devices) {
            result.push(this.getHealth(device_code));
        }
        return result;
    }

    /**
     * ดึง Device ที่ Online
     */
    getOnlineDevices() {
        const result = [];
        for (const [device_code, health] of this.devices) {
            if (health.status !== HEALTH_STATUS.OFFLINE && 
                health.circuitState !== CIRCUIT_STATE.OPEN) {
                result.push(device_code);
            }
        }
        return result;
    }

    /**
     * สรุปสถิติ
     */
    getStats() {
        let online = 0, offline = 0, unhealthy = 0, degraded = 0;
        
        for (const [_, health] of this.devices) {
            switch (health.status) {
                case HEALTH_STATUS.HEALTHY: online++; break;
                case HEALTH_STATUS.OFFLINE: offline++; break;
                case HEALTH_STATUS.UNHEALTHY: unhealthy++; break;
                case HEALTH_STATUS.DEGRADED: degraded++; break;
            }
        }

        return {
            total: this.devices.size,
            online,
            offline,
            unhealthy,
            degraded
        };
    }
}

// Singleton instance
export const deviceHealthTracker = new DeviceHealthTracker();

export default DeviceHealthTracker;
