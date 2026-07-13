// Edge Function: start-section
// Server-side timer anchor for one timed block. The FIRST call for a block stamps its start
// time into employees.section_times; later calls (e.g. after a refresh) return how much of
// the block has already elapsed so the client can fast-forward past expired questions.
// With { done: true } it stamps the block's end instead, so submit-assessment can verify
// each block stayed within budget.
// NOTE: in the Supabase dashboard the import below is "./_shared/questions.ts".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TIMED_BLOCKS, blockBudget, blockSlices, type TimedBlock } from "../_shared/questions.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, section, done } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: corsHeaders });
    if (!TIMED_BLOCKS.includes(section))
      return new Response(JSON.stringify({ error: "Unknown section" }), { status: 400, headers: corsHeaders });
    const block = section as TimedBlock;

    const { data: employee, error } = await supabase
      .from("employees").select("id, status, section_times, deleted_at").eq("token", token).single();
    if (error || !employee)
      return new Response(JSON.stringify({ error: "This link isn't valid. Check with your manager." }), { status: 404, headers: corsHeaders });
    if (employee.deleted_at)
      return new Response(JSON.stringify({ error: "This test link is no longer active. Check with your manager." }), { status: 403, headers: corsHeaders });
    if (employee.status === "completed")
      return new Response(JSON.stringify({ error: "This test has already been submitted." }), { status: 403, headers: corsHeaders });

    const times: Record<string, string> = { ...(employee.section_times || {}) };
    const key = done ? `${block}_done` : block;
    if (!times[key]) {
      times[key] = new Date().toISOString();
      const { error: upErr } = await supabase.from("employees").update({ section_times: times }).eq("id", employee.id);
      if (upErr) throw upErr;
    }

    if (done) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(times[block]).getTime()) / 1000));
    return new Response(JSON.stringify({
      section: block,
      startedAt: times[block],
      elapsedSeconds,
      budgetSeconds: blockBudget(block),
      slices: blockSlices(block),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
