import { ChatRequestSchema } from '../models/schemas';
import { z } from 'zod';
export declare class OpenAIService {
    private openai;
    constructor();
    createSafeChatCompletion(params: z.infer<typeof ChatRequestSchema>, actorId?: string): Promise<any>;
    createSafeStreamingCompletion(params: z.infer<typeof ChatRequestSchema>, onChunk: (chunk: any, isSafe: boolean, violations?: any[]) => void, // Callback with safety status
    onComplete: (fullResponseText: string, finalSafety: any) => void, onError: (error: Error) => void, actorId?: string): Promise<void>;
}
export declare const openAIService: OpenAIService;
//# sourceMappingURL=openai.service.d.ts.map