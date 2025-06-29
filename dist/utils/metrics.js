"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const prom_client_1 = require("prom-client");
// Simple logger fallback
const logger = {
    warn: (...args) => console.warn('[WARN]', ...args),
};
// Simple monitoring service mock
const monitoringService = {
    emit: (event, data) => {
        console.log(`[MONITORING] ${event}:`, data);
    }
};
class MetricsCollector {
    register = prom_client_1.register;
    counters = new Map();
    histograms = new Map();
    gauges = new Map();
    summaries = new Map();
    constructor() {
        // Collect default metrics
        prom_client_1.register.clear();
        require('prom-client').collectDefaultMetrics({ register: this.register });
        this.initializeMetrics();
    }
    initializeMetrics() {
        // HTTP metrics
        this.createHistogram('http_request_duration_seconds', 'HTTP request duration in seconds', ['method', 'route', 'status_code']);
        this.createCounter('http_requests_total', 'Total HTTP requests', ['method', 'route', 'status_code']);
        this.createCounter('http_server_errors_total', 'Total HTTP server errors', ['method', 'route']);
        // Safety metrics
        this.createCounter('safety_violations_total', 'Total safety violations detected', ['type', 'severity', 'policy_source']);
        this.createHistogram('safety_analysis_duration_seconds', 'Safety analysis duration in seconds', ['mode']);
        this.createHistogram('safety_violation_confidence', 'Confidence score of detected safety violations', ['type', 'severity'], [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0]);
        this.createGauge('safety_score_current', 'Current average safety score of analyzed content'); // This would need a mechanism to update
        // Model metrics
        this.createHistogram('model_inference_duration_seconds', 'Model inference duration in seconds', ['model', 'operation', 'status']);
        this.createCounter('model_requests_total', 'Total model requests', ['model', 'operation', 'status']);
        this.createCounter('model_input_tokens_total', 'Total input tokens processed by models', ['model', 'operation']);
        this.createCounter('model_output_tokens_total', 'Total output tokens generated by models', ['model', 'operation']);
        // Research metrics
        this.createGauge('experiments_active', 'Number of currently active experiments');
        this.createCounter('experiments_total', 'Total experiments created', ['type', 'initial_status']); // e.g. status when created
        this.createCounter('experiment_status_changes_total', 'Total changes in experiment statuses', ['new_status']);
        this.createCounter('experiments_failed_total', 'Total experiments that failed');
        // Audit metrics
        this.createCounter('audit_logs_created_total', 'Total audit logs created', ['action', 'resource_type', 'status']);
        // Alerting metrics
        this.createCounter('alerts_triggered_total', 'Total alerts triggered', ['alert_type', 'severity']);
        this.createGauge('alerts_active_total', 'Number of currently active (unacknowledged) alerts', ['alert_type', 'severity']);
        // System metrics
        this.createGauge('system_up', 'System is up and running', ['version']);
        this.createGauge('database_connection_active', 'Indicates if database connection is active'); // Requires check logic
        this.createGauge('redis_connection_active', 'Indicates if Redis connection is active'); // Requires check logic
    }
    createCounter(name, help, labels = [], value) {
        if (this.counters.has(name))
            return this.counters.get(name);
        const counter = new prom_client_1.Counter({ name, help, labelNames: labels, registers: [this.register] });
        this.counters.set(name, counter);
        if (value !== undefined)
            labels.length > 0 ? counter.labels(...labels).inc(value) : counter.inc(value);
        return counter;
    }
    createHistogram(name, help, labels = [], buckets) {
        if (this.histograms.has(name))
            return this.histograms.get(name);
        const histogram = new prom_client_1.Histogram({
            name,
            help,
            labelNames: labels,
            buckets: buckets || [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // Default buckets
            registers: [this.register]
        });
        this.histograms.set(name, histogram);
        return histogram;
    }
    createGauge(name, help, labels = []) {
        if (this.gauges.has(name))
            return this.gauges.get(name);
        const gauge = new prom_client_1.Gauge({ name, help, labelNames: labels, registers: [this.register] });
        this.gauges.set(name, gauge);
        return gauge;
    }
    createSummary(name, help, labels = [], percentiles) {
        if (this.summaries.has(name))
            return this.summaries.get(name);
        const summary = new prom_client_1.Summary({
            name, help, labelNames: labels,
            percentiles: percentiles || [0.5, 0.9, 0.99], // Default percentiles
            registers: [this.register]
        });
        this.summaries.set(name, summary);
        return summary;
    }
    incrementCounter(name, labels, value = 1) {
        const counter = this.counters.get(name);
        if (counter) {
            const stringLabels = this.stringifyLabels(labels);
            stringLabels ? counter.labels(stringLabels).inc(value) : counter.inc(value);
        }
        else {
            logger.warn(`Metric counter '${name}' not found.`);
        }
    }
    observeHistogram(name, value, labels) {
        const histogram = this.histograms.get(name);
        if (histogram) {
            const stringLabels = this.stringifyLabels(labels);
            stringLabels ? histogram.labels(stringLabels).observe(value) : histogram.observe(value);
        }
        else {
            logger.warn(`Metric histogram '${name}' not found.`);
        }
    }
    observeSummary(name, value, labels) {
        const summary = this.summaries.get(name);
        if (summary) {
            const stringLabels = this.stringifyLabels(labels);
            stringLabels ? summary.labels(stringLabels).observe(value) : summary.observe(value);
        }
        else {
            logger.warn(`Metric summary '${name}' not found.`);
        }
    }
    setGauge(name, value, labels) {
        const gauge = this.gauges.get(name);
        if (gauge) {
            const stringLabels = this.stringifyLabels(labels);
            stringLabels ? gauge.labels(stringLabels).set(value) : gauge.set(value);
        }
        else {
            logger.warn(`Metric gauge '${name}' not found.`);
        }
    }
    incrementGauge(name, labels, value = 1) {
        const gauge = this.gauges.get(name);
        if (gauge) {
            const stringLabels = this.stringifyLabels(labels);
            stringLabels ? gauge.labels(stringLabels).inc(value) : gauge.inc(value);
        }
        else {
            logger.warn(`Metric gauge '${name}' for increment not found.`);
        }
    }
    decrementGauge(name, labels, value = 1) {
        const gauge = this.gauges.get(name);
        if (gauge) {
            const stringLabels = this.stringifyLabels(labels);
            stringLabels ? gauge.labels(stringLabels).dec(value) : gauge.dec(value);
        }
        else {
            logger.warn(`Metric gauge '${name}' for decrement not found.`);
        }
    }
    stringifyLabels(labels) {
        if (!labels)
            return undefined;
        const stringLabels = {};
        for (const key in labels) {
            stringLabels[key] = String(labels[key]);
        }
        return stringLabels;
    }
    middleware() {
        return (req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const durationMs = Date.now() - start;
                // Ensure route is captured correctly, even for unmatched routes or errors before routing
                const route = (req.route?.path) || req.path;
                const labels = {
                    method: req.method,
                    route: route, // Use the matched route path if available
                    status_code: res.statusCode.toString()
                };
                this.observeHistogram('http_request_duration_seconds', durationMs / 1000, labels);
                this.incrementCounter('http_requests_total', labels);
                if (res.statusCode >= 500) {
                    this.incrementCounter('http_server_errors_total', { method: req.method, route });
                }
                // Emit an event for MonitoringService to pick up if it's listening centrally
                monitoringService.emit('api.request.processed', {
                    method: req.method,
                    route: route,
                    status: res.statusCode,
                    duration: durationMs,
                    userId: req.user?.id // Assuming AuthenticatedRequest populates user
                });
            });
            next();
        };
    }
}
exports.MetricsCollector = MetricsCollector;
//# sourceMappingURL=metrics.js.map