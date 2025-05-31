"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
// Simple logger fallback
const logger = {
    info: (...args) => console.info('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
};
function setupWebSocket(wss) {
    const clients = new Map();
    wss.on('connection', (ws, req) => {
        const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
        if (!token) {
            ws.close(1008, 'Missing authentication token');
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.security.jwtSecret);
            const clientId = `${decoded.id}_${Date.now()}`;
            const client = {
                id: clientId,
                ws,
                userId: decoded.id,
                subscriptions: new Set()
            };
            clients.set(clientId, client);
            logger.info('WebSocket client connected', { clientId, userId: decoded.id });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    handleMessage(client, message);
                }
                catch (error) {
                    logger.error('Invalid WebSocket message', error);
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                }
            });
            ws.on('close', () => {
                clients.delete(clientId);
                logger.info('WebSocket client disconnected', { clientId });
            });
            ws.on('error', (error) => {
                logger.error('WebSocket error', { clientId, error });
            });
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'welcome',
                clientId,
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            logger.error('WebSocket authentication failed', error);
            ws.close(1008, 'Invalid authentication token');
        }
    });
    function handleMessage(client, message) {
        switch (message.type) {
            case 'subscribe':
                handleSubscribe(client, message.channel);
                break;
            case 'unsubscribe':
                handleUnsubscribe(client, message.channel);
                break;
            case 'ping':
                client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
            default:
                client.ws.send(JSON.stringify({ error: 'Unknown message type' }));
        }
    }
    function handleSubscribe(client, channelPattern) {
        const allowedChannels = ['safety', 'research', 'monitoring'];
        if (!allowedChannels.includes(channelPattern)) {
            client.ws.send(JSON.stringify({ error: 'Invalid channel' }));
            return;
        }
        client.subscriptions.add(channelPattern);
        client.ws.send(JSON.stringify({
            type: 'subscribed',
            channel: channelPattern,
            timestamp: new Date().toISOString()
        }));
    }
    function handleUnsubscribe(client, channel) {
        client.subscriptions.delete(channel);
        client.ws.send(JSON.stringify({
            type: 'unsubscribed',
            channel,
            timestamp: new Date().toISOString()
        }));
    }
    // Broadcast function for server-side events
    function broadcast(channel, data) {
        const message = JSON.stringify({
            type: 'broadcast',
            channel,
            data,
            timestamp: new Date().toISOString()
        });
        clients.forEach(client => {
            if (client.subscriptions.has(channel) && client.ws.readyState === ws_1.WebSocket.OPEN) {
                client.ws.send(message);
            }
        });
    }
    return { broadcast };
}
exports.setupWebSocket = setupWebSocket;
//# sourceMappingURL=realtime.js.map