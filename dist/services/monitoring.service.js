"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const events_1 = require("events");
const metrics_1 = require("../utils/metrics");
const types_1 = require("../models/types");
// Simple logger fallback
const logger = {
    info: (...args) => console.info('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
};
// Simple config fallback
const config = {
    env: process.env.NODE_ENV || 'development',
    monitoring: {
        alertThreshold: 5,
        checkInterval: 60000
    }
};
class MonitoringService extends events_1.EventEmitter {
    metrics;
    alerts;
    constructor() {
        super();
        this.metrics = new metrics_1.MetricsCollector();
        this.alerts = new Map();
        this.setupMonitoring();
    }
    setupMonitoring() {
        // Monitor safety violations
        this.on('safety.violation', (data) => {
            this.metrics.incrementCounter('safety_violations_total', {
                type: data.type,
                severity: data.severity
            });
            if (data.severity === 'critical') {
                this.triggerAlert('critical_safety_violation', data);
            }
        });
        // Monitor API performance
        this.on('api.request', (data) => {
            this.metrics.observeHistogram('http_request_duration_seconds', data.duration, {
                method: data.method,
                route: data.route,
                status: data.status
            });
        });
        // Monitor model performance
        this.on('model.inference', (data) => {
            this.metrics.observeHistogram('model_inference_duration_seconds', data.duration, {
                model: data.model,
                operation: data.operation
            });
        });
        // System health monitoring
        this.on('system.health', (data) => {
            this.metrics.setGauge('system_up', data.healthy ? 1 : 0);
        });
    }
    triggerAlert(type, data) {
        const alert = {
            type,
            data,
            timestamp: new Date(),
            id: `${type}_${Date.now()}`
        };
        this.alerts.set(alert.id, alert);
        logger.error('Alert triggered', alert);
        // Send to external monitoring service
        this.sendToAlertingService(alert);
    }
    async sendToAlertingService(alert) {
        // Integration with PagerDuty, Slack, etc.
        logger.info('Sending alert to external service', { alertId: alert.id });
    }
    getMetrics() {
        return this.metrics.register.metrics();
    }
    getAlerts(since) {
        const alerts = Array.from(this.alerts.values());
        if (since) {
            return alerts.filter(a => a.timestamp > since);
        }
        return alerts;
    }
    // Health check methods
    async checkSystemHealth() {
        try {
            // Check critical components
            const checks = {
                memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024, // 500MB
                uptime: process.uptime() > 0,
                env: config.env === 'development' || config.env === 'production'
            };
            const isHealthy = Object.values(checks).every(check => check);
            this.emit('system.health', { healthy: isHealthy, checks });
            return isHealthy;
        }
        catch (error) {
            logger.error('Health check failed', error);
            return false;
        }
    }
    // Anomaly detection for safety violations
    detectAnomalies(violationData) {
        const recentViolations = violationData.filter(v => Date.now() - v.timestamp.getTime() < 60000 // Last minute
        );
        const severityMapping = {
            [types_1.ViolationType.HARMFUL_CONTENT]: 4,
            [types_1.ViolationType.ILLEGAL_CONTENT]: 4,
            [types_1.ViolationType.PRIVACY]: 3,
            [types_1.ViolationType.BIAS]: 2,
            [types_1.ViolationType.MISINFORMATION]: 2,
            [types_1.ViolationType.MANIPULATION]: 3,
            [types_1.ViolationType.PII_DETECTED]: 3,
            [types_1.ViolationType.PROFANITY]: 1,
            [types_1.ViolationType.SELF_HARM]: 4,
            [types_1.ViolationType.HATE_SPEECH]: 4,
            [types_1.ViolationType.POLICY_VIOLATION]: 2,
        };
        const totalSeverityScore = recentViolations.reduce((score, violation) => {
            const typeScore = severityMapping[violation.type] || 1;
            const severityMultiplier = violation.severity === 'critical' ? 3 :
                violation.severity === 'high' ? 2 : 1;
            return score + (typeScore * severityMultiplier);
        }, 0);
        if (totalSeverityScore > config.monitoring.alertThreshold) {
            this.triggerAlert('anomaly_detected', {
                violationCount: recentViolations.length,
                severityScore: totalSeverityScore,
                threshold: config.monitoring.alertThreshold
            });
        }
    }
    // Cleanup old alerts
    cleanupAlerts(olderThan) {
        for (const [id, alert] of this.alerts.entries()) {
            if (alert.timestamp < olderThan) {
                this.alerts.delete(id);
            }
        }
    }
}
exports.MonitoringService = MonitoringService;
exports.monitoringService = new MonitoringService();
//# sourceMappingURL=monitoring.service.js.map