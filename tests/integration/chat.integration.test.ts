import request from 'supertest';
import { app, server } from '../../src/server'; // Assuming server exports app and server instance
import { database } from '../../src/models/database';
import { userService } from '../../src/services/user.service';
import { openAIService } from '../../src/services/openai.service'; // To mock OpenAI calls
import { UserRole } from '../../src/models/types';
import OpenAI from 'openai';

jest.mock('../../src/services/openai.service'); // Mock the entire OpenAIService

const mockOpenAIService = openAIService as jest.Mocked<typeof openAIService>;

let testUserToken: string;
let testUserId: string;

beforeAll(async () => {
  // Wait for server to potentially initialize (if it does async setup not tied to listen)
  // await new Promise(resolve => setTimeout(resolve, 1000)); // Adjust if needed

  // 1. Create a test user
  try {
    const user = await userService.createUser({
      email: 'chat-integration@example.com',
      password: 'Password123!',
      role: UserRole.USER,
    });
    testUserId = user.id;
    
    // 2. Login to get a token
    const loginRes = await userService.loginUser({
      email: 'chat-integration@example.com',
      password: 'Password123!',
    });
    testUserToken = loginRes.token;

  } catch (error) {
    // If user already exists from a previous failed run, try to log in
    if ((error as any)?.message?.includes('already exists')) {
        console.warn("Test user already exists, attempting login for chat.integration.test");
        const loginRes = await userService.loginUser({
            email: 'chat-integration@example.com',
            password: 'Password123!',
        });
        testUserToken = loginRes.token;
        testUserId = loginRes.user.id; // Assuming loginUser returns the user object with id
    } else {
        console.error("Failed to setup user for chat integration test:", error);
        throw error;
    }
  }
});

afterAll(async () => {
  // Clean up: delete the test user
  if (testUserId) {
    // await userService.deleteUser(testUserId, 'system-cleanup-test'); // Assuming an admin/system context for deletion
  }
  await database.close(); // Close DB connection
  if (server && server.listening) {
    server.close(); // Close the HTTP server
  }
});

describe('POST /api/v1/chat/completions - Chat Integration Tests', () => {
  
  beforeEach(() => {
    // Reset mocks for each test
    mockOpenAIService.createSafeChatCompletion = jest.fn();
    mockOpenAIService.createSafeStreamingCompletion = jest.fn();
  });

  it('should return a safe chat completion for valid input', async () => {
    const mockCompletion = {
      id: 'chatcmpl-mockId',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4-test',
      choices: [{ index: 0, message: { role: 'assistant', content: 'This is a safe response.' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      safety_metadata: { /* ... mock safety data ... */ }
    };
    (mockOpenAIService.createSafeChatCompletion as jest.Mock).mockResolvedValue(mockCompletion);

    const response = await request(app)
      .post('/api/v1/chat/completions')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        model: 'gpt-4-test',
        messages: [{ role: 'user', content: 'Tell me a safe joke.' }],
        safety_mode: 'balanced',
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('chatcmpl-mockId');
    expect(response.body.choices[0].message.content).toBe('This is a safe response.');
    expect(mockOpenAIService.createSafeChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'Tell me a safe joke.' }],
      }),
      testUserId 
    );
  });

  it('should reject unsafe input in strict mode if service throws AppError', async () => {
    (mockOpenAIService.createSafeChatCompletion as jest.Mock).mockRejectedValue(
      new AppError(400, 'Input failed safety check (strict mode).', { violations: [{ type: 'harmful_content' }] })
    );

    const response = await request(app)
      .post('/api/v1/chat/completions')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        model: 'gpt-4-test',
        messages: [{ role: 'user', content: 'This is very unsafe input.' }],
        safety_mode: 'strict',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Input failed safety check (strict mode).');
    expect(response.body.details).toBeDefined();
  });
  
  it('should handle streaming requests correctly', async () => {
    // Mock the streaming service behavior
    (mockOpenAIService.createSafeStreamingCompletion as jest.Mock).mockImplementation(
      async (params, onChunk, onComplete, onError, actorId) => {
        // Simulate a few chunks
        onChunk({ id: 'chunk1', choices: [{ delta: { content: 'Hello ' } }] }, true, []);
        await new Promise(r => setTimeout(r, 10)); // Simulate delay
        onChunk({ id: 'chunk2', choices: [{ delta: { content: 'World!' } }] }, true, []);
        await new Promise(r => setTimeout(r, 10));
        onComplete('Hello World!', { safe: true, violations: [], score: 1.0, metadata: {} });
      }
    );
  
    const response = await request(app)
      .post('/api/v1/chat/completions')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        model: 'gpt-4-test',
        messages: [{ role: 'user', content: 'Stream a greeting.' }],
        stream: true,
      })
      .buffer() // Allow supertest to buffer the streaming response
      .parse((res, callback) => { // Custom parser for event-stream
          let body = '';
          res.on('data', (chunk) => { body += chunk.toString(); });
          res.on('end', () => { callback(null, body); });
      });
  
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/event-stream/);
    
    const responseBody = response.body as unknown as string; // Cast because of custom parser
    
    // Check for streamed data parts
    expect(responseBody).toContain('data: {"id":"chunk1","choices":[{"delta":{"content":"Hello "}}],"safety_status":{"is_safe":true,"violations_detected":0}}\n\n');
    expect(responseBody).toContain('data: {"id":"chunk2","choices":[{"delta":{"content":"World!"}}],"safety_status":{"is_safe":true,"violations_detected":0}}\n\n');
    // Check for the final 'done' event
    expect(responseBody).toContain('data: {"event":"done","final_safety_analysis":{"safe":true,"violations":[],"score":1,"metadata":{}}}\n\n');
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app)
      .post('/api/v1/chat/completions')
      .send({
        model: 'gpt-4-test',
        messages: [{ role: 'user', content: 'No token test.' }],
      });
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Authentication required');
  });

  it('should return 400 for invalid request body (e.g. missing messages)', async () => {
    const response = await request(app)
      .post('/api/v1/chat/completions')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        model: 'gpt-4-test',
        // messages: is missing
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

}); 