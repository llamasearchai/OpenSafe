"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_service_1 = require("../../services/audit.service");
const auth_1 = require("../middleware/auth");
const types_1 = require("../../models/types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER])); // Admins and Researchers can view audit logs
// Simple asyncHandler
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
router.get('/', auth_1.authenticate, asyncHandler(async (req, res) => {
    const filters = {
        userId: req.query.userId,
        action: req.query.action,
        resourceType: req.query.resourceType,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
    };
    const result = await audit_service_1.auditService.getAuditLogs(filters);
    res.json(result);
}));
exports.default = router;
//# sourceMappingURL=audit.js.map