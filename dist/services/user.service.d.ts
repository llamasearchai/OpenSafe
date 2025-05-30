import { z } from 'zod';
import { UserRegistrationSchema, UserLoginSchema, UserUpdateSchema, ApiKeyRequestSchema } from '../models/schemas';
import { User } from '../models/types';
interface UserEntity extends User {
    password_hash: string;
    api_key_hash?: string | null;
    api_key_name?: string | null;
    api_key_expires_at?: Date | null;
}
export declare class UserService {
    private readonly BCRYPT_SALT_ROUNDS;
    createUser(data: z.infer<typeof UserRegistrationSchema>): Promise<Omit<UserEntity, 'password_hash' | 'api_key_hash'>>;
    loginUser(data: z.infer<typeof UserLoginSchema>): Promise<{
        user: Omit<UserEntity, 'password_hash' | 'api_key_hash'>;
        token: string;
    }>;
    getUserById(id: string): Promise<Omit<UserEntity, 'password_hash' | 'api_key_hash'> | null>;
    updateUser(id: string, updates: z.infer<typeof UserUpdateSchema>, actorId: string): Promise<Omit<UserEntity, 'password_hash' | 'api_key_hash'>>;
    deleteUser(id: string, actorId: string): Promise<void>;
    listUsers(page?: number, limit?: number): Promise<{
        users: Omit<UserEntity, 'password_hash' | 'api_key_hash'>[];
        total: number;
        pages: number;
    }>;
    generateApiKey(userId: string, data: z.infer<typeof ApiKeyRequestSchema>): Promise<{
        apiKey: string;
        name: string;
        expiresAt?: Date;
    }>;
    revokeApiKey(userId: string): Promise<void>;
    validateApiKey(apiKey: string): Promise<UserEntity | null>;
}
export declare const userService: UserService;
export {};
//# sourceMappingURL=user.service.d.ts.map