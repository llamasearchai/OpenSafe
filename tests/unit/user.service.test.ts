import { UserService } from '../../src/services/user.service';
import { database } from '../../src/models/database';
import { auditService } from '../../src/services/audit.service';
import { AppError } from '../../src/utils/errors';
import { UserRole } from '../../src/models/types';
import bcrypt from 'bcrypt';

jest.mock('../../src/models/database');
jest.mock('../../src/services/audit.service');
jest.mock('bcrypt');

describe('UserService', () => {
  let userService: UserService;
  const mockUserEmail = 'test@example.com';
  const mockUserPassword = 'Password123!';

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce([]) // No existing user
        .mockResolvedValueOnce([{ id: 'uuid-123', email: mockUserEmail, role: UserRole.USER, created_at: new Date(), updated_at: new Date() }]); // New user

      const user = await userService.createUser({ email: mockUserEmail, password: mockUserPassword, role: UserRole.USER });

      expect(database.query).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserPassword, 12);
      expect(user.email).toBe(mockUserEmail);
      expect(user.role).toBe(UserRole.USER);
      expect(auditService.logAction).toHaveBeenCalled();
    });

    it('should throw an error if user already exists', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce([{ id: 'existing-uuid' }]); // Existing user

      await expect(userService.createUser({ email: mockUserEmail, password: mockUserPassword, role: UserRole.USER }))
        .rejects.toThrow(new AppError(409, 'User with this email already exists'));
      expect(auditService.logAction).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    const mockDbUser = { id: 'uuid-123', email: mockUserEmail, password_hash: 'hashedPassword', role: UserRole.USER, created_at: new Date(), updated_at: new Date() };

    it('should login an existing user with correct credentials', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce([mockDbUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await userService.loginUser({ email: mockUserEmail, password: mockUserPassword });

      expect(result.user.email).toBe(mockUserEmail);
      expect(result.token).toBeDefined();
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'user_login_success' }));
    });

    it('should throw an error for non-existent user', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce([]);

      await expect(userService.loginUser({ email: mockUserEmail, password: mockUserPassword }))
        .rejects.toThrow(new AppError(401, 'Invalid email or password'));
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'user_login_failed', details: expect.objectContaining({ reason: 'user_not_found' })}));
    });

    it('should throw an error for invalid password', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce([mockDbUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(userService.loginUser({ email: mockUserEmail, password: 'wrongPassword' }))
        .rejects.toThrow(new AppError(401, 'Invalid email or password'));
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'user_login_failed', details: expect.objectContaining({ reason: 'invalid_password' })}));
    });
  });

  describe('generateApiKey', () => {
    it('should generate and hash an API key for a user', async () => {
      const userId = 'user-uuid-456';
      const apiKeyName = 'test-key';
      (database.query as jest.Mock).mockResolvedValueOnce([{ id: userId }]); // Mock update query
      
      const result = await userService.generateApiKey(userId, { name: apiKeyName });

      expect(result.apiKey).toMatch(/^osk-/);
      expect(result.name).toBe(apiKeyName);
      expect(bcrypt.hash).toHaveBeenCalledWith(result.apiKey, 12);
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([expect.any(String), apiKeyName, null, userId]) // expiresAt is null if not provided
      );
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'api_key_generate' }));
    });
  });
  
  // Add more tests for getUserById, updateUser, deleteUser, listUsers, revokeApiKey, validateApiKey
}); 