// Edge Function: get-results
// Admin-only: returns every completed assessment with scores, missed items,
// written responses, signed audio URLs, and the re-attempt history.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
      .from("assessment_results")
      .select(`
        id, employee_id, tier_scores, missed_items, written_responses,
        overall_score, overall_total, overall_band, audio_urls, submitted_at,
        employees ( name, deleted_at )
      `)
      .order("submitted_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    // Attach each employee's attempt history.
    const empIds = [...new Set((data || []).map((r: any) => r.employee_id).filter(Boolean))];
    const attemptsByEmp: Record<string, any[]> = {};
    if (empIds.length) {
      const { data: atts } = await supabase
        .from("attempts")
        .select("employee_id, attempt_no, sections, reason, status, issued_at, completed_at")
        .in("employee_id", empIds);
      for (const a of atts || []) {
        if (!attemptsByEmp[a.employee_id]) attemptsByEmp[a.employee_id] = [];
        attemptsByEmp[a.employee_id].push(a);
      }
    }

    const results = (data || []).map((r: any) => ({
      ...r,
      attempts: attemptsByEmp[r.employee_id] || [],
    }));

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
