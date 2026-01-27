
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FeedPost, CameoProfile } from '../types';
import { supabase } from '../services/supabaseClient';

// Helper to upload a file (Blob or File) to Supabase Storage
const uploadFile = async (bucket: string, path: string, file: Blob): Promise<string | null> => {
    try {
        const { data, error } = await supabase.storage
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

// Helper to convert Base64 string to Blob
const base64ToBlob = async (base64Data: string): Promise<Blob> => {
    try {
        const response = await fetch(base64Data);
        return await response.blob();
    } catch (e) {
        console.error("Base64 to Blob conversion failed", e);
        return new Blob([]);
    }
};

export const savePost = async (post: FeedPost, videoBlob?: Blob) => {
    try {
        const postData = { ...post };

        // 1. Upload Video if a new blob is provided
        if (videoBlob) {
            const fileName = `${post.id}.mp4`;
            const publicUrl = await uploadFile('videos', fileName, videoBlob);
            if (publicUrl) {
                postData.videoUrl = publicUrl;
            }
        } else if (postData.videoUrl && postData.videoUrl.startsWith('blob:')) {
            try {
                const res = await fetch(postData.videoUrl);
                const blob = await res.blob();
                const fileName = `${post.id}.mp4`;
                const publicUrl = await uploadFile('videos', fileName, blob);
                if (publicUrl) postData.videoUrl = publicUrl;
            } catch (e) {
                console.error("Failed to recover blob from URL", e);
            }
        }

        // 2. Save metadata to DB
        // We strip undefined values to avoid issues with some DB drivers, though Supabase JS handles it mostly fine.
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
        console.log("Post saved to Supabase:", postData.id);

    } catch (e: any) {
        console.error('Error saving post to Supabase:', e.message || e);
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

export const deletePost = async (id: string) => {
    try {
        await supabase.storage.from('videos').remove([`${id}.mp4`]);
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.error('Error deleting post:', e);
    }
};

// Profile Functions

export const saveProfile = async (profile: CameoProfile) => {
    try {
        let finalImageUrl = profile.imageUrl;

        if (profile.imageUrl && profile.imageUrl.startsWith('data:')) {
            const blob = await base64ToBlob(profile.imageUrl);
            const match = profile.imageUrl.match(/^data:image\/(\w+);base64,/);
            const ext = match ? match[1] : 'png';
            const fileName = `${profile.id}.${ext}`;
            
            const publicUrl = await uploadFile('images', fileName, blob);
            if (publicUrl) {
                finalImageUrl = publicUrl;
            }
        }

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: profile.id,
                name: profile.name,
                "imageUrl": finalImageUrl,
                "group": profile.group
            });

        if (error) throw error;
    } catch (e) {
        console.error('Error saving profile:', e);
    }
};

export const getUserProfiles = async (): Promise<CameoProfile[]> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as CameoProfile[]) || [];
    } catch (e) {
        console.error('Error fetching profiles:', e);
        return [];
    }
};

export const deleteProfile = async (id: string) => {
    try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
    } catch (e) {
        console.error('Error deleting profile:', e);
    }
};
