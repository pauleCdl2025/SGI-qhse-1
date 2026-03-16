import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_ROLES = ["superadmin"];

function jsonResponse(body: { success: boolean; message: string }, status: number) {
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
      return jsonResponse({ success: false, message: "Authorization header (Bearer token) required." }, 401);
    }

    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ success: false, message: "Invalid or expired token." }, 401);
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
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