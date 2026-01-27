
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FeedPost, CameoProfile } from '../types';

const DB_NAME = 'noworries_db';
const STORE_NAME = 'feed_store';
const PROFILES_STORE_NAME = 'profiles_store';
const DB_VERSION = 2;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('IndexedDB error: ' + (event.target as any).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROFILES_STORE_NAME)) {
        db.createObjectStore(PROFILES_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const savePost = async (post: FeedPost, videoBlob?: Blob) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // First, try to get the existing record to preserve the blob if a new one isn't provided
    const getRequest = store.get(post.id);

    getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        
        // Start with the new post data
        const record = { ...post };

        // Priority 1: A new blob is explicitly provided (e.g. fresh generation)
        if (videoBlob) {
            (record as any).videoBlob = videoBlob;
        } 
        // Priority 2: Use existing blob from DB if available
        else if (existingRecord && existingRecord.videoBlob) {
            (record as any).videoBlob = existingRecord.videoBlob;
        }

        // Logic for videoUrl:
        // If it's a 'blob:' URL, it is ephemeral and should NOT be saved to DB.
        if (record.videoUrl && record.videoUrl.startsWith('blob:')) {
            delete (record as any).videoUrl;
        }

        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject('Error saving post');
    };

    getRequest.onerror = (e) => reject('Error checking for existing post');
  });
};

export const getAllPosts = async (): Promise<FeedPost[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result;
      const posts = records.map((record: any) => {
        let videoUrl = record.videoUrl;

        // If we have a stored blob, create a fresh object URL for this session
        if (record.videoBlob) {
          videoUrl = URL.createObjectURL(record.videoBlob);
        }
        
        // Remove the heavy videoBlob from the returned object to keep the UI lightweight
        const { videoBlob, ...postData } = record;
        return { ...postData, videoUrl };
      });
      
      resolve(posts.reverse());
    };
    request.onerror = () => reject('Error getting posts');
  });
};

export const deletePost = async (id: string) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error deleting post');
    });
};

// Profile Functions

export const saveProfile = async (profile: CameoProfile) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([PROFILES_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PROFILES_STORE_NAME);
    const request = store.put(profile);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error saving profile');
  });
};

export const getUserProfiles = async (): Promise<CameoProfile[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILES_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PROFILES_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject('Error getting profiles');
  });
};

export const deleteProfile = async (id: string) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([PROFILES_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PROFILES_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error deleting profile');
    });
};
