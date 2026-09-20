import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads the session from request cookies and respects RLS as the signed-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — session refresh happens
            // in middleware instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}

/**
 * Service-role client that bypasses Row Level Security. Server-only, and only
 * for operations that must act outside a user's own RLS scope (permanently
 * deleting an account, seeding the shared exercise library). Never import
 * this from a Client Component or expose the key to the browser.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
