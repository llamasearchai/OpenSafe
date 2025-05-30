"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.database = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class Database {
    pool;
    constructor() {
        this.pool = new pg_1.Pool({
            connectionString: config_1.config.databaseUrl,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.pool.on('error', (err) => {
            logger_1.logger.error('Unexpected error on idle client', err);
        });
    }
    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async close() {
        await this.pool.end();
    }
}
exports.database = new Database();
// Database schema initialization
async function initializeDatabase() {
    try {
        await exports.database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        api_key_hash VARCHAR(255) NULL,
        api_key_name VARCHAR(100) NULL,
        api_key_expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        await exports.database.query(`
      CREATE TABLE IF NOT EXISTS experiments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        hypothesis TEXT NOT NULL,
        methodology TEXT,
        parameters JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        results JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        await exports.database.query(`
      CREATE TABLE IF NOT EXISTS safety_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        text_hash VARCHAR(64) NOT NULL,
        analysis_result JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        await exports.database.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        service_name VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(255),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'success',
        error_message TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
        await exports.database.query(`
      CREATE TABLE IF NOT EXISTS safety_policies (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        rules JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name, version)
      )
    `);
        // Create indexes
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_experiments_user_id ON experiments(user_id);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_safety_analyses_user_id ON safety_analyses(user_id);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_safety_analyses_text_hash ON safety_analyses(text_hash);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_safety_policies_name_version ON safety_policies(name, version);`);
        await exports.database.query(`CREATE INDEX IF NOT EXISTS idx_safety_policies_is_active ON safety_policies(is_active);`);
        logger_1.logger.info('Database schema initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Database initialization failed', error);
        throw error;
    }
}
exports.initializeDatabase = initializeDatabase;
//# sourceMappingURL=database.js.map