import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
export declare function validateBody(schema: AnyZodObject): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateQuery(schema: AnyZodObject): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateParams(schema: AnyZodObject): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map