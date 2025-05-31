import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { database } from '../models/database';
import { config } from '../config';
// Replace logger import with a simple console-based logger if './logger' is missing
const logger = {
  info: (...args: any[]) => console.info('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};
// Replace AppError import with a simple custom error class if '../utils/error' is missing
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
import { UserRegistrationSchema, UserLoginSchema, UserUpdateSchema, UserRole, ApiKeyRequestSchema } from '../models/schemas'; // Import schemas
import { User } from '../models/types'; // Import User type from types.ts
import { auditService } from './audit.service'; // For logging user actions

// Use User interface from types.ts directly
interface UserEntity extends User {
  password_hash: string;
  api_key_hash?: string | null;
  api_key_name?: string | null;
  api_key_expires_at?: Date | null;
}

export class UserService {
  private readonly BCRYPT_SALT_ROUNDS = 12;

  async createUser(data: z.infer<typeof UserRegistrationSchema>): Promise<Omit<UserEntity, 'password_hash' | 'api_key_hash'>> {
    const { email, password, role = UserRole.USER } = data;

    const existingUsers = await database.query<UserEntity>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      logger.warn('Attempt to create user with existing email', { email });
      throw new AppError(409, 'User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);
    const userId = uuidv4();

    const result = await database.query<UserEntity>(`
      INSERT INTO users (id, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role, created_at, updated_at
    `, [userId, email.toLowerCase(), passwordHash, role]);

    const newUser = result[0];
    logger.info('User created successfully', { userId: newUser.id, email: newUser.email, role: newUser.role });
    
    await auditService.logAction({
        userId: newUser.id,
        action: 'user_registration',
        resourceType: 'user',
        resourceId: newUser.id,
        details: { email: newUser.email, role: newUser.role },
        status: 'success'
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, api_key_hash, ...userToReturn } = newUser;
    return userToReturn;
  }

  async loginUser(data: z.infer<typeof UserLoginSchema>): Promise<{ user: Omit<UserEntity, 'password_hash' | 'api_key_hash'>; token: string }> {
    const { email, password } = data;

    const users = await database.query<UserEntity>(`
      SELECT id, email, password_hash, role, created_at, updated_at
      FROM users WHERE email = $1
    `, [email.toLowerCase()]);

    if (users.length === 0) {
      logger.warn('Login attempt for non-existent user', { email });
      await auditService.logAction({ action: 'user_login_failed', details: { email, reason: 'user_not_found' }, status: 'failure'});
      throw new AppError(401, 'Invalid email or password');
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Invalid password attempt', { userId: user.id, email: user.email });
      await auditService.logAction({ userId: user.id, action: 'user_login_failed', details: { email, reason: 'invalid_password' }, status: 'failure'});
      throw new AppError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.security.jwtSecret,
      { expiresIn: '24h' } // Consider making this configurable
    );

    logger.info('User logged in successfully', { userId: user.id, email: user.email });
    await auditService.logAction({ userId: user.id, action: 'user_login_success', resourceType: 'user', resourceId: user.id, status: 'success' });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, api_key_hash, ...userToReturn } = user;
    return { user: userToReturn, token };
  }

  async getUserById(id: string): Promise<Omit<UserEntity, 'password_hash' | 'api_key_hash'> | null> {
    const users = await database.query<UserEntity>(`
      SELECT id, email, role, api_key_name, api_key_expires_at, created_at, updated_at
      FROM users WHERE id = $1
    `, [id]);

    if (users.length === 0) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, api_key_hash, ...userToReturn } = users[0];
    return userToReturn;
  }

  async updateUser(id: string, updates: z.infer<typeof UserUpdateSchema>, actorId: string): Promise<Omit<UserEntity, 'password_hash' | 'api_key_hash'>> {
    const { email, role } = updates;
    const updateFields: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (email) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (role) {
      updateFields.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    // if (settings) { // Assuming settings is a JSONB column
    //   updateFields.push(`settings = $${paramIndex++}`);
    //   values.push(settings);
    // }

    if (updateFields.length === 0) {
      throw new AppError(400, 'No update fields provided');
    }

    updateFields.push(`updated_at = NOW()`);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id, email, role, created_at, updated_at
    `;

    const result = await database.query<UserEntity>(query, values);

    if (result.length === 0) {
      logger.warn('Attempt to update non-existent user', { userId: id });
      throw new AppError(404, 'User not found');
    }
    
    const updatedUser = result[0];
    logger.info('User updated successfully', { userId: updatedUser.id, updatedFields: Object.keys(updates) });
    await auditService.logAction({
        userId: actorId,
        action: 'user_update',
        resourceType: 'user',
        resourceId: id,
        details: { updates },
        status: 'success',
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, api_key_hash, ...userToReturn } = updatedUser;
    return userToReturn;
  }
  async deleteUser(id: string, actorId: string): Promise<void> {
    const result = await database.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.length === 0 || !result[0].id) {
      logger.warn('Attempt to delete non-existent user', { userId: id });
      throw new AppError(404, 'User not found');
    }
    logger.info('User deleted successfully', { userId: id });
    await auditService.logAction({
        userId: actorId,
        action: 'user_delete',
        resourceType: 'user',
        resourceId: id,
        status: 'success',
    });
  }

  async listUsers(page: number = 1, limit: number = 20): Promise<{ users: Omit<UserEntity, 'password_hash' | 'api_key_hash'>[]; total: number; pages: number }> {
    const offset = (page - 1) * limit;
    
    const [usersResult, countResult] = await Promise.all([
      database.query<UserEntity>(`
        SELECT id, email, role, api_key_name, api_key_expires_at, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      database.query<{ count: string }>('SELECT COUNT(*) as count FROM users')
    ]);

    const total = parseInt(countResult[0].count, 10);
    const users = usersResult.map(u => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password_hash, api_key_hash, ...user } = u;
        return user;
    });

    return {
      users,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async generateApiKey(userId: string, data: z.infer<typeof ApiKeyRequestSchema>): Promise<{ apiKey: string; name: string; expiresAt?: Date }> {
    const apiKey = `osk-${uuidv4().replace(/-/g, '')}`; // OpenAI-like key format
    const apiKeyHash = await bcrypt.hash(apiKey, this.BCRYPT_SALT_ROUNDS);
    
    let expiresAt: Date | null = null;
    if (data.expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
    }

    await database.query(`
        UPDATE users
        SET api_key_hash = $1, api_key_name = $2, api_key_expires_at = $3, updated_at = NOW()
        WHERE id = $4
    `, [apiKeyHash, data.name, expiresAt, userId]);

    logger.info('API key generated for user', { userId, keyName: data.name, expiresAt });
    await auditService.logAction({
        userId,
        action: 'api_key_generate',
        resourceType: 'user',
        resourceId: userId,
        details: { keyName: data.name, expiresAt },
        status: 'success',
    });
    return { apiKey, name: data.name || 'default-key', expiresAt: expiresAt || undefined };
  }

  async revokeApiKey(userId: string): Promise<void> {
    const result = await database.query(`
        UPDATE users
        SET api_key_hash = NULL, api_key_name = NULL, api_key_expires_at = NULL, updated_at = NOW()
        WHERE id = $1 AND api_key_hash IS NOT NULL
        RETURNING id
    `, [userId]);

    if (result.length === 0) {
        throw new AppError(404, 'User not found or no active API key to revoke.');
    }

    logger.info('API key revoked for user', { userId });
    await auditService.logAction({
        userId,
        action: 'api_key_revoke',
        resourceType: 'user',
        resourceId: userId,
        status: 'success',
    });
  }

  async validateApiKey(apiKey: string): Promise<UserEntity | null> {
    if (!apiKey.startsWith('osk-')) {
        return null;
    }
    // This is inefficient. In a real system, you'd query for users with non-null api_key_hash.
    // For this example, we'll keep it simpler. A better approach is to use a separate API keys table.
    const usersWithKeys = await database.query<UserEntity>(`SELECT * FROM users WHERE api_key_hash IS NOT NULL`);
    for (const user of usersWithKeys) {
        if (user.api_key_hash && await bcrypt.compare(apiKey, user.api_key_hash)) {
            if (user.api_key_expires_at && new Date(user.api_key_expires_at) < new Date()) {
                logger.warn('Expired API key used', { userId: user.id, keyName: user.api_key_name });
                return null; // Key expired
            }
            return user;
        }
    }
    return null;
  }
}

export const userService = new UserService(); 
