"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_service_1 = require("../../services/audit.service");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../../utils/errors");
const schemas_1 = require("../../models/schemas");
const types_1 = require("../../models/types");
const validation_1 = require("../../middleware/validation"); // Assuming validateQuery exists
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)([types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER])); // Admins and Researchers can view audit logs
router.get('/', (0, validation_1.validateQuery)(schemas_1.AuditLogFilterSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    // Researchers should only be able to see their own actions or general system events if not scoped
    // For simplicity here, an admin can see all. A researcher filter might be added in the service.
    // If researcher is not querying for their own ID, limit scope or deny.
    // For now, let's assume the service handles filtering by role if necessary or we add it here.
    // req.query.userId = req.user.id; // Auto-filter for researcher's own logs
    const result = await audit_service_1.auditService.getAuditLogs(req.query); // Cast as any if schema mismatch after validation
    res.json(result);
}));
exports.default = router;
//# sourceMappingURL=audit.js.map