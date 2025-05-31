import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare function validateBody(schema: ZodSchema<any>): (req: Request, _res: Response, next: NextFunction) => void;
export declare function validateQuery(schema: ZodSchema<any>): (req: Request, _res: Response, next: NextFunction) => void;
export declare function validateParams(schema: ZodSchema<any>): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map