// Edge Function: save-manual-scores
// Admin-only: saves per-item 0–5 scores for listening, written advanced, and speaking.

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

const LISTENING_IDS = ["L1", "L2", "L3", "L5", "L6", "L7", "L10"];
const SPEAKING_IDS = ["S1", "S2", "S3", "S4", "S5"];
const WRITTEN_ADVANCED_IDS = ["AW_slc", "AW_reefer", "AW_airbags"];

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}

function sanitizeScores(raw: unknown, allowedIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const id of allowedIds) {
    const v = (raw as Record<string, unknown>)[id];
    if (v === undefined || v === null || v === "") continue;
    out[id] = clampScore(Number(v));
  }
  return out;
}

function sectionTotal(scores: Record<string, number>, ids: string[]) {
  let total = 0;
  let scored = 0;
  for (const id of ids) {
    if (scores[id] !== undefined) {
      total += scores[id];
      scored++;
    }
  }
  return { total, max: ids.length * 5, scored, items: ids.length };
}

function bandFromTotal(total: number, max: number): string {
  if (max <= 0 || total === 0 && Object.keys({}).length === 0) return "Pending review";
  const pct = total / max;
  if (pct >= 0.875) return "Strong";
  if (pct >= 0.625) return "Adequate";
  return "Lacking";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { password, result_id, manual_scores } = await req.json();
    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Wrong password" }), { status: 401, headers: corsHeaders });
    }
    if (!result_id) {
      return new Response(JSON.stringify({ error: "Missing result_id" }), { status: 400, headers: corsHeaders });
    }

    const { data: row, error: fetchErr } = await supabase
      .from("assessment_results")
      .select("tier_scores")
      .eq("id", result_id)
      .single();

    if (fetchErr || !row) {
      return new Response(JSON.stringify({ error: "Result not found" }), { status: 404, headers: corsHeaders });
    }

    const tierScores = { ...(row.tier_scores as Record<string, unknown>) };
    const incoming = manual_scores || {};

    const listeningScores = sanitizeScores(incoming.listening, LISTENING_IDS);
    const speakingScores = sanitizeScores(incoming.speaking, SPEAKING_IDS);
    const writtenScores = sanitizeScores(incoming.written_advanced, WRITTEN_ADVANCED_IDS);

    const listenSum = sectionTotal(listeningScores, LISTENING_IDS);
    const speakSum = sectionTotal(speakingScores, SPEAKING_IDS);
    const writtenSum = sectionTotal(writtenScores, WRITTEN_ADVANCED_IDS);

    // Keep timed-out markers set by submit-assessment when rewriting a section's scores
    const carryFlags = (prev: any, next: Record<string, unknown>) => {
      if (prev?.timed_out) next.timed_out = true;
      if (prev?.timed_out_items) next.timed_out_items = prev.timed_out_items;
      return next;
    };

    tierScores.listening = carryFlags(tierScores.listening, {
      manual: true,
      scores: listeningScores,
      total: listenSum.total,
      max: listenSum.max,
      scored: listenSum.scored,
      band: listenSum.scored > 0 ? bandFromTotal(listenSum.total, listenSum.max) : "Pending review",
    });
    tierScores.speaking = carryFlags(tierScores.speaking, {
      manual: true,
      scores: speakingScores,
      total: speakSum.total,
      max: speakSum.max,
      scored: speakSum.scored,
      band: speakSum.scored > 0 ? bandFromTotal(speakSum.total, speakSum.max) : "Pending review",
    });
    tierScores.written_advanced = carryFlags(tierScores.written_advanced, {
      manual: true,
      scores: writtenScores,
      total: writtenSum.total,
      max: writtenSum.max,
      scored: writtenSum.scored,
      band: writtenSum.scored > 0 ? bandFromTotal(writtenSum.total, writtenSum.max) : "Pending review",
    });

    const { error: updateErr } = await supabase
      .from("assessment_results")
      .update({ tier_scores: tierScores })
      .eq("id", result_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, tier_scores: tierScores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
