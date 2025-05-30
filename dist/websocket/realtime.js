"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const monitoring_service_1 = require("../services/monitoring.service"); // Import to listen to its events
const types_1 = require("../models/types");
const rust_bridge_1 = require("../safety/rust_bridge"); // Import RustBridge
// Define allowed channels and their required roles
const channelPermissions = {
    'monitoring:alerts': [types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER], // Critical alerts
    'monitoring:metrics': [types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER], // General metrics stream (if implemented)
    'experiment:updates': [types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER], // General experiment updates
    // Specific experiment updates like 'experiment_updates:<experiment_id>' can be handled dynamically
    'safety:violations': [types_1.UserRole.ADMIN, types_1.UserRole.RESEARCHER], // Stream of safety violations
};
function setupWebSocket(wss) {
    const clients = new Map();
    const rustBridge = new rust_bridge_1.RustBridge(); // Instantiate RustBridge
    wss.on('connection', (ws, req) => {
        const remoteAddress = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown_ip';
        const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
        if (!token) {
            logger_1.logger.warn('WebSocket connection attempt without token', { ip: remoteAddress });
            ws.close(1008, 'Missing authentication token');
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            const clientId = `${decoded.id}_${Date.now()}`;
            const client = {
                id: clientId,
                ws,
                userId: decoded.id,
                userRole: decoded.role,
                subscriptions: new Set(),
                ip: remoteAddress,
            };
            clients.set(clientId, client);
            logger_1.logger.info('WebSocket client connected', { clientId, userId: decoded.id, role: decoded.role, ip: remoteAddress });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    handleWebSocketMessage(client, message);
                }
                catch (error) {
                    logger_1.logger.error('Invalid WebSocket message format', { clientId, error });
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
                }
            });
            ws.on('close', (code, reason) => {
                clients.delete(clientId);
                logger_1.logger.info('WebSocket client disconnected', { clientId, userId: client.userId, code, reason: reason.toString() });
            });
            ws.on('error', (error) => {
                logger_1.logger.error('WebSocket error', { clientId, userId: client.userId, error });
            });
            ws.send(JSON.stringify({
                type: 'welcome',
                message: 'Successfully connected to OpenAI Safe WebSocket.',
                clientId,
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            logger_1.logger.error('WebSocket authentication failed', { ip: remoteAddress, error: error.message });
            ws.close(1008, 'Invalid or expired authentication token');
        }
    });
    function handleWebSocketMessage(client, message) {
        logger_1.logger.debug('Received WebSocket message', { clientId: client.id, type: message.type });
        switch (message.type) {
            case 'subscribe':
                handleSubscribe(client, message.channel, message.params);
                break;
            case 'unsubscribe':
                handleUnsubscribe(client, message.channel);
                break;
            case 'ping':
                client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
            case 'request_interpretability':
                handleRequestInterpretability(client, message.text_to_analyze, message.model_id);
                break;
            default:
                client.ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${message.type}` }));
        }
    }
    function handleSubscribe(client, channelPattern, params) {
        const baseChannel = channelPattern.split(':')[0];
        const effectiveChannelKey = channelPermissions[channelPattern] ? channelPattern : (channelPermissions[baseChannel + ':*'] ? `${baseChannel}:*` : baseChannel);
        if (!effectiveChannelKey || !channelPermissions[effectiveChannelKey].includes(client.userRole)) {
            client.ws.send(JSON.stringify({ type: 'error', channel: channelPattern, message: 'Insufficient permissions for this channel' }));
            return;
        }
        client.subscriptions.add(channelPattern);
        client.ws.send(JSON.stringify({
            type: 'subscribed',
            channel: channelPattern,
            timestamp: new Date().toISOString()
        }));
        logger_1.logger.info(`Client ${client.id} subscribed to ${channelPattern}`);
    }
    function handleUnsubscribe(client, channel) {
        client.subscriptions.delete(channel);
        client.ws.send(JSON.stringify({
            type: 'unsubscribed',
            channel,
            timestamp: new Date().toISOString()
        }));
        logger_1.logger.info(`Client ${client.id} unsubscribed from ${channel}`);
    }
    function handleRequestInterpretability(client, textToAnalyze, modelId) {
        if (!client.subscriptions.has('interpretability:stream')) {
            client.ws.send(JSON.stringify({ type: 'error', message: 'Must be subscribed to interpretability:stream channel.' }));
            return;
        }
        logger_1.logger.info(`Interpretability requested by ${client.userId} for text: "${textToAnalyze.substring(0, 30)}..."`);
        try {
            const interpretabilityResult = rustBridge.analyzeInterpretability(textToAnalyze);
            client.ws.send(JSON.stringify({
                type: 'interpretability_data',
                text: textToAnalyze,
                modelId: modelId || 'default_rust_model',
                data: interpretabilityResult,
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to get interpretability data via RustBridge', { userId: client.userId, error });
            client.ws.send(JSON.stringify({ type: 'error', message: 'Failed to process interpretability request.' }));
        }
    }
    function broadcast(channel, data, targetUserId) {
        const message = JSON.stringify({
            type: 'broadcast',
            channel,
            payload: data,
            timestamp: new Date().toISOString()
        });
        let sentCount = 0;
        clients.forEach(client => {
            const baseChannel = channel.split(':')[0];
            const subscribedToChannel = client.subscriptions.has(channel) || client.subscriptions.has(`${baseChannel}:*`) || client.subscriptions.has(baseChannel);
            if (subscribedToChannel && client.ws.readyState === ws_1.WebSocket.OPEN) {
                if (targetUserId && client.userId !== targetUserId) {
                    return;
                }
                client.ws.send(message);
                sentCount++;
            }
        });
        if (sentCount > 0)
            logger_1.logger.debug(`Broadcasted to ${channel} for ${sentCount} clients.`);
    }
    monitoring_service_1.monitoringService.on('safety.violation', (data) => {
        broadcast('safety:violations', data);
    });
    monitoring_service_1.monitoringService.on('critical_safety_violation', (data) => {
        broadcast('monitoring:alerts', { type: 'critical_safety_violation', ...data });
    });
    monitoring_service_1.monitoringService.on('experiment.status.change', (data) => {
        broadcast('experiment:updates', data);
    });
    monitoring_service_1.monitoringService.on('system.startup', (data) => {
        broadcast('system:notifications', { type: 'system_startup', ...data });
    });
    logger_1.logger.info('WebSocket server initialized and event listeners configured.');
    return { broadcast, clients, rustBridge };
}
exports.setupWebSocket = setupWebSocket;
//# sourceMappingURL=realtime.js.map