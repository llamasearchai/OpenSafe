import { ResearchExperiment, UserRole } from '../models/types';
import { ResearchExperimentSchema } from '../models/schemas';
import { z } from 'zod';
export declare class ResearchService {
    private redis;
    constructor();
    private connectRedis;
    createExperiment(params: z.infer<typeof ResearchExperimentSchema>, actorId: string): Promise<ResearchExperiment>;
    queueExperiment(id: string, actorId: string): Promise<ResearchExperiment>;
    getExperiment(id: string, actorId: string, actorRole?: UserRole): Promise<ResearchExperiment | null>;
    listExperiments(filters: {
        status?: ResearchExperiment['status'];
        userId?: string;
        page?: number;
        limit?: number;
    }, actorId: string, actorRole: UserRole): Promise<{
        experiments: ResearchExperiment[];
        total: number;
        pages: number;
    }>;
    private processExperimentQueue;
    private runExperimentInternal;
    private generateMethodology;
    private executeSimulatedExperiment;
    private updateExperimentInDb;
    cancelExperiment(id: string, actorId: string): Promise<ResearchExperiment>;
}
export declare const researchService: ResearchService;
//# sourceMappingURL=research.service.d.ts.map