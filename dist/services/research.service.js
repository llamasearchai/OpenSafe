"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.researchService = exports.ResearchService = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../models/types");
const logger_1 = require("../utils/logger");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const database_1 = require("../models/database"); // Use database for persistence
const errors_1 = require("../utils/errors");
const audit_service_1 = require("./audit.service");
// In-memory queue for simplicity, replace with a proper job queue (e.g., BullMQ, Celery) in production
const experimentQueue = [];
const runningExperiments = new Map();
class ResearchService {
    redis;
    constructor() {
        this.redis = new ioredis_1.default(config_1.config.redisUrl, { lazyConnect: true });
        this.connectRedis();
        this.processExperimentQueue(); // Start queue processor
    }
    async connectRedis() {
        try {
            await this.redis.connect();
            logger_1.logger.info('ResearchService connected to Redis.');
        }
        catch (error) {
            logger_1.logger.error('ResearchService failed to connect to Redis:', error);
        }
    }
    async createExperiment(params, actorId) {
        const experimentId = (0, uuid_1.v4)();
        const experiment = {
            id: experimentId,
            userId: params.userId, // actorId could also be used if it represents the user
            hypothesis: params.hypothesis,
            methodology: this.generateMethodology(params.experiment_type, params.parameters),
            parameters: params.parameters || {},
            status: 'pending', // Or 'queued' if directly added to queue
            createdAt: new Date(),
            updatedAt: new Date(),
            logs: [`Experiment created at ${new Date().toISOString()}`],
        };
        await database_1.database.query(`INSERT INTO experiments (id, user_id, hypothesis, methodology, parameters, status, created_at, updated_at, logs)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [experiment.id, experiment.userId, experiment.hypothesis, experiment.methodology, experiment.parameters, experiment.status, experiment.createdAt, experiment.updatedAt, experiment.logs]);
        logger_1.logger.info('Research experiment created', { experimentId: experiment.id, userId: experiment.userId });
        await audit_service_1.auditService.logAction({
            userId: actorId,
            action: 'experiment_create',
            resourceType: 'experiment',
            resourceId: experiment.id,
            details: { hypothesis: params.hypothesis, type: params.experiment_type },
            status: 'success',
        });
        // Optionally, add to queue immediately
        // await this.queueExperiment(experiment.id);
        return experiment;
    }
    async queueExperiment(id, actorId) {
        const experiment = await this.getExperiment(id, actorId); // actorId for permission check
        if (!experiment) {
            throw new errors_1.AppError(404, 'Experiment not found to queue.');
        }
        if (experiment.status !== 'pending') {
            throw new errors_1.AppError(400, `Experiment cannot be queued, status is ${experiment.status}`);
        }
        experiment.status = 'queued';
        experiment.logs?.push(`Experiment queued at ${new Date().toISOString()}`);
        await this.updateExperimentInDb(id, { status: 'queued', logs: experiment.logs });
        experimentQueue.push(id);
        logger_1.logger.info('Experiment queued', { experimentId: id });
        await audit_service_1.auditService.logAction({
            userId: actorId,
            action: 'experiment_queue',
            resourceType: 'experiment',
            resourceId: id,
            status: 'success',
        });
        this.processExperimentQueue(); // Ensure processor is running
        return experiment;
    }
    async getExperiment(id, actorId, actorRole) {
        const cacheKey = `experiment:${id}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Returning cached experiment', { experimentId: id });
                const experiment = JSON.parse(cached);
                // Permission check
                if (actorRole !== types_1.UserRole.ADMIN && experiment.userId !== actorId) {
                    throw new errors_1.AppError(403, "Forbidden: You do not have permission to view this experiment.");
                }
                return experiment;
            }
        }
        catch (err) {
            logger_1.logger.warn("Redis error getting experiment, fetching from DB", { experimentId: id, error: err });
        }
        const result = await database_1.database.query('SELECT * FROM experiments WHERE id = $1', [id]);
        if (result.length === 0)
            return null;
        const experimentFromDb = result[0];
        // Permission check
        if (actorRole !== types_1.UserRole.ADMIN && experimentFromDb.userId !== actorId) {
            throw new errors_1.AppError(403, "Forbidden: You do not have permission to view this experiment.");
        }
        try {
            await this.redis.setex(cacheKey, 3600, JSON.stringify(experimentFromDb)); // Cache for 1 hour
        }
        catch (err) {
            logger_1.logger.warn("Redis error setting experiment cache", { experimentId: id, error: err });
        }
        return experimentFromDb;
    }
    async listExperiments(filters, actorId, actorRole) {
        const { status, userId, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (actorRole !== types_1.UserRole.ADMIN) {
            // Non-admins can only see their own experiments
            conditions.push(`user_id = $${paramIndex++}`);
            params.push(actorId);
        }
        else if (userId) {
            // Admin can filter by userId
            conditions.push(`user_id = $${paramIndex++}`);
            params.push(userId);
        }
        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const experimentsQuery = `SELECT * FROM experiments ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        const countQuery = `SELECT COUNT(*) as count FROM experiments ${whereClause}`;
        const queryParams = [...params, limit, offset];
        const countParamsMain = params;
        const [experimentsResult, countResult] = await Promise.all([
            database_1.database.query(experimentsQuery, queryParams),
            database_1.database.query(countQuery, countParamsMain)
        ]);
        const total = parseInt(countResult[0].count, 10);
        return { experiments: experimentsResult, total, pages: Math.ceil(total / limit) };
    }
    async processExperimentQueue() {
        if (runningExperiments.size >= (parseInt(process.env.MAX_CONCURRENT_EXPERIMENTS || "2"))) { // Limit concurrent experiments
            logger_1.logger.info("Max concurrent experiments reached, queue processor waiting.");
            return;
        }
        if (experimentQueue.length > 0) {
            const experimentId = experimentQueue.shift();
            logger_1.logger.info(`Processing experiment from queue: ${experimentId}`);
            // In a real system, actorId for runExperiment might be 'system' or the original user
            this.runExperimentInternal(experimentId, "system-queue").catch(error => {
                logger_1.logger.error(`Failed to process experiment ${experimentId} from queue:`, error);
            });
        }
    }
    async runExperimentInternal(id, actorId) {
        let experiment = await this.getExperiment(id, actorId); // Use internal actor for permission
        if (!experiment) {
            logger_1.logger.error('Experiment not found for execution', { experimentId: id });
            return;
        }
        if (experiment.status !== 'queued') {
            logger_1.logger.warn(`Experiment ${id} is not in queued state, cannot run. Status: ${experiment.status}`);
            return;
        }
        experiment.status = 'running';
        experiment.startedAt = new Date();
        experiment.logs = experiment.logs || [];
        experiment.logs.push(`Experiment started execution at ${experiment.startedAt.toISOString()}`);
        runningExperiments.set(id, experiment);
        await this.updateExperimentInDb(id, { status: 'running', startedAt: experiment.startedAt, logs: experiment.logs });
        await audit_service_1.auditService.logAction({
            userId: actorId, // Or experiment.userId
            action: 'experiment_run_start',
            resourceType: 'experiment',
            resourceId: id,
            status: 'success',
        });
        try {
            // Simulate experiment execution
            const results = await this.executeSimulatedExperiment(experiment);
            experiment.status = 'completed';
            experiment.results = results;
            experiment.completedAt = new Date();
            experiment.logs.push(`Experiment completed successfully at ${experiment.completedAt.toISOString()}`);
            await this.updateExperimentInDb(id, { status: 'completed', results, completedAt: experiment.completedAt, logs: experiment.logs });
            await audit_service_1.auditService.logAction({
                userId: actorId, action: 'experiment_run_complete', resourceType: 'experiment', resourceId: id, status: 'success', details: { metricsCount: Object.keys(results.metrics).length }
            });
        }
        catch (error) {
            logger_1.logger.error('Experiment execution failed', { experimentId: id, error });
            experiment.status = 'failed';
            experiment.completedAt = new Date(); // Mark completion time even for failure
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            experiment.results = { ...(experiment.results || {}), error: errorMessage, metrics: {}, artifacts: [], conclusions: "", nextSteps: [] };
            experiment.logs.push(`Experiment failed at ${experiment.completedAt.toISOString()}: ${errorMessage}`);
            await this.updateExperimentInDb(id, { status: 'failed', results: experiment.results, completedAt: experiment.completedAt, logs: experiment.logs });
            await audit_service_1.auditService.logAction({
                userId: actorId, action: 'experiment_run_failed', resourceType: 'experiment', resourceId: id, status: 'failure', errorMessage
            });
        }
        finally {
            runningExperiments.delete(id);
            await this.redis.del(`experiment:${id}`); // Clear cache after completion/failure
            this.processExperimentQueue(); // Try to process next in queue
        }
    }
    generateMethodology(type, params) {
        // More detailed methodology generation
        switch (type) {
            case 'safety_evaluation': return `Comprehensive safety evaluation using multi-model ensemble and adversarial testing. Parameters: ${JSON.stringify(params)}`;
            case 'alignment_tuning': return `Constitutional AI training with human feedback integration and RLHF. Parameters: ${JSON.stringify(params)}`;
            // ... other types
            default: return `Custom methodology for ${type}. Parameters: ${JSON.stringify(params)}`;
        }
    }
    async executeSimulatedExperiment(experiment) {
        logger_1.logger.info(`Executing experiment: ${experiment.id} - ${experiment.hypothesis}`);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000)); // Simulate 2-7 seconds work
        // Simulate failure for some experiments
        if (Math.random() < 0.15) { // 15% chance of failure
            throw new Error("Simulated experiment failure: Resource limit exceeded");
        }
        return {
            metrics: {
                accuracy: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
                safety_score: Math.random() * 0.4 + 0.6, // 0.6 - 1.0
                alignment_score: Math.random() * 0.35 + 0.65, // 0.65 - 1.0
                robustness_score: Math.random() * 0.5 + 0.5, // 0.5 - 1.0
                runtime_seconds: (Math.random() * 5 + 2).toFixed(2)
            },
            artifacts: [`/artifacts/${experiment.id}/model_checkpoint.pth`, `/artifacts/${experiment.id}/full_report.pdf`, `/artifacts/${experiment.id}/evaluation_log.json`],
            conclusions: `Experiment for "${experiment.hypothesis}" completed. Key findings suggest X, Y, Z.`,
            nextSteps: [
                'Analyze detailed logs for anomalies.',
                'Consider parameter tuning for robustness_score.',
                'Prepare findings for internal review.'
            ]
        };
    }
    async updateExperimentInDb(id, updates) {
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                // Ensure JSONB fields are stringified if they are objects/arrays
                const dbKey = key === 'createdAt' || key === 'updatedAt' || key === 'startedAt' || key === 'completedAt' ? key :
                    (typeof value === 'object' && key !== 'logs' ? key : key); // dates are fine
                updateFields.push(`${dbKey} = $${paramIndex++}`);
                if ((key === 'parameters' || key === 'results') && typeof value === 'object') {
                    values.push(JSON.stringify(value));
                }
                else if (key === 'logs' && Array.isArray(value)) {
                    values.push(value); // Assuming logs is TEXT[] or JSONB in DB
                }
                else {
                    values.push(value);
                }
            }
        });
        if (updateFields.length === 0)
            return;
        updateFields.push(`updated_at = NOW()`);
        const query = `UPDATE experiments SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
        values.push(id);
        await database_1.database.query(query, values);
        await this.redis.del(`experiment:${id}`); // Invalidate cache on update
    }
    async cancelExperiment(id, actorId) {
        const experiment = await this.getExperiment(id, actorId);
        if (!experiment) {
            throw new errors_1.AppError(404, "Experiment not found.");
        }
        if (experiment.status === 'completed' || experiment.status === 'failed' || experiment.status === 'cancelled') {
            throw new errors_1.AppError(400, `Experiment is already in a final state: ${experiment.status}`);
        }
        const oldStatus = experiment.status;
        experiment.status = 'cancelled';
        experiment.completedAt = new Date(); // Mark as completed for cancellation time
        experiment.logs = experiment.logs || [];
        experiment.logs.push(`Experiment cancelled by user ${actorId} at ${experiment.completedAt.toISOString()}`);
        // If it was running, remove from runningExperiments
        if (oldStatus === 'running') {
            runningExperiments.delete(id);
        }
        // If it was queued, remove from queue
        const queueIndex = experimentQueue.indexOf(id);
        if (queueIndex > -1) {
            experimentQueue.splice(queueIndex, 1);
        }
        await this.updateExperimentInDb(id, { status: 'cancelled', completedAt: experiment.completedAt, logs: experiment.logs });
        await audit_service_1.auditService.logAction({
            userId: actorId,
            action: 'experiment_cancel',
            resourceType: 'experiment',
            resourceId: id,
            details: { previousStatus: oldStatus },
            status: 'success',
        });
        this.processExperimentQueue(); // Check if another experiment can run
        return experiment;
    }
}
exports.ResearchService = ResearchService;
exports.researchService = new ResearchService();
//# sourceMappingURL=research.service.js.map