"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = require("express");
const openai_service_1 = require("../../services/openai.service");
const auth_1 = require("../middleware/auth");
const schemas_1 = require("../../models/schemas");
const validation_1 = require("../../middleware/validation");
const router = (0, express_1.Router)();
exports.chatRoutes = router;
// Simple asyncHandler
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Simple rate limiter placeholder
const simpleRateLimit = (_req, _res, next) => {
    // In production, implement proper rate limiting
    next();
};
router.post('/completions', auth_1.authenticate, simpleRateLimit, (0, validation_1.validateBody)(schemas_1.ChatRequestSchema), asyncHandler(async (req, res) => {
    try {
        const completion = await openai_service_1.openAIService.createSafeChatCompletion(req.body, req.user.id);
        res.json({ completion });
    }
    catch (error) {
        const err = error;
        if (err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}));
router.post('/stream', auth_1.authenticate, simpleRateLimit, (0, validation_1.validateBody)(schemas_1.ChatRequestSchema), asyncHandler(async (req, res) => {
    try {
        // Set streaming headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        await openai_service_1.openAIService.createSafeStreamingCompletion(req.body, (chunk, isSafe, violations) => {
            const dataToSend = {
                ...chunk,
                safety_status: {
                    is_safe: isSafe,
                    violations_detected: violations?.length || 0
                }
            };
            res.write(`data: ${JSON.stringify(dataToSend)}\n\n`);
        }, (_fullResponseText, finalSafety) => {
            res.write(`data: ${JSON.stringify({ event: 'done', final_safety_analysis: finalSafety })}\n\n`);
            res.end();
        }, (error) => {
            const err = error;
            if (!res.headersSent) {
                if (err.statusCode) {
                    res.status(err.statusCode).json({ error: err.message });
                }
                else {
                    res.status(500).json({ error: 'Streaming failed' });
                }
            }
            else {
                res.write(`data: ${JSON.stringify({ error: 'stream_failed', message: err.message })}\n\n`);
                res.end();
            }
        }, req.user.id);
    }
    catch (error) {
        const err = error;
        if (!res.headersSent) {
            if (err.statusCode) {
                res.status(err.statusCode).json({ error: err.message });
            }
            else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}));
//# sourceMappingURL=chat.js.map