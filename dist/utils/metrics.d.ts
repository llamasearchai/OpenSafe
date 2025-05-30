import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
export declare class MetricsCollector {
    register: Registry;
    private counters;
    private histograms;
    private gauges;
    private summaries;
    constructor();
    private initializeMetrics;
    createCounter(name: string, help: string, labels?: string[], value?: number): Counter<string>;
    createHistogram(name: string, help: string, labels?: string[], buckets?: number[]): Histogram<string>;
    createGauge(name: string, help: string, labels?: string[]): Gauge<string>;
    createSummary(name: string, help: string, labels?: string[], percentiles?: number[]): Summary<string>;
    incrementCounter(name: string, labels?: Record<string, string | number>, value?: number): void;
    observeHistogram(name: string, value: number, labels?: Record<string, string | number>): void;
    observeSummary(name: string, value: number, labels?: Record<string, string | number>): void;
    setGauge(name: string, value: number, labels?: Record<string, string | number>): void;
    incrementGauge(name: string, labels?: Record<string, string | number>, value?: number): void;
    decrementGauge(name: string, labels?: Record<string, string | number>, value?: number): void;
    private stringifyLabels;
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=metrics.d.ts.map