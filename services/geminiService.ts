/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  GoogleGenAI,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
  GenerateContentResponse,
  HarmCategory,
  HarmBlockThreshold,
  SafetySetting,
} from '@google/genai';
import { VeoModel, GenerationMode, SystemHealth } from '../types';
import { logEvent } from '../utils/db';
import { fetchBlob } from '../utils/http';

// Model configuration
const MODEL_CONFIG = {
  [VeoModel.VEO_2]: {
    model: 'veo-2.0-generate-001',
    description: 'Standard Veo 2 model',
  },
  [VeoModel.VEO_2_PLUS]: {
    model: 'veo-2.0-generate-002',
    description: 'Enhanced Veo 2 model for higher quality',
  },
  [VeoModel.VEO_3]: {
    model: 'veo-3.0-generate-001',
    description: 'Premium Veo 3 model for best quality',
  },
};

// Default safety settings
const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// API keys management
let apiKeys: string[] = [];
let activeKeyIndex = 0;

export const setApiKeys = (keys: string[]) => {
  apiKeys = keys.filter(k => k.trim());
  activeKeyIndex = 0;
};

export const getActiveKey = () => {
  return apiKeys[activeKeyIndex] || import.meta.env.VITE_GEMINI_API_KEY as string;
};

export const rotateApiKey = () => {
  if (apiKeys.length > 1) {
    activeKeyIndex = (activeKeyIndex + 1) % apiKeys.length;
    console.log(`Rotated to API key #${activeKeyIndex + 1}`);
  }
};

// Initialize Gemini AI client
const getGeminiClient = () => {
  const apiKey = getActiveKey();
  if (!apiKey) {
    throw new Error('No API key available');
  }
  return new GoogleGenAI({ apiKey });
};

// Generate a preview image based on prompt
export const generatePreviewImage = async (prompt: string): Promise<string | null> => {
  try {
    const genAI = getGeminiClient();
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ role: 'user', parts: [{ text: `Generate a detailed image prompt for: ${prompt}` }] }],
    });

    const textResponse = response.text;
    return textResponse || null;
  } catch (e) {
    console.error('Preview image generation failed', e);
    logEvent('error', { type: 'preview_image', error: String(e) });
    return null;
  }
};

// Main video generation function
export const generateVideo = async (
  prompt: string,
  mode: GenerationMode,
  model: VeoModel,
  referenceImages?: { file: File; base64: string }[],
  useChain = false,
): Promise<{ url: string; blob?: Blob; systemHealth?: SystemHealth }> => {
  let lastError: any = null;

  const uniqueChain = useChain
    ? [VeoModel.VEO_2, VeoModel.VEO_2_PLUS, VeoModel.VEO_3].filter(m => m !== model)
    : [];

  const modelChain = useChain ? [model, ...uniqueChain] : [model];

  // ... (rest of file unchanged)

  for (const model of modelChain) {
    try {
      const op = await runGeneration(model as VeoModel);
      if (op.response?.generatedVideos?.[0]) {
        const videoUri = op.response.generatedVideos[0].video.uri;
        const blob = await fetchBlob(`${videoUri}&key=${getActiveKey()}`);
        return { url: URL.createObjectURL(blob), blob };
      }
    } catch (e: any) {
      console.warn(`Модель ${model} не сработала, пробуем следующую...`, e);
      lastError = e;
      rotateApiKey();
    }
  }

  throw lastError || new Error('Video generation failed');
};
