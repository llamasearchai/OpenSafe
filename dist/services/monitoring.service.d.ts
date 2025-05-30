/// <reference types="node" />
import { EventEmitter } from 'events';
import { MetricsCollector } from '../utils/metrics';
export declare class MonitoringService extends EventEmitter {
    private metrics;
    private alerts;
    private anomalyDetectionInterval?;
    private hourlyViolationCounts;
    constructor(metricsCollectorInstance?: MetricsCollector);
    private setupMonitoringListeners;
    triggerAlert(type: string, data: any, severity?: 'info' | 'warning' | 'error' | 'critical'): void;
    private sendToExternalAlertingService;
    getMetricsSnapshot(): Promise<string>;
    getActiveAlerts(since?: Date): any[];
    acknowledgeAlert(alertId: string, userId: string): boolean;
    private runAnomalyDetectionTasks;
    private getSeverityForType;
}
export declare const monitoringService: MonitoringService;
//# sourceMappingURL=monitoring.service.d.ts.map