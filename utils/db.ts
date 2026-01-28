/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { FeedPost, CameoProfile, AgentMessage, StoryboardFrame, GlobalSettings } from '../types';
import { supabase } from '../services/supabaseClient';
import { fetchBlob } from './http';

// Supabase table names
const TABLES = {
  POSTS: 'posts',
  PROFILES: 'profiles',
  AGENT_MESSAGES: 'agent_messages',
  SETTINGS: 'settings',
};

// Helper function for localStorage
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Failed to get from localStorage', e);
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to set to localStorage', e);
    }
  },
};

// Helper to convert Base64 string to Blob
export const base64ToBlob = async (base64Data: string): Promise<Blob> => {
  try {
    return await fetchBlob(base64Data);
  } catch (e) {
    console.error('Base64 to Blob conversion failed', e);
    return new Blob([]);
  }
};

// Upload file to Supabase Storage
export const uploadFile = async (bucket: string, path: string, file: Blob): Promise<string | null> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('File upload failed', e);
    return null;
  }
};

// Save post to Supabase
export const savePost = async (post: FeedPost): Promise<boolean> => {
  try {
    const postData = { ...post };

    // Upload Video if it's a Blob
    if (postData.videoUrl && postData.videoUrl.includes('base64,')) {
      const base64 = postData.videoUrl.split('base64,')[1];
      if (base64) {
        const videoBlob = await base64ToBlob(`data:video/mp4;base64,${base64}`);
        const fileName = `${post.id}.mp4`;
        const publicUrl = await uploadFile('videos', fileName, videoBlob);
        if (publicUrl) {
          postData.videoUrl = publicUrl;
        }
      }
    } else if (postData.videoUrl && postData.videoUrl.startsWith('blob:')) {
      try {
        const blob = await fetchBlob(postData.videoUrl);
        const fileName = `${post.id}.mp4`;
        const publicUrl = await uploadFile('videos', fileName, blob);
        if (publicUrl) postData.videoUrl = publicUrl;
      } catch (e) {
        console.error('Failed to recover blob from URL', e);
      }
    }

    // Upload image if base64
    if (postData.imageUrl && postData.imageUrl.includes('base64,')) {
      const base64 = postData.imageUrl.split('base64,')[1];
      if (base64) {
        const imageBlob = await base64ToBlob(`data:image/png;base64,${base64}`);
        const fileName = `${post.id}.png`;
        const publicUrl = await uploadFile('images', fileName, imageBlob);
        if (publicUrl) {
          postData.imageUrl = publicUrl;
        }
      }
    }

    const { error } = await supabase.from(TABLES.POSTS).upsert(postData);
    if (error) throw error;

    return true;
  } catch (e) {
    console.error('Post save failed', e);
    return false;
  }
};

// Load posts from Supabase
export const loadPosts = async (): Promise<FeedPost[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.POSTS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (e) {
    console.error('Failed to load posts', e);
    return [];
  }
};

// Save profile to Supabase
export const saveProfile = async (profile: CameoProfile): Promise<boolean> => {
  try {
    const { error } = await supabase.from(TABLES.PROFILES).upsert(profile);
    if (error) throw error;

    return true;
  } catch (e) {
    console.error('Profile save failed', e);
    return false;
  }
};

// Load profiles from Supabase
export const loadProfiles = async (): Promise<CameoProfile[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (e) {
    console.error('Failed to load profiles', e);
    return [];
  }
};

// Delete profile from Supabase
export const deleteProfile = async (profileId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from(TABLES.PROFILES).delete().eq('id', profileId);
    if (error) throw error;

    return true;
  } catch (e) {
    console.error('Profile delete failed', e);
    return false;
  }
};

// Save agent message to Supabase
export const saveAgentMessage = async (message: AgentMessage): Promise<boolean> => {
  try {
    const { error } = await supabase.from(TABLES.AGENT_MESSAGES).insert(message);
    if (error) throw error;

    return true;
  } catch (e) {
    console.error('Agent message save failed', e);
    return false;
  }
};

// Load agent messages from Supabase
export const loadAgentMessages = async (): Promise<AgentMessage[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.AGENT_MESSAGES)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (e) {
    console.error('Failed to load agent messages', e);
    return [];
  }
};

// Load global settings
export const loadSettings = async (): Promise<GlobalSettings | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('*')
      .single();

    if (error) throw error;

    return data as GlobalSettings;
  } catch (e) {
    console.error('Failed to load settings', e);
    return null;
  }
};

// Save global settings
export const saveSettings = async (settings: GlobalSettings): Promise<boolean> => {
  try {
    const { error } = await supabase.from(TABLES.SETTINGS).upsert(settings);
    if (error) throw error;

    return true;
  } catch (e) {
    console.error('Failed to save settings', e);
    return false;
  }
};

// Log an event to local storage for system health
export const logEvent = (event: string, data?: any) => {
  const logs = storage.get<any[]>('system_logs', []);
  logs.push({
    timestamp: new Date().toISOString(),
    event,
    data,
  });
  storage.set('system_logs', logs);
};

// Get system health based on logs
export const getSystemHealth = (): { status: 'healthy' | 'degraded' | 'down'; message: string } => {
  const logs = storage.get<any[]>('system_logs', []);
  const recentErrors = logs.filter(l => l.event === 'error').slice(-5);

  if (recentErrors.length === 0) {
    return { status: 'healthy', message: 'All systems operational' };
  }

  if (recentErrors.length < 3) {
    return { status: 'degraded', message: 'Some errors detected' };
  }

  return { status: 'down', message: 'Multiple errors detected' };
};

// Save storyboard frame
export const saveStoryboardFrame = async (frame: StoryboardFrame): Promise<boolean> => {
  try {
    let imageUrl = frame.imageUrl;
    let videoUrl = frame.videoUrl;

    // Upload image if base64
    if (imageUrl && imageUrl.includes('base64,')) {
      const base64 = imageUrl.split('base64,')[1];
      if (base64) {
        const imageBlob = await base64ToBlob(`data:image/png;base64,${base64}`);
        const fileName = `sb_img_${frame.id}.png`;
        const url = await uploadFile('images', fileName, imageBlob);
        if (url) imageUrl = url;
      }
    }

    // Upload Video if blob url
    if (videoUrl && videoUrl.startsWith('blob:')) {
      try {
        const blob = await fetchBlob(videoUrl);
        const fileName = `sb_vid_${frame.id}.mp4`;
        const url = await uploadFile('videos', fileName, blob);
        if (url) videoUrl = url;
      } catch (e) {
        console.error('Failed to upload frame video blob', e);
      }
    }

    const updatedFrame: StoryboardFrame = {
      ...frame,
      imageUrl,
      videoUrl,
    };

    const { error } = await supabase.from(TABLES.POSTS).upsert(updatedFrame);
    if (error) throw error;

    return true;
  } catch (e) {
    console.error('Storyboard frame save failed', e);
    return false;
  }
};
