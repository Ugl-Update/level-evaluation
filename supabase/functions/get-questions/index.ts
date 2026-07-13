// Edge Function: get-questions
// Validates the token and returns ONLY the sections assigned to it (employee.sections; null = all).
// NOTE: in the Supabase dashboard the import below is "./_shared/questions.ts" (each function has
// its own copy). In this repo the shared bank lives at functions/_shared/questions.ts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publicQuestions, publicListening, publicSpeaking, WRITTEN_PROMPTS, TIMED_BLOCKS, blockSlices, blockBudget } from "../_shared/questions.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ALL_SECTIONS = ["intermediate", "advanced", "listening", "speaking"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: corsHeaders });

    const { data: employee, error } = await supabase
      .from("employees").select("id, name, status, sections, section_times, deleted_at").eq("token", token).single();

    if (error || !employee)
      return new Response(JSON.stringify({ error: "This link isn't valid. Check with your manager." }), { status: 404, headers: corsHeaders });
    if (employee.deleted_at)
      return new Response(JSON.stringify({ error: "This test link is no longer active. Check with your manager." }), { status: 403, headers: corsHeaders });
    if (employee.status === "completed")
      return new Response(JSON.stringify({ error: "This test has already been submitted." }), { status: 403, headers: corsHeaders });

    const sections = (employee.sections && employee.sections.length) ? employee.sections : ALL_SECTIONS;
    const tiers: Record<string, unknown> = {};
    if (sections.includes("intermediate")) tiers.intermediate = publicQuestions("intermediate");
    if (sections.includes("advanced")) tiers.advanced = { ...publicQuestions("advanced"), written: WRITTEN_PROMPTS.advanced };

    const payload: Record<string, unknown> = { name: employee.name, sections, tiers };
    if (sections.includes("listening")) payload.listening = publicListening();
    if (sections.includes("speaking")) payload.speaking = publicSpeaking();

    // Per-question timing config + any timer anchors already stamped (used to resume after a refresh).
    const blocks: Record<string, unknown> = {};
    for (const b of TIMED_BLOCKS) blocks[b] = { slices: blockSlices(b), budget: blockBudget(b) };
    payload.timing = { blocks, sectionTimes: employee.section_times || {} };

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
