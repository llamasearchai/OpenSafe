"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_service_1 = require("../../services/user.service");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../../middleware/validation");
const errors_1 = require("../../utils/errors");
const schemas_1 = require("../../models/schemas");
const types_1 = require("../../models/types");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', (0, validation_1.validateBody)(schemas_1.UserRegistrationSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    const user = await user_service_1.userService.createUser(req.body);
    res.status(201).json({ message: 'User registered successfully', user });
}));
router.post('/login', (0, validation_1.validateBody)(schemas_1.UserLoginSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    const result = await user_service_1.userService.loginUser(req.body);
    res.json({ message: 'Login successful', ...result });
}));
// Authenticated routes
router.use(auth_1.authenticate); // Apply authenticate middleware to all subsequent routes
router.get('/profile', (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id)
        throw new errors_1.AppError(401, "User not authenticated for profile view");
    const user = await user_service_1.userService.getUserById(req.user.id);
    if (!user)
        throw new errors_1.AppError(404, "User profile not found");
    res.json({ user });
}));
router.put('/profile', (0, validation_1.validateBody)(schemas_1.UserUpdateSchema.partial()), // Allow partial updates for profile
(0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id)
        throw new errors_1.AppError(401, "User not authenticated for profile update");
    const updatedUser = await user_service_1.userService.updateUser(req.user.id, req.body, req.user.id);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
}));
router.post('/api-key', (0, validation_1.validateBody)(schemas_1.ApiKeyRequestSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id)
        throw new errors_1.AppError(401, "User not authenticated for API key generation");
    const apiKeyData = await user_service_1.userService.generateApiKey(req.user.id, req.body);
    res.status(201).json({ message: 'API Key generated successfully', ...apiKeyData });
}));
router.delete('/api-key', (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id)
        throw new errors_1.AppError(401, "User not authenticated for API key revocation");
    await user_service_1.userService.revokeApiKey(req.user.id);
    res.status(200).json({ message: 'API Key revoked successfully' });
}));
// Admin routes
router.get('/', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), (0, errors_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await user_service_1.userService.listUsers(page, limit);
    res.json(result);
}));
const UserIdParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid("Invalid user ID format") });
router.get('/:id', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), (0, validation_1.validateParams)(UserIdParamsSchema), // Ensure validateParams middleware exists
(0, errors_1.asyncHandler)(async (req, res) => {
    const user = await user_service_1.userService.getUserById(req.params.id);
    if (!user)
        throw new errors_1.AppError(404, "User not found");
    res.json({ user });
}));
router.put('/:id', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), (0, validation_1.validateParams)(UserIdParamsSchema), (0, validation_1.validateBody)(schemas_1.UserUpdateSchema.partial()), (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id)
        throw new errors_1.AppError(500, "Authenticated user ID missing"); // Should not happen if authorize works
    const user = await user_service_1.userService.updateUser(req.params.id, req.body, req.user.id);
    res.json({ message: 'User updated successfully', user });
}));
router.delete('/:id', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), (0, validation_1.validateParams)(UserIdParamsSchema), (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.user?.id)
        throw new errors_1.AppError(500, "Authenticated user ID missing");
    await user_service_1.userService.deleteUser(req.params.id, req.user.id);
    res.status(204).send();
}));
exports.default = router;
//# sourceMappingURL=users.js.map