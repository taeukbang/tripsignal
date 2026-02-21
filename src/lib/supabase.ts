import { createClient, SupabaseClient } from "@supabase/supabase-js";

function createCachedClient(urlKey: string, keyName: string): () => SupabaseClient {
  let instance: SupabaseClient | null = null;
  return () => {
    if (instance) return instance;
    const url = process.env[urlKey];
    const key = process.env[keyName];
    if (!url || !key) throw new Error(`Missing ${urlKey} or ${keyName}`);
    instance = createClient(url, key, { auth: { persistSession: false } });
    return instance;
  };
}

export const createServiceClient = createCachedClient(
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
);

export const createAnonClient = createCachedClient(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
