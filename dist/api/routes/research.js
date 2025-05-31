"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Simple asyncHandler
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Mock research service
const researchService = {
    createExperiment: async (data) => ({
        id: 'mock-experiment-id',
        ...data,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    }),
    getExperiment: async (id) => ({
        id,
        hypothesis: 'Mock hypothesis',
        status: 'completed',
        results: { metrics: { accuracy: 0.95 } }
    }),
    listExperiments: async (filters) => ({
        experiments: [],
        total: 0,
        page: filters.page || 1,
        totalPages: 0
    }),
    runExperiment: async (id) => ({
        id,
        status: 'running',
        startedAt: new Date()
    })
};
router.post('/', auth_1.authenticate, asyncHandler(async (req, res) => {
    const experiment = await researchService.createExperiment({
        ...req.body,
        userId: req.user.id
    });
    res.status(201).json({ experiment });
}));
router.get('/:id', auth_1.authenticate, asyncHandler(async (req, res) => {
    const experiment = await researchService.getExperiment(req.params.id);
    res.json({ experiment });
}));
router.get('/', auth_1.authenticate, asyncHandler(async (req, res) => {
    const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        status: req.query.status,
        userId: req.query.userId
    };
    const result = await researchService.listExperiments(filters);
    res.json(result);
}));
router.post('/:id/run', auth_1.authenticate, asyncHandler(async (req, res) => {
    const result = await researchService.runExperiment(req.params.id);
    res.json(result);
}));
router.post('/:id/stop', auth_1.authenticate, asyncHandler(async (req, res) => {
    // Mock stop experiment
    res.json({
        id: req.params.id,
        status: 'stopped',
        stoppedAt: new Date()
    });
}));
exports.default = router;
//# sourceMappingURL=research.js.map