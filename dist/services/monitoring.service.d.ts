/// <reference types="node" />
import { EventEmitter } from 'events';
import { ViolationType } from '../models/types';
export declare class MonitoringService extends EventEmitter {
    private metrics;
    private alerts;
    constructor();
    private setupMonitoring;
    triggerAlert(type: string, data: any): void;
    private sendToAlertingService;
    getMetrics(): Promise<string>;
    getAlerts(since?: Date): any[];
    checkSystemHealth(): Promise<boolean>;
    detectAnomalies(violationData: {
        type: ViolationType;
        severity: string;
        timestamp: Date;
    }[]): void;
    cleanupAlerts(olderThan: Date): void;
}
export declare const monitoringService: MonitoringService;
//# sourceMappingURL=monitoring.service.d.ts.map