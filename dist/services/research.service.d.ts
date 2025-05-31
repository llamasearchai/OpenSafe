import { ResearchExperiment, ExperimentResults } from '../models/types';
export declare class ResearchService {
    private experiments;
    constructor();
    createExperiment(params: {
        hypothesis: string;
        experiment_type: string;
        parameters?: Record<string, any>;
    }): Promise<ResearchExperiment>;
    getExperiment(id: string): Promise<ResearchExperiment | null>;
    listExperiments(filters: {
        status?: string;
    }): Promise<ResearchExperiment[]>;
    runExperiment(id: string): Promise<ExperimentResults>;
    private generateMethodology;
    private executeExperiment;
}
export declare const researchService: ResearchService;
//# sourceMappingURL=research.service.d.ts.map