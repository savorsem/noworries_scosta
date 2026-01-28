/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenerativeAI,
  Part,
  ChatSession
} from '@google/generative-ai';
import { GenerateVideoParams, GenerationMode, VeoModel, AspectRatio, Resolution, StudioSettings } from '../types';

const getActiveKey = () => import.meta.env.VITE_GEMINI_API_KEY || '';

const getGenAI = () => new GoogleGenerativeAI(getActiveKey());

export const testApiConnection = async (): Promise<boolean> => {
    try {
        const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('ping');
        return !!result.response.text();
    } catch (e) {
        console.error("API Diagnostic Failed", e);
        return false;
    }
};

export const getEnhancedSuggestions = async (currentPrompt: string, contextInfo: string): Promise<string[]> => {
    try {
        const model = getGenAI().getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: { responseMimeType: "application/json" } 
        });
        
        const prompt = `Ты — эксперт по промптам для видео-ИИ. 
            Твоя задача: на основе идеи пользователя и контекста предложить 3 УЛУЧШЕННЫХ варианта промпта на РУССКОМ языке.
            
            КОНТЕКСТ: ${contextInfo}
            ИДЕЯ: "${currentPrompt}"
            
            Варианты должны быть разными:
            1. Визуально-атмосферный.
            2. Динамично-кинематографичный.
            3. Сюжетно-детальный.
            
            Верни JSON массив из 3 строк.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const suggestions = JSON.parse(text || "[]");
        return Array.isArray(suggestions) ? suggestions : [text];
    } catch (e) {
        console.error("Failed to get suggestions", e);
        return [currentPrompt];
    }
};

export const enhancePrompt = async (currentPrompt: string): Promise<string> => {
    try {
        const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(`Ты — профессиональный промпт-инженер для генерации видео AI. 
        Твоя задача: взять короткую идею пользователя и превратить её в детальный, богатый кинематографический промпт на РУССКОМ языке.
        Идея пользователя: "${currentPrompt}"
        Верни ТОЛЬКО улучшенный текст промпта.`);
        return result.response.text() || currentPrompt;
    } catch (e) {
        return currentPrompt;
    }
};

export const analyzeImage = async (base64: string, mimeType: string): Promise<string> => {
    try {
        const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
        const imagePart = { inlineData: { data: base64, mimeType } };
        const result = await model.generateContent([
            imagePart, 
            "Опиши это изображение детально для создания видео-промпта. Опиши субъект, действие, стиль, освещение и атмосферу. Отвечай на русском языке одним сплошным текстом."
        ]);
        return result.response.text() || "";
    } catch (e) { return ""; }
};

export const analyzeVideoFrame = async (base64: string, mimeType: string): Promise<string> => {
    try {
        const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-pro' });
        const imagePart = { inlineData: { data: base64, mimeType } };
        const result = await model.generateContent([
            imagePart,
            "Проанализируй этот кадр. Опиши окружение, освещение, угол камеры и действие. Верни детальный промпт на английском языке."
        ]);
        return result.response.text() || "";
    } catch (e) { return ""; }
};

export const replaceCharacterInFrame = async (frameBase64: string, frameMime: string, charBase64: string, charMime: string): Promise<string> => {
    // Note: Standard Gemini API does not natively support direct image editing/replacement yet.
    // This is a placeholder that returns the original frame to prevent crash.
    console.warn("Character replacement not fully supported in standard API yet.");
    return frameBase64;
};

export const createDirectorSession = (settings?: StudioSettings, useThinking: boolean = false): ChatSession => {
    const model = getGenAI().getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        systemInstruction: `Вы — СТЭНЛИ, ведущий ИИ-режиссер автономной киностудии. В вашем распоряжении экспертная группа:
    1. МАРКУС (Продюсер) - логистика, активы.
    2. ХЛОЯ (Сценарист) - нарратив, стиль.
    3. ТЕКС (Оператор) - свет, камера.
    
    Эмулируйте обсуждение. Выносите вердикт.
    Если решение принято — создать видео, выведите ровно: :::JSON {"action": "generate_frame", "prompt": "DETAIL_PROMPT"} :::`
    });

    return model.startChat({
        history: []
    });
};

export const generateImage = async (prompt: string): Promise<string> => {
    // Placeholder: Return a dummy image or text-to-image if available via other API
    // Since Imagen is not in this SDK, we return a 1x1 pixel or mock
    console.warn("Image generation not supported in this environment");
    return ""; // Empty string triggers error handling in UI
};

export const editImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    return base64; // Passthrough
};

export const generateCharacterReplacement = async (params: GenerateVideoParams, statusCallback?: (status: string) => void): Promise<{url: string; blob: Blob}> => {
    statusCallback?.("Функция в разработке...");
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ 
                url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", 
                blob: new Blob([]) 
            });
        }, 2000);
    });
};

export const generateVideo = async (params: GenerateVideoParams): Promise<{url: string; blob: Blob}> => {
  // Mock video generation for build success
  console.log("Generating video for:", params.prompt);
  
  return new Promise((resolve) => {
      setTimeout(async () => {
          // Return a sample video URL for demonstration
          const sampleUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
          try {
            const res = await fetch(sampleUrl);
            const blob = await res.blob();
            resolve({ url: sampleUrl, blob });
          } catch (e) {
            resolve({ url: sampleUrl, blob: new Blob([]) });
          }
      }, 3000);
  });
};
