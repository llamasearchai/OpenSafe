"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const metrics_1 = require("../utils/metrics"); // Assuming MetricsCollector is already defined
const constants_1 = require("../config/constants"); // Assuming a constants file
class MonitoringService extends events_1.EventEmitter {
    // The global metrics collector instance can be instantiated in server.ts and passed or used as a singleton.
    // For this service, we might not need its own MetricsCollector instance if a global one is used.
    // However, if it's meant to manage specific monitoring tasks beyond just emitting events, it can have one.
    // Let's assume it primarily emits events that other parts of the system (like MetricsCollector middleware) listen to,
    // or directly interacts with a global metrics instance.
    // For direct metric updates from this service:
    metrics;
    alerts; // Simple in-memory alert store
    anomalyDetectionInterval;
    hourlyViolationCounts = {};
    constructor(metricsCollectorInstance) {
        super();
        // If a global metrics collector is used elsewhere (e.g. in server.ts for HTTP metrics),
        // this service might not need to instantiate its own, but rather use the global one.
        // For now, let's assume it can receive one or create one for its specific metrics.
        this.metrics = metricsCollectorInstance || new metrics_1.MetricsCollector();
        this.alerts = new Map();
        this.setupMonitoringListeners();
        // Start periodic anomaly detection
        this.anomalyDetectionInterval = setInterval(() => this.runAnomalyDetectionTasks(), (constants_1.CRON_JOB_SCHEDULES && constants_1.CRON_JOB_SCHEDULES.ANOMALY_DETECTION_MS) || (60 * 60 * 1000) // Default every hour
        );
        logger_1.logger.info(`Anomaly detection scheduled to run every ${(constants_1.CRON_JOB_SCHEDULES && constants_1.CRON_JOB_SCHEDULES.ANOMALY_DETECTION_MS) || (60 * 60 * 1000) / 1000} seconds.`);
    }
    setupMonitoringListeners() {
        // Event: 'safety.violation'
        // Data: SafetyViolation object
        this.on('safety.violation', (data) => {
            this.metrics.incrementCounter('safety_violations_total', {
                type: data.type.toString(), // Ensure type is string
                severity: data.severity,
                policy_source: data.policySource || 'unknown',
            });
            this.metrics.observeHistogram('safety_violation_confidence', data.confidence, {
                type: data.type.toString(),
                severity: data.severity,
            });
            if (data.severity === 'critical' || (data.severity === 'high' && data.confidence > 0.9)) {
                this.triggerAlert('critical_safety_violation', {
                    description: data.description,
                    type: data.type,
                    severity: data.severity,
                    confidence: data.confidence,
                    evidenceContext: data.evidence.join('; ').substring(0, 200), // First 200 chars of evidence
                });
            }
        });
        // Event: 'api.request.processed' (can be emitted by requestLogging middleware or routes)
        // Data: { method: string, route: string, status: number, duration: number, userId?: string }
        this.on('api.request.processed', (data) => {
            this.metrics.observeHistogram('http_request_duration_seconds', data.duration / 1000, {
                method: data.method,
                route: data.route,
                status_code: data.status.toString(), // prom-client expects string labels
            });
            this.metrics.incrementCounter('http_requests_total', {
                method: data.method,
                route: data.route,
                status_code: data.status.toString(),
            });
            if (data.status >= 500) {
                this.metrics.incrementCounter('http_server_errors_total', {
                    method: data.method,
                    route: data.route,
                });
            }
        });
        // Event: 'model.inference' (emitted by OpenAIService)
        // Data: { model: string, operation: string, duration: number, success: boolean, inputTokens?: number, outputTokens?: number }
        this.on('model.inference', (data) => {
            this.metrics.observeHistogram('model_inference_duration_seconds', data.duration / 1000, {
                model: data.model,
                operation: data.operation,
                status: data.success ? 'success' : 'failure',
            });
            this.metrics.incrementCounter('model_requests_total', {
                model: data.model,
                operation: data.operation,
                status: data.success ? 'success' : 'failure',
            });
            if (data.inputTokens) {
                this.metrics.incrementCounter('model_input_tokens_total', { model: data.model, operation: data.operation }, data.inputTokens);
            }
            if (data.outputTokens) {
                this.metrics.incrementCounter('model_output_tokens_total', { model: data.model, operation: data.operation }, data.outputTokens);
            }
        });
        // Event: 'audit.log.created'
        // Data: AuditLogEntry
        this.on('audit.log.created', (data) => {
            this.metrics.incrementCounter('audit_logs_created_total', {
                action: data.action,
                resource_type: data.resourceType || 'unknown',
                status: data.status,
            });
        });
        // Event: 'experiment.status.change'
        // Data: { experimentId: string, oldStatus: string, newStatus: string, userId?: string }
        this.on('experiment.status.change', (data) => {
            this.metrics.incrementCounter('experiment_status_changes_total', {
                new_status: data.newStatus,
                // old_status: data.oldStatus, // Can add if needed
            });
            if (data.newStatus === 'running')
                this.metrics.incrementGauge('experiments_active');
            if ((data.oldStatus === 'running') && (data.newStatus === 'completed' || data.newStatus === 'failed' || data.newStatus === 'cancelled')) {
                this.metrics.decrementGauge('experiments_active');
            }
            if (data.newStatus === 'failed') {
                this.metrics.incrementCounter('experiments_failed_total');
            }
        });
        // System startup event (can be emitted from initializeServices)
        this.on('system.startup', (data) => {
            logger_1.logger.info(`MonitoringService: System startup detected. Version: ${data.version}`);
            this.metrics.setGauge('system_up', 1, { version: data.version });
            // This is a good place to register metrics that are not event-driven, e.g. DB connection status if checkable
        });
    }
    triggerAlert(type, data, severity = 'error') {
        const alertId = `${type}_${Date.now()}`;
        const alert = {
            id: alertId,
            type,
            severity,
            data,
            timestamp: new Date(),
            acknowledged: false,
        };
        this.alerts.set(alertId, alert); // Store alert
        logger_1.logger.error('ALERT TRIGGERED', alert); // Log with high visibility
        this.metrics.incrementCounter('alerts_triggered_total', { alert_type: type, severity });
        // TODO: Send to external alerting systems (PagerDuty, Slack, Email, Webhook)
        this.sendToExternalAlertingService(alert);
    }
    async sendToExternalAlertingService(alert) {
        logger_1.logger.info('Attempting to send alert to external service(s)', { alertId: alert.id, type: alert.type });
        // Example: Slack Webhook
        if (config.env === 'production' && process.env.SLACK_WEBHOOK_URL) {
            try {
                // const response = await axios.post(process.env.SLACK_WEBHOOK_URL, {
                // text: `🚨 ALERT: ${alert.type} - ${alert.data.description || JSON.stringify(alert.data)}`
                // });
                // logger.info('Alert sent to Slack', { alertId: alert.id, responseStatus: response.status });
                logger_1.logger.info(`SIMULATED: Alert sent to Slack for ${alert.id}`);
            }
            catch (error) {
                logger_1.logger.error('Failed to send alert to Slack', { alertId: alert.id, error });
            }
        }
    }
    getMetricsSnapshot() {
        // This would typically be handled by the /metrics endpoint in server.ts
        // But if direct access is needed:
        return this.metrics.register.metrics();
    }
    getActiveAlerts(since) {
        const allAlerts = Array.from(this.alerts.values()).filter(a => !a.acknowledged);
        if (since) {
            return allAlerts.filter(a => new Date(a.timestamp) > since);
        }
        return allAlerts;
    }
    acknowledgeAlert(alertId, userId) {
        const alert = this.alerts.get(alertId);
        if (alert && !alert.acknowledged) {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
            logger_1.logger.info('Alert acknowledged', { alertId, userId });
            this.metrics.decrementGauge('alerts_active_total', { alert_type: alert.type, severity: alert.severity }); // If you have such a gauge
            return true;
        }
        return false;
    }
    async runAnomalyDetectionTasks() {
        logger_1.logger.info("Running anomaly detection tasks...");
        // 1. Analyze recent safety violations for spikes
        const currentHourKey = new Date().toISOString().substring(0, 13);
        const currentHourData = this.hourlyViolationCounts[currentHourKey];
        if (currentHourData && currentHourData.count > 50) { // Arbitrary threshold for spike
            // Compare with previous hours or a baseline
            // For simplicity, just check if current hour is high
            const highSeverityCount = Object.entries(currentHourData.types)
                .filter(([type, count]) => ['critical', 'high'].includes(this.getSeverityForType(type))) // You'd need a mapping or check data.severity
                .reduce((sum, [, count]) => sum + count, 0);
            if (currentHourData.count > 100 || highSeverityCount > 20) {
                this.triggerAlert('anomaly_safety_violation_spike', {
                    period: currentHourKey,
                    totalViolations: currentHourData.count,
                    violationTypes: currentHourData.types,
                    message: `Significant spike in safety violations detected. Total: ${currentHourData.count}.`,
                }, 'warning');
                this.metrics.incrementCounter('anomaly_detected_total', { type: 'safety_violation_spike' });
            }
        }
        // Clean up old hourly counts to prevent memory leak
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().substring(0, 13);
        for (const key in this.hourlyViolationCounts) {
            if (key < twoHoursAgo)
                delete this.hourlyViolationCounts[key];
        }
        // 2. Check for unusual admin activity (conceptual - needs audit log data)
        // const recentAdminActions = await auditService.getAuditLogs({ action: '%admin%', limit: 100 });
        // if (recentAdminActions.logs.filter(log => log.action.includes('delete') || log.action.includes('role_change')).length > 5) {
        //   this.triggerAlert('anomaly_admin_activity', { count: recentAdminActions.logs.length, message: "Unusually high admin activity detected." }, 'warning');
        // }
        logger_1.logger.info("Anomaly detection tasks completed.");
    }
    getSeverityForType(type) {
        // This is a simplification. Severity comes with the violation event.
        // This map is just for a hypothetical case where you only have the type.
        const severityMap = {
            [ViolationType.HARMFUL_CONTENT]: 'critical',
            [ViolationType.HATE_SPEECH]: 'critical',
            [ViolationType.PRIVACY]: 'high',
            [ViolationType.PII_DETECTED]: 'high',
            [ViolationType.SELF_HARM]: 'critical',
            [ViolationType.POLICY_VIOLATION]: 'critical',
        };
        return severityMap[type] || 'medium';
    }
}
exports.MonitoringService = MonitoringService;
// Initialize a global monitoring service instance if not passed around
// However, it's better to instantiate where MetricsCollector is also managed (e.g. server.ts or services/index.ts)
// For now, let's make it exportable for other services to emit events on it.
exports.monitoringService = new MonitoringService();
// In server.ts or services/index.ts, you would ensure this 'monitoringService'
// gets the same MetricsCollector instance that is used for the /metrics endpoint.
// e.g., in server.ts:
// const metrics = new MetricsCollector();
// export const monitoringService = new MonitoringService(metrics); // Pass the instance
// And then other services import `monitoringService` from where it's instantiated with the shared metrics collector.
// For simplicity of DI here, we'll rely on internal instantiation or direct metric calls for now. 
//# sourceMappingURL=monitoring.service.js.map