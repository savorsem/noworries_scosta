/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FeedPost, CameoProfile, AgentMessage, StoryboardFrame, GlobalSettings } from '../types';
import { supabase } from '../services/supabaseClient';
import { healer } from '../services/healerService';

const uploadFile = async (bucket: string, path: string, file: Blob): Promise<string | null> => {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.warn(`Storage upload warning for ${path}:`, error.message);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return publicUrl;
    } catch (e) {
        console.error(`Upload failed for ${path}:`, e);
        return null;
    }
};

export const base64ToBlob = async (base64Data: string): Promise<Blob> => {
    try {
        const response = await fetch(base64Data);
        return await response.blob();
    } catch (e) {
        console.error("Base64 to Blob conversion failed", e);
        return new Blob([]);
    }
};

export const syncUserSettings = async (settings: GlobalSettings) => {
    try {
        let userId = localStorage.getItem('user_uuid');
        if (!userId) {
            userId = crypto.randomUUID();
            localStorage.setItem('user_uuid', userId);
        }

        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                settings: settings,
                updated_at: new Date().toISOString()
            });
            
        if (error) console.warn("Cloud sync warning (settings):", error.message);
    } catch (e) {
        console.warn("Cloud sync failed (settings)", e);
    }
};

export const savePost = async (post: FeedPost, videoBlob?: Blob) => {
    try {
        const postData = { ...post };
        if (videoBlob) {
            const fileName = `${post.id}.mp4`;
            const publicUrl = await uploadFile('videos', fileName, videoBlob);
            if (publicUrl) {
                postData.videoUrl = publicUrl;
            } else {
                console.error("Failed to upload video, saving post without URL");
                postData.status = 'error'; // Use string literal or enum if available
                postData.errorMessage = "Video upload failed";
            }
        }
        const { error } = await supabase
            .from('posts')
            .upsert({
                id: postData.id,
                username: postData.username,
                "avatarUrl": postData.avatarUrl,
                description: postData.description,
                "modelTag": postData.modelTag,
                status: postData.status,
                "videoUrl": postData.videoUrl,
                "errorMessage": postData.errorMessage,
                "referenceImageBase64": postData.referenceImageBase64,
                filters: postData.filters,
                "aspectRatio": postData.aspectRatio,
                resolution: postData.resolution,
                "originalParams": postData.originalParams,
            });
        if (error) throw error;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('Error saving post:', message);
    }
};

export const getAllPosts = async (): Promise<FeedPost[]> => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data as FeedPost[]) || [];
    } catch (e) {
        console.error('Error fetching posts:', e);
        return [];
    }
};

export const saveProfile = async (profile: CameoProfile) => {
    try {
        let finalImageUrl = profile.imageUrl;
        if (profile.imageUrl && profile.imageUrl.startsWith('data:')) {
            const blob = await base64ToBlob(profile.imageUrl);
            const match = profile.imageUrl.match(/^data:image\/(\w+);base64,/);
            const ext = match ? match[1] : 'png';
            const fileName = `${profile.id}.${ext}`;
            const publicUrl = await uploadFile('images', fileName, blob);
            if (publicUrl) finalImageUrl = publicUrl;
        }
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: profile.id,
                name: profile.name,
                "imageUrl": finalImageUrl,
                "group": profile.group
            });
        if (error) console.warn("Cloud sync failed for profile", error.message);
    } catch (e) {
        console.warn('Error saving profile:', e);
    }
};

export const getUserProfiles = async (): Promise<CameoProfile[]> => {
    try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data as CameoProfile[]) || [];
    } catch (e) {
        return [];
    }
};

export const deleteProfile = async (id: string) => {
    try {
        await supabase.from('profiles').delete().eq('id', id);
    } catch (e) { console.error(e); }
};

export const saveChatMessage = async (message: AgentMessage) => {
    try {
        await supabase.from('chat_history').insert({
            id: message.id,
            role: message.role,
            text: message.text,
            timestamp: new Date(message.timestamp).toISOString(),
            is_action: message.isAction || false
        });
    } catch (e) {}
};

export const getChatHistory = async (): Promise<AgentMessage[]> => {
    try {
        const { data } = await supabase.from('chat_history').select('*').order('timestamp', { ascending: true });
        return (data || []).map(row => ({
            id: row.id, role: row.role, text: row.text, timestamp: new Date(row.timestamp).getTime(), isAction: row.is_action
        }));
    } catch (e) { return []; }
};

export const saveStoryboardFrame = async (frame: StoryboardFrame) => {
    try {
        let imageUrl = frame.imageUrl;
        let videoUrl = frame.videoUrl;
        if (imageUrl && imageUrl.startsWith('data:')) {
            const blob = await base64ToBlob(imageUrl);
            const url = await uploadFile('images', `sb_img_${frame.id}.jpg`, blob);
            if (url) imageUrl = url;
        }
        if (videoUrl && videoUrl.startsWith('blob:')) {
            const res = await fetch(videoUrl);
            const blob = await res.blob();
            const url = await uploadFile('videos', `sb_vid_${frame.id}.mp4`, blob);
            if (url) videoUrl = url;
        }
        await supabase.from('storyboard_frames').upsert({
            id: frame.id, prompt: frame.prompt, image_url: imageUrl, video_url: videoUrl, status: frame.status
        });
    } catch (e) {}
};

export const getStoryboardFrames = async (): Promise<StoryboardFrame[]> => {
    try {
        const { data } = await supabase.from('storyboard_frames').select('*').order('created_at', { ascending: true });
        return (data || []).map(row => ({
            id: row.id, prompt: row.prompt, imageUrl: row.image_url, videoUrl: row.video_url, status: row.status
        }));
    } catch (e) { return []; }
};

export const deleteStoryboardFrame = async (id: string) => {
    try {
        await supabase.from('storyboard_frames').delete().eq('id', id);
    } catch (e) {}
};

export const logEvent = async (level: 'info' | 'warn' | 'error', message: string, details?: unknown) => {
    try {
        if (level === 'error') healer.reportError(message);
        await supabase.from('app_logs').insert({ level, message, details: JSON.stringify(details), timestamp: new Date().toISOString() });
    } catch (e) {}
};
