import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only ever redirect to a same-origin, app-internal path — never follow an
// open `next` param to an external host.
function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const isFirstSignIn = data.user.created_at === data.user.last_sign_in_at;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", data.user.id)
    .single();

  if (isFirstSignIn) {
    await supabase.from("analytics_events").insert({
      profile_id: data.user.id,
      event_name: "signup_completed",
      properties: { provider: "google" },
    });
  }

  if (!profile?.onboarding_completed_at) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next ?? "/dashboard"}`);
}
