"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = void 0;
const express_1 = require("express");
const user_service_1 = require("../../services/user.service");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../../middleware/validation");
const schemas_1 = require("../../models/schemas");
const types_1 = require("../../models/types");
const zod_1 = require("zod");
// Simple AppError class
class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
// Simple asyncHandler implementation
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
const router = (0, express_1.Router)();
// Public routes
router.post('/register', (0, validation_1.validateBody)(schemas_1.UserRegistrationSchema), asyncHandler(async (req, res) => {
    const user = await user_service_1.userService.createUser(req.body);
    res.status(201).json({ user });
}));
router.post('/login', (0, validation_1.validateBody)(schemas_1.UserLoginSchema), asyncHandler(async (req, res) => {
    const result = await user_service_1.userService.loginUser(req.body);
    res.json(result);
}));
// Authenticated routes
router.use(auth_1.authenticate); // Apply authenticate middleware to all subsequent routes
router.get('/profile', asyncHandler(async (req, res) => {
    const user = await user_service_1.userService.getUserById(req.user.id);
    res.json({ user });
}));
router.put('/profile', (0, validation_1.validateBody)(schemas_1.UserUpdateSchema.partial()), // Allow partial updates for profile
asyncHandler(async (req, res) => {
    if (!req.user?.id)
        throw new AppError(401, "User not authenticated for profile update");
    const updatedUser = await user_service_1.userService.updateUser(req.user.id, req.body, req.user.id);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
}));
router.post('/api-key', (0, validation_1.validateBody)(schemas_1.ApiKeyRequestSchema), asyncHandler(async (req, res) => {
    if (!req.user?.id)
        throw new AppError(401, "User not authenticated for API key generation");
    const apiKeyData = await user_service_1.userService.generateApiKey(req.user.id, req.body);
    res.status(201).json({ message: 'API Key generated successfully', ...apiKeyData });
}));
router.delete('/api-key', asyncHandler(async (req, res) => {
    if (!req.user?.id)
        throw new AppError(401, "User not authenticated for API key revocation");
    await user_service_1.userService.revokeApiKey(req.user.id);
    res.status(204).send();
}));
// Admin routes
router.get('/', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), asyncHandler(async (req, res) => {
    const { page = '1', limit = '20' } = req.query;
    const result = await user_service_1.userService.listUsers(parseInt(page), parseInt(limit));
    res.json(result);
}));
const UserIdParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid("Invalid user ID format") });
router.get('/:id', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), validateParams(UserIdParamsSchema), // Ensure validateParams middleware exists
asyncHandler(async (req, res) => {
    const user = await user_service_1.userService.getUserById(req.params.id);
    if (!user)
        throw new AppError(404, "User not found");
    res.json({ user });
}));
router.put('/:id', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), validateParams(UserIdParamsSchema), (0, validation_1.validateBody)(schemas_1.UserUpdateSchema.partial()), asyncHandler(async (req, res) => {
    if (!req.user?.id)
        throw new AppError(500, "Authenticated user ID missing"); // Should not happen if authorize works
    const user = await user_service_1.userService.updateUser(req.params.id, req.body, req.user.id);
    res.json({ message: 'User updated successfully', user });
}));
router.delete('/:id', (0, auth_1.authorize)([types_1.UserRole.ADMIN]), validateParams(UserIdParamsSchema), asyncHandler(async (req, res) => {
    if (!req.user?.id)
        throw new AppError(500, "Authenticated user ID missing");
    await user_service_1.userService.deleteUser(req.params.id, req.user.id);
    res.status(204).send();
}));
exports.default = router;
function validateParams(schema) {
    return (req, _res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                console.warn('Request params validation failed', { errors: error.errors, path: req.path, params: req.params });
                return next(new AppError(400, 'Parameters validation failed'));
            }
            next(error);
        }
    };
}
exports.validateParams = validateParams;
//# sourceMappingURL=users.js.map