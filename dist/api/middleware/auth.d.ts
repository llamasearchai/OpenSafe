import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../models/types';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
    };
}
export declare function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
export declare function authorize(allowedRoles: UserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map