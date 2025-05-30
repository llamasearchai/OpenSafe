import { database } from '../models/database';
import { logger } from '../utils/logger';
import { AuditLogEntry } from '../models/types'; // Ensure this type is defined
import { AuditLogFilterSchema } from '../models/schemas'; // Ensure this schema is defined
import { z } from 'zod';

export class AuditService {
  async logAction(data: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      await database.query(`
        INSERT INTO audit_logs (user_id, service_name, action, resource_type, resource_id, details, ip_address, user_agent, status, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        data.userId,
        data.serviceName,
        data.action,
        data.resourceType,
        data.resourceId,
        data.details ? JSON.stringify(data.details) : null,
        data.ipAddress,
        data.userAgent,
        data.status,
        data.errorMessage,
      ]);
    } catch (error) {
      logger.error('Failed to log audit action', { error, auditData: data });
      // Avoid throwing an error here to prevent cascading failures if audit logging fails
    }
  }

  async getAuditLogs(filters: z.infer<typeof AuditLogFilterSchema>): Promise<{ logs: AuditLogEntry[]; total: number; pages: number }> {
    const {
        page = 1,
        limit = 50,
        userId,
        action,
        resourceType,
        startDate,
        endDate,
    } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }
    if (action) {
      conditions.push(`action ILIKE $${paramIndex++}`); // Case-insensitive search
      params.push(`%${action}%`);
    }
    if (resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(resourceType);
    }
    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(new Date(startDate));
    }
    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(new Date(endDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const logsQuery = `
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const countQuery = `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`;

    const logsParams = [...params, limit, offset];
    const countParams = params;

    const [logsResult, countResult] = await Promise.all([
      database.query<AuditLogEntry>(logsQuery, logsParams),
      database.query<{ count: string }>(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult[0].count, 10);

    return {
      logs: logsResult,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}

export const auditService = new AuditService(); 