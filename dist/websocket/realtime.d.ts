import { WebSocketServer, WebSocket } from 'ws';
import { UserRole } from '../models/types';
import { RustBridge } from '../safety/rust_bridge';
interface WSClient {
    id: string;
    ws: WebSocket;
    userId: string;
    userRole: UserRole;
    subscriptions: Set<string>;
    ip: string;
}
export declare function setupWebSocket(wss: WebSocketServer): {
    broadcast: (channel: string, data: any, targetUserId?: string) => void;
    clients: Map<string, WSClient>;
    rustBridge: RustBridge;
};
export {};
//# sourceMappingURL=realtime.d.ts.map