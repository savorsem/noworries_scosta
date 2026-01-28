
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { createClient } from '@supabase/supabase-js';

// Helper to get env vars with hardcoded fallbacks provided by user
const getEnvVar = (key: string, viteKey: string, fallback: string) => {
    // Check process.env
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    // Check import.meta.env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
        // @ts-ignore
        return import.meta.env[viteKey];
    }
    return fallback;
};

// Configuration with provided credentials
// NOTE: We use the ANON key (Public), not the Service Role key, for security.
const supabaseUrl = getEnvVar(
    'SUPABASE_URL', 
    'VITE_SUPABASE_URL', 
    ''
);

const supabaseKey = getEnvVar(
    'SUPABASE_KEY', 
    'VITE_SUPABASE_KEY', 
    ''
);

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing! Check .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
