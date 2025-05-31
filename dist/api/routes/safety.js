"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schemas_1 = require("../../models/schemas");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../../middleware/validation");
const router = (0, express_1.Router)();
// Simple asyncHandler
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Mock safety service
const safetyService = {
    analyzeText: async (_data) => ({
        safe: true,
        score: 0.95,
        violations: [],
        metadata: {
            analysisTime: 50,
            modelVersion: 'mock-v1.0',
            timestamp: new Date().toISOString()
        }
    }),
    applyConstitutionalPrinciples: async (data) => ({
        original: data.text,
        revised: data.text,
        critiques: [],
        revisionCount: 0,
        principles: ['harmlessness', 'helpfulness'],
        appliedSuccessfully: true
    })
};
router.post('/analyze', auth_1.authenticate, (0, validation_1.validateBody)(schemas_1.SafetyAnalysisRequestSchema), asyncHandler(async (req, res) => {
    const result = await safetyService.analyzeText({
        ...req.body,
        userId: req.user.id
    });
    res.json(result);
}));
router.post('/constitutional', auth_1.authenticate, (0, validation_1.validateBody)(schemas_1.ConstitutionalAIRequestSchema), asyncHandler(async (req, res) => {
    const result = await safetyService.applyConstitutionalPrinciples(req.body);
    res.json(result);
}));
router.get('/policies', auth_1.authenticate, asyncHandler(async (_req, res) => {
    // Mock policy list
    const policies = [
        {
            id: 'default',
            name: 'Default Safety Policy',
            version: '1.0.0',
            isActive: true,
            rules: []
        }
    ];
    res.json({ policies });
}));
exports.default = router;
//# sourceMappingURL=safety.js.map