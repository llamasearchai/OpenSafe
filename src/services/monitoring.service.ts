import { EventEmitter } from 'events';
import { MetricsCollector } from '../utils/metrics';
import { ViolationType } from '../models/types';

// Simple logger fallback
const logger = {
  info: (...args: any[]) => console.info('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

// Simple config fallback
const config = {
  env: process.env.NODE_ENV || 'development',
  monitoring: {
    alertThreshold: 5,
    checkInterval: 60000
  }
};

export class MonitoringService extends EventEmitter {
  private metrics: MetricsCollector;
  private alerts: Map<string, any>;

  constructor() {
    super();
    this.metrics = new MetricsCollector();
    this.alerts = new Map();
    this.setupMonitoring();
  }

  private setupMonitoring() {
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

  triggerAlert(type: string, data: any) {
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

  private async sendToAlertingService(alert: any) {
    // Integration with PagerDuty, Slack, etc.
    logger.info('Sending alert to external service', { alertId: alert.id });
  }

  getMetrics() {
    return this.metrics.register.metrics();
  }

  getAlerts(since?: Date) {
    const alerts = Array.from(this.alerts.values());
    if (since) {
      return alerts.filter(a => a.timestamp > since);
    }
    return alerts;
  }

  // Health check methods
  async checkSystemHealth(): Promise<boolean> {
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
    } catch (error) {
      logger.error('Health check failed', error);
      return false;
    }
  }

  // Anomaly detection for safety violations
  detectAnomalies(violationData: { type: ViolationType; severity: string; timestamp: Date }[]) {
    const recentViolations = violationData.filter(v => 
      Date.now() - v.timestamp.getTime() < 60000 // Last minute
    );

    const severityMapping = {
      [ViolationType.HARMFUL_CONTENT]: 4,
      [ViolationType.ILLEGAL_CONTENT]: 4,
      [ViolationType.PRIVACY]: 3,
      [ViolationType.BIAS]: 2,
      [ViolationType.MISINFORMATION]: 2,
      [ViolationType.MANIPULATION]: 3,
      [ViolationType.PII_DETECTED]: 3,
      [ViolationType.PROFANITY]: 1,
      [ViolationType.SELF_HARM]: 4,
      [ViolationType.HATE_SPEECH]: 4,
      [ViolationType.POLICY_VIOLATION]: 2,
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
  cleanupAlerts(olderThan: Date) {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < olderThan) {
        this.alerts.delete(id);
      }
    }
  }
}

export const monitoringService = new MonitoringService(); 