// Edge Function: delete-employee
// Admin-only soft delete / restore. Deleting stamps employees.deleted_at, which
// hides the tester from admin lists and makes their link stop working.
// Restore clears the stamp and brings everything back untouched.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { password, employee_id, token, action } = await req.json();
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    if (action !== "delete" && action !== "restore")
      return new Response(JSON.stringify({ error: "action must be delete or restore" }), { status: 400, headers: corsHeaders });
    if (!employee_id && !token)
      return new Response(JSON.stringify({ error: "Missing employee_id or token" }), { status: 400, headers: corsHeaders });

    let q = supabase.from("employees")
      .update({ deleted_at: action === "delete" ? new Date().toISOString() : null });
    q = employee_id ? q.eq("id", employee_id) : q.eq("token", token);
    const { data, error } = await q.select("id, name, deleted_at");
    if (error) throw error;
    if (!data || !data.length)
      return new Response(JSON.stringify({ error: "Employee not found" }), { status: 404, headers: corsHeaders });

    return new Response(JSON.stringify({ success: true, employee: data[0] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
