import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Simple logger fallback
const logger = {
  info: (...args: any[]) => console.info('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

interface WSClient {
  id: string;
  ws: WebSocket;
  userId: string;
  subscriptions: Set<string>;
}

export function setupWebSocket(wss: WebSocketServer) {
  const clients = new Map<string, WSClient>();

  wss.on('connection', (ws, req) => {
    const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'Missing authentication token');
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const clientId = `${decoded.id}_${Date.now()}`;
      
      const client: WSClient = {
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
        } catch (error) {
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
    } catch (error) {
      logger.error('WebSocket authentication failed', error);
      ws.close(1008, 'Invalid authentication token');
    }
  });

  function handleMessage(client: WSClient, message: any) {
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

  function handleSubscribe(client: WSClient, channelPattern: string) {
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

  function handleUnsubscribe(client: WSClient, channel: string) {
    client.subscriptions.delete(channel);
    client.ws.send(JSON.stringify({
      type: 'unsubscribed',
      channel,
      timestamp: new Date().toISOString()
    }));
  }

  // Broadcast function for server-side events
  function broadcast(channel: string, data: any) {
    const message = JSON.stringify({
      type: 'broadcast',
      channel,
      data,
      timestamp: new Date().toISOString()
    });
    clients.forEach(client => {
      if (client.subscriptions.has(channel) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  return { broadcast };
} 