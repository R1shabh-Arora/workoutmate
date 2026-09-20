import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database.types";
import type { User } from "@supabase/supabase-js";

/**
 * Refreshes the Supabase session cookie on every matched request and returns
 * the (possibly redirected) response plus the current user, if any.
 * This must run in middleware — Server Components cannot write cookies.
 */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Always use getUser() (not getSession()) here — it revalidates the token
  // against Supabase Auth rather than trusting a possibly-stale cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
