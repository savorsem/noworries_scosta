/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
  Chat,
  Type
} from '@google/genai';
import {GenerateVideoParams, GenerationMode, Resolution, AspectRatio, StudioSettings, VeoModel} from '../types';

const getActiveKey = () => import.meta.env.VITE_GEMINI_API_KEY || '';

export const testApiConnection = async (): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({apiKey: getActiveKey()});
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'ping',
            config: { maxOutputTokens: 1 }
        });
        return !!response.text;
    } catch (e) {
        console.error("Диагностика API не удалась", e);
        return false;
    }
};

export const getEnhancedSuggestions = async (currentPrompt: string, contextInfo: string): Promise<string[]> => {
    const ai = new GoogleGenAI({apiKey: getActiveKey()});
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            contents: `Ты — эксперт по промптам для видео-ИИ (Veo 3.1). 
            Твоя задача: на основе идеи пользователя и контекста предложить 3 УЛУЧШЕННЫХ варианта промпта на РУССКОМ языке.
            
            КОНТЕКСТ: ${contextInfo}
            ИДЕЯ: "${currentPrompt}"
            
            Варианты должны быть разными:
            1. Визуально-атмосферный (фокус на свете и текстурах).
            2. Динамично-кинематографичный (фокус на движении камеры).
            3. Сюжетно-детальный (фокус на действии).
            
            Верни массив из 3 строк. Каждая строка — готовый промпт.`,
        });
        const suggestions = JSON.parse(response.text || "[]");
        return Array.isArray(suggestions) ? suggestions : [response.text];
    } catch (e) {
        console.error("Failed to get suggestions", e);
        return [currentPrompt];
    }
};

export const enhancePrompt = async (currentPrompt: string): Promise<string> => {
    const ai = new GoogleGenAI({apiKey: getActiveKey()});
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Ты — профессиональный промпт-инженер для генерации видео AI (Veo/Sora). 
        Твоя задача: взять короткую идею пользователя и превратить её в детальный, богатый кинематографический промпт на РУССКОМ языке.
        Идея пользователя: "${currentPrompt}"
        Верни ТОЛЬКО улучшенный текст промпта без кавычек и лишних слов.`,
    });
    return response.text || currentPrompt;
};

export const analyzeImage = async (base64: string, mimeType: string): Promise<string> => {
    const ai = new GoogleGenAI({apiKey: getActiveKey()});
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64 } },
                { text: "Опиши это изображение детально для создания видео-промпта. Опиши субъект, действие, стиль, освещение и атмосферу. Отвечай на русском языке одним сплошным текстом." }
            ]
        }
    });
    return response.text || "";
};

export const analyzeVideoFrame = async (base64: string, mimeType: string): Promise<string> => {
    const ai = new GoogleGenAI({apiKey: getActiveKey()});
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64 } },
                { text: "Проанализируй этот кадр из видео. Опиши окружение, освещение, угол камеры и действие максимально подробно для генерации видео. ИГНОРИРУЙ внешность человека, опиши только его позу и действия (например, 'человек бежит', 'человек сидит'). Верни детальный промпт на английском языке." }
            ]
        }
    });
    return response.text || "";
};

export const replaceCharacterInFrame = async (frameBase64: string, frameMime: string, charBase64: string, charMime: string): Promise<string> => {
    const ai = new GoogleGenAI({apiKey: getActiveKey()});
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: frameMime, data: frameBase64 } },
                { inlineData: { mimeType: charMime, data: charBase64 } },
                { text: "Replace the person in the first image with the character from the second image. Keep the exact same pose, background, lighting, and composition. Output only the image." }
            ]
        }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData?.data || "";
};

export const createDirectorSession = (settings?: StudioSettings, useThinking: boolean = false): Chat => {
    const ai = new GoogleGenAI({apiKey: getActiveKey()});
    const model = 'gemini-3-pro-preview';
    
    const instruction = `Вы — СТЭНЛИ, ведущий ИИ-режиссер автономной киностудии. В вашем распоряжении экспертная группа:
    1. МАРКУС (Продюсер) - логистика, активы, соответствие бюджету.
    2. ХЛОЯ (Сценарист) - нарратив, глубокий стиль, драматургия.
    3. ТЕКС (Оператор) - свет (Cinematic, Anamorphic), движение камеры, оптика.
    
    ВАШ РАБОЧИЙ ПРОЦЕСС:
    - Когда пользователь дает задачу, вы должны ЭМУЛИРОВАТЬ ОБСУЖДЕНИЕ. 
    - Мнение Хлои: как это усилит историю.
    - Мнение Текса: как это снять технически.
    - Мнение Маркуса: подтверждение активов.
    - Затем вы (Стэнли) выносите ФИНАЛЬНЫЙ ВЕРДИКТ.
    
    ТЕХНИЧЕСКИЕ КОМАНДЫ:
    - Если решение принято — создать видео, выведите ровно: :::JSON {"action": "generate_frame", "prompt": "DETAIL_PROMPT"} :::
    - DETAIL_PROMPT должен быть на английском, максимально детальным (lighting, camera, subject action).
    
    ОТВЕТЫ:
    - Всегда на РУССКОМ языке (кроме JSON).
    - Стиль: профессиональный, кинематографичный, лаконичный.
    - Будьте умнее: если пользователь прислал фото и видео, предложите Character Replacement для "оживления" персонажа в этой сцене.`;

    const config: any = {
        systemInstruction: instruction,
        temperature: 0.9,
    };

    if (useThinking) config.thinkingConfig = { thinkingBudget: 32768 };

    return ai.chats.create({ model, config });
};

export const generateImage = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({apiKey: getActiveKey()});
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Cinematic frame, high resolution master: ${prompt}`,
            config: { numberOfImages: 1, aspectRatio: '16:9', outputMimeType: 'image/jpeg' }
        });
        return response.generatedImages?.[0]?.image?.imageBytes || '';
    } catch (e) {
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Cinematic frame master: ${prompt}` }] }
        });
        return res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || '';
    }
};

export const editImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({apiKey: getActiveKey()});
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ inlineData: { mimeType, data: base64 } }, { text: `Edit this image based on: ${prompt}. Maintain composition and character silhouette exactly.` }]
        }
    });
    return response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || '';
};

export const generateCharacterReplacement = async (params: GenerateVideoParams, statusCallback?: (status: string) => void): Promise<{url: string; blob: Blob}> => {
    if (!params.startFrame || !params.referenceImages?.[0]) {
        throw new Error("Missing video frame or character reference");
    }
    if (!params.startFrame.base64 || !params.referenceImages[0].base64) {
        throw new Error("Invalid image data for character replacement");
    }
    statusCallback?.("Анализ сцены...");
    const scenePrompt = await analyzeVideoFrame(params.startFrame.base64, params.startFrame.file.type);
    statusCallback?.("Вклейка персонажа...");
    const editedFrameBase64 = await replaceCharacterInFrame(
        params.startFrame.base64, 
        params.startFrame.file.type, 
        params.referenceImages[0].base64, 
        params.referenceImages[0].file.type
    );
    if (!editedFrameBase64) throw new Error("Не удалось заменить персонажа на фото");
    statusCallback?.("Рендеринг...");
    const veoParams: GenerateVideoParams = {
        ...params,
        prompt: scenePrompt,
        startFrame: { file: new File([], 'edited.png', { type: 'image/png' }), base64: editedFrameBase64 },
        referenceImages: params.referenceImages
    };
    return generateVideo(veoParams);
};

export const generateVideo = async (params: GenerateVideoParams): Promise<{url: string; blob: Blob}> => {
  const ai = new GoogleGenAI({apiKey: getActiveKey()});
  const runGeneration = async (model: VeoModel) => {
      const payload: any = {
          model,
          prompt: params.prompt,
          config: {
              numberOfVideos: 1,
              aspectRatio: params.aspectRatio,
              resolution: params.resolution,
          }
      };
      const references: VideoGenerationReferenceImage[] = [];
      if (params.referenceImages) {
          params.referenceImages.forEach(img => {
              references.push({ 
                  image: { imageBytes: img.base64, mimeType: img.file.type }, 
                  referenceType: VideoGenerationReferenceType.ASSET 
              });
          });
      }
      if (params.startFrame) {
          if (references.length > 0 && params.mode !== GenerationMode.CHARACTER_REPLACEMENT) {
             references.push({ 
                  image: { imageBytes: params.startFrame.base64, mimeType: params.startFrame.file.type }, 
                  referenceType: VideoGenerationReferenceType.ASSET 
              });
          } else {
              payload.image = { imageBytes: params.startFrame.base64, mimeType: params.startFrame.file.type };
          }
      }
      if (references.length > 0) payload.config.referenceImages = references;
      let op = await ai.models.generateVideos(payload);
      while (!op.done) {
          await new Promise(r => setTimeout(r, 10000));
          op = await ai.operations.getVideosOperation({operation: op});
      }
      return op;
  };
  const modelChain = [params.model, VeoModel.VEO_FAST];
  const uniqueChain = Array.from(new Set(modelChain));
  let lastError = null;
  for (const attemptModel of uniqueChain) {
      try {
          const op = await runGeneration(attemptModel as VeoModel);
          if (op.response?.generatedVideos?.[0]) {
              const videoUri = op.response.generatedVideos[0].video.uri;
              const res = await fetch(`${videoUri}&key=${getActiveKey()}`);
              const blob = await res.blob();
              return { url: URL.createObjectURL(blob), blob };
          }
      } catch (e: any) {
          console.warn(`Модель ${attemptModel} не сработала...`, e);
          lastError = e;
      }
  }
  throw lastError || new Error("Ошибка конвейера.");
};
