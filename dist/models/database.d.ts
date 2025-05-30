import { PoolClient } from 'pg';
declare class Database {
    private pool;
    constructor();
    query<T = any>(text: string, params?: any[]): Promise<T[]>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    close(): Promise<void>;
}
export declare const database: Database;
export declare function initializeDatabase(): Promise<void>;
export {};
//# sourceMappingURL=database.d.ts.map