import { AuditLogEntry } from '../models/types';
import { AuditLogFilterSchema } from '../models/schemas';
import { z } from 'zod';
export declare class AuditService {
    logAction(data: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
    getAuditLogs(filters: z.infer<typeof AuditLogFilterSchema>): Promise<{
        logs: AuditLogEntry[];
        total: number;
        pages: number;
    }>;
}
export declare const auditService: AuditService;
//# sourceMappingURL=audit.service.d.ts.map