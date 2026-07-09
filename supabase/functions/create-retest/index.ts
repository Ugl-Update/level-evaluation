// Edge Function: create-retest — re-issue selected sections to an existing employee.
// Rotates the token (old link dies), resets status to pending, logs an attempt.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ALL = ["intermediate", "advanced", "listening", "speaking"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { password, employee_id, result_id, sections, reason } = await req.json();
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const secs = Array.isArray(sections) ? sections.filter((s) => ALL.includes(s)) : [];
    if (!secs.length) return new Response(JSON.stringify({ error: "Pick at least one section." }), { status: 400, headers: corsHeaders });

    let empId = employee_id;
    if (!empId && result_id) {
      const { data: res } = await supabase.from("assessment_results").select("employee_id").eq("id", result_id).single();
      empId = res?.employee_id;
    }
    if (!empId) return new Response(JSON.stringify({ error: "Employee not found." }), { status: 404, headers: corsHeaders });

    const token = crypto.randomUUID();
    const { error: upErr } = await supabase.from("employees").update({ token, sections: secs, status: "pending", section_times: null }).eq("id", empId);
    if (upErr) throw upErr;

    const { data: last } = await supabase.from("attempts").select("attempt_no").eq("employee_id", empId).order("attempt_no", { ascending: false }).limit(1);
    const nextNo = ((last && last.length ? last[0].attempt_no : 1) as number) + 1;
    await supabase.from("attempts").insert({ employee_id: empId, attempt_no: nextNo, sections: secs, reason: reason || null, token, status: "pending" });

    return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
