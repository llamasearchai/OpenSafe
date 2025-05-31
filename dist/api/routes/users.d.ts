import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
declare const router: import("express-serve-static-core").Router;
export default router;
export declare function validateParams(schema: z.ZodSchema<any>): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=users.d.ts.map