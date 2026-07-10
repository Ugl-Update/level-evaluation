// Edge Function: list-employees
// Admin-only: returns all employees with status, so the admin panel can show
// who's pending vs completed and re-display their links.
// Deploy with: supabase functions deploy list-employees
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { password } = await req.json();
    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Wrong password" }), { status: 401, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("employees")
      .select("name, token, status, created_at, completed_at, section_times")
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ employees: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
