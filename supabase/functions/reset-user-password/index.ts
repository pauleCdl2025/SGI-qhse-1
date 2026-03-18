import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://qhsecdl.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_ROLES = ["superadmin"];

function jsonResponse(
  body: { success: boolean; message: string; details?: unknown },
  status: number
) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        { success: false, message: "Authorization header (Bearer token) required." },
        401
      );
    }

    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(
        {
          success: false,
          message:
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in function environment variables.",
        },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("reset-user-password: getUser failed", {
        authError,
        hasUser: !!user,
        tokenPrefix: token.slice(0, 12),
        tokenLength: token.length,
      });
      return jsonResponse(
        {
          success: false,
          message: "Invalid or expired token.",
          details: authError ?? null,
        },
        401
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse(
        { success: false, message: "Failed to load requester profile.", details: profileError.message },
        500
      );
    }

    if (!profile) {
      return jsonResponse(
        { success: false, message: "Requester profile not found." },
        403
      );
    }

    const role = (profile?.role as string) ?? "";
    if (!ADMIN_ROLES.includes(role)) {
      return jsonResponse({ success: false, message: "Only administrators can reset user passwords." }, 403);
    }

    let body: { userId?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, message: "Invalid JSON body." }, 400);
    }

    const { userId, newPassword } = body;
    if (!userId || typeof newPassword !== "string") {
      return jsonResponse({ success: false, message: "userId and newPassword are required." }, 400);
    }

    if (newPassword.length < 6) {
      return jsonResponse({ success: false, message: "Password must be at least 6 characters." }, 400);
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });

    if (error) {
      console.error("Error updating user password:", error.message);
      return jsonResponse({ success: false, message: error.message }, 400);
    }

    return jsonResponse({ success: true, message: "Password reset successfully." }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("reset-user-password error:", message);
    return jsonResponse({ success: false, message }, 500);
  }
});