import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a real Supabase client only when both env vars are present and valid.
// When not configured (local SQLite setup), we return a no-op stub so the app
// never crashes — real-time updates simply won't fire.
function createSupabaseClient(): SupabaseClient {
  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('dummyproject')) {
    return createClient(supabaseUrl, supabaseKey);
  }
  // Return a minimal stub that satisfies the call sites in page.tsx
  // without throwing at runtime.
  const noopSubscription = {
    on:        (_: any, __: any, ___: any) => noopSubscription,
    subscribe: () => noopSubscription,
  };
  return {
    channel:       () => noopSubscription,
    removeChannel: () => Promise.resolve(),
  } as unknown as SupabaseClient;
}

export const supabase = createSupabaseClient();
