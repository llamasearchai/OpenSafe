"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schemas_1 = require("../../models/schemas");
const safety_service_1 = require("../../services/safety.service"); // Use SafetyService
const auth_1 = require("../middleware/auth");
const errors_1 = require("../../utils/errors");
const validation_1 = require("../../middleware/validation");
const router = (0, express_1.Router)();
// All safety routes require authentication
router.use(auth_1.authenticate);
router.post('/analyze', (0, validation_1.validateBody)(schemas_1.SafetyAnalysisRequestSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    const actorId = req.user?.id;
    const result = await safety_service_1.safetyService.analyzeText(req.body, actorId);
    res.json(result);
}));
router.post('/constitutional', (0, validation_1.validateBody)(schemas_1.ConstitutionalAIRequestSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    const actorId = req.user?.id;
    const result = await safety_service_1.safetyService.applyConstitutionalPrinciples(req.body, actorId);
    res.json(result);
}));
// Placeholder for interpretability, can be expanded later
router.post('/interpret', 
// validateBody(InterpretabilityRequestSchema) // TODO: Create schema
(0, errors_1.asyncHandler)(async (req, res) => {
    // const actorId = req.user?.id;
    // const { text, model } = req.body;
    // const result = await safetyService.getInterpretability(text, model, actorId);
    res.status(501).json({ message: 'Interpretability endpoint not yet fully implemented.' });
}));
exports.default = router;
//# sourceMappingURL=safety.js.map