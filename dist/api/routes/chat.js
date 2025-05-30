"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schemas_1 = require("../../models/schemas");
const openai_service_1 = require("../../services/openai.service");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const errors_1 = require("../../utils/errors");
const validation_1 = require("../../middleware/validation");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
// All chat routes require authentication
router.use(auth_1.authenticate);
router.post('/completions', rateLimit_1.rateLimiter, // Apply rate limiting
(0, validation_1.validateBody)(schemas_1.ChatRequestSchema), (0, errors_1.asyncHandler)(async (req, res, next) => {
    const params = req.body;
    const actorId = req.user?.id;
    if (params.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Send headers immediately
        try {
            await openai_service_1.openAIService.createSafeStreamingCompletion(params, (chunk, isSafe, violations) => {
                // Optionally, modify chunk or add safety info based on isSafe/violations
                const dataToSend = { ...chunk, safety_status: { is_safe: isSafe, violations_detected: violations?.length || 0 } };
                res.write(`data: ${JSON.stringify(dataToSend)}\n\n`);
            }, (fullResponseText, finalSafety) => {
                // Send a final message indicating completion and final safety status
                res.write(`data: ${JSON.stringify({ event: 'done', final_safety_analysis: finalSafety })}\n\n`);
                res.end();
            }, (error) => {
                logger_1.logger.error('Streaming error in route handler:', error);
                if (!res.headersSent) {
                    // If headers not sent, we can send a proper error response
                    if (error instanceof errors_1.AppError) {
                        res.status(error.statusCode).json({ error: error.message, details: error.details });
                    }
                    else {
                        res.status(500).json({ error: "Streaming failed" });
                    }
                }
                else if (!res.writableEnded) {
                    // If headers sent but stream not ended, try to send an error event and end
                    res.write(`data: ${JSON.stringify({ error: 'stream_failed', message: error.message })}\n\n`);
                    res.end();
                }
                // If stream already ended or headers sent and stream ended, nothing more to do.
            }, actorId);
        }
        catch (error) {
            // This catch is for errors thrown *before* streaming starts (e.g., input validation by service)
            logger_1.logger.error("Error setting up stream for chat completion:", error);
            if (!res.headersSent && error instanceof errors_1.AppError) {
                return res.status(error.statusCode).json({ error: error.message, details: error.details });
            }
            else if (!res.headersSent) {
                return res.status(500).json({ error: "Failed to start streaming chat completion." });
            }
            // If headers already sent, the onError callback within createSafeStreamingCompletion should handle it.
            // Or, we can just log and expect the client to handle stream interruption.
            if (res.writableEnded === false) {
                res.end(); // Ensure the response is ended if an error occurs after streaming started.
            }
        }
    }
    else {
        const result = await openai_service_1.openAIService.createSafeChatCompletion(params, actorId);
        res.json(result);
    }
}));
exports.default = router;
//# sourceMappingURL=chat.js.map