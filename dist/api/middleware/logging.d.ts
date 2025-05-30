import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { AppError } from '../../utils/errors';
export declare function requestLogging(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function detailedErrorLogging(err: Error | AppError, req: AuthenticatedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=logging.d.ts.map