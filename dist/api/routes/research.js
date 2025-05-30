"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schemas_1 = require("../../models/schemas");
const research_service_1 = require("../../services/research.service");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../../utils/errors");
const validation_1 = require("../../middleware/validation");
const types_1 = require("../../models/types");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// All research routes require authentication
router.use(auth_1.authenticate);
const ExperimentIdParamSchema = zod_1.z.object({ id: zod_1.z.string().uuid("Invalid experiment ID format") });
const ExperimentListQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
    userId: zod_1.z.string().uuid().optional(), // For admins to filter by user
    page: zod_1.z.preprocess(val => Number(val), zod_1.z.number().int().positive().optional().default(1)),
    limit: zod_1.z.preprocess(val => Number(val), zod_1.z.number().int().positive().max(100).optional().default(20)),
});
router.post('/experiments', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER]), (0, validation_1.validateBody)(schemas_1.ResearchExperimentSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id)
        throw new errors_1.AppError(401, "User ID missing in token");
    const params = { ...req.body, userId: req.user.id }; // Ensure experiment is tied to the authenticated user
    const experiment = await research_service_1.researchService.createExperiment(params, req.user.id);
    res.status(201).json(experiment);
}));
router.get('/experiments/:id', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER]), (0, validation_1.validateParams)(ExperimentIdParamSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id || !req.user?.role)
        throw new errors_1.AppError(401, "User context missing");
    const experiment = await research_service_1.researchService.getExperiment(req.params.id, req.user.id, req.user.role);
    if (!experiment)
        throw new errors_1.AppError(404, "Experiment not found or access denied");
    res.json(experiment);
}));
router.get('/experiments', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER]), (0, validation_1.validateQuery)(ExperimentListQuerySchema), (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id || !req.user?.role)
        throw new errors_1.AppError(401, "User context missing");
    const filters = req.query;
    const experiments = await research_service_1.researchService.listExperiments(filters, req.user.id, req.user.role);
    res.json(experiments);
}));
router.post('/experiments/:id/queue', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER]), (0, validation_1.validateParams)(ExperimentIdParamSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id || !req.user?.role)
        throw new errors_1.AppError(401, "User context missing");
    // Check if user owns experiment or is admin before queueing
    const experimentToCheck = await research_service_1.researchService.getExperiment(req.params.id, req.user.id, req.user.role);
    if (!experimentToCheck)
        throw new errors_1.AppError(404, "Experiment not found or access denied.");
    const result = await research_service_1.researchService.queueExperiment(req.params.id, req.user.id);
    res.json({ message: "Experiment queued successfully", experiment: result });
}));
router.post('/experiments/:id/cancel', (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER]), (0, validation_1.validateParams)(ExperimentIdParamSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id || !req.user?.role)
        throw new errors_1.AppError(401, "User context missing");
    const experimentToCheck = await research_service_1.researchService.getExperiment(req.params.id, req.user.id, req.user.role);
    if (!experimentToCheck)
        throw new errors_1.AppError(404, "Experiment not found or access denied.");
    const result = await research_service_1.researchService.cancelExperiment(req.params.id, req.user.id);
    res.json({ message: "Experiment cancelled successfully", experiment: result });
}));
// Note: Direct 'run' endpoint is removed as experiments are processed via queue.
// Admin might have a way to force-run or prioritize, but that's an advanced feature.
exports.default = router;
//# sourceMappingURL=research.js.map