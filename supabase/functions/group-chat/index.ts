import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Participant = { id: string; name: string; email?: string; persona?: string };
type Msg = { speakerId: string; speakerName: string; content: string };

const MAX_PARTICIPANTS = 8;
const MAX_HISTORY = 100;
const MAX_TEXT = 2000;

function sanitizeStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { participants, history, userMessage, topic } = body as {
      participants?: unknown; history?: unknown; userMessage?: unknown; topic?: unknown;
    };

    if (!Array.isArray(participants) || participants.length === 0 || participants.length > MAX_PARTICIPANTS) {
      return new Response(JSON.stringify({ error: `participants must be 1-${MAX_PARTICIPANTS}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(history) || history.length > MAX_HISTORY) {
      return new Response(JSON.stringify({ error: `history must be an array up to ${MAX_HISTORY}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userMsg = sanitizeStr(userMessage, MAX_TEXT);
    if (!userMsg) {
      return new Response(JSON.stringify({ error: "userMessage required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanParticipants: Participant[] = participants.map((p: any) => ({
      id: sanitizeStr(p?.id, 100),
      name: sanitizeStr(p?.name, 200),
      email: p?.email ? sanitizeStr(p.email, 255) : undefined,
      persona: p?.persona ? sanitizeStr(p.persona, 500) : undefined,
    })).filter((p) => p.id && p.name);

    const cleanHistory: Msg[] = (history as any[]).map((m) => ({
      speakerId: sanitizeStr(m?.speakerId, 100),
      speakerName: sanitizeStr(m?.speakerName, 200),
      content: sanitizeStr(m?.content, MAX_TEXT),
    }));

    const cleanTopic = typeof topic === "string" ? sanitizeStr(topic, 500) : undefined;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const roster = cleanParticipants
      .map((p) => `- ${p.name}${p.persona ? ` (persona: ${p.persona})` : ""}${p.email ? ` <${p.email}>` : ""}`)
      .join("\n");

    const transcript = cleanHistory
      .slice(-20)
      .map((m) => `${m.speakerName}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are orchestrating a group roundtable discussion hosted by ShubanAI (created by Shuban Patnaik). 

Participants at the table:
${roster}
${cleanTopic ? `\nTopic: ${cleanTopic}` : ""}

Your job: when the user (the host) speaks, generate authentic, in-character replies from 2 to ${Math.min(cleanParticipants.length, 4)} of the participants who would most naturally respond. Each participant should sound distinct — match their persona, expertise, tone, and speaking style. Keep each reply concise (1-3 sentences). Participants may react to each other, agree, disagree, or build on prior turns.

Respond by calling the "group_replies" tool with an array of replies.`;

    const tool = {
      type: "function",
      function: {
        name: "group_replies",
        description: "Return replies from selected participants.",
        parameters: {
          type: "object",
          properties: {
            replies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  participantId: { type: "string", description: "id of the participant speaking" },
                  message: { type: "string" },
                },
                required: ["participantId", "message"],
                additionalProperties: false,
              },
            },
          },
          required: ["replies"],
          additionalProperties: false,
        },
      },
    };

    const userBlock = `Conversation so far:\n${transcript || "(empty)"}\n\nHost just said: ${userMsg}\n\nGenerate the next round of in-character replies.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userBlock },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "group_replies" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let replies: { participantId: string; message: string }[] = [];
    if (call?.function?.arguments) {
      try {
        replies = JSON.parse(call.function.arguments).replies || [];
      } catch (e) {
        console.error("parse error", e);
      }
    }

    return new Response(JSON.stringify({ replies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("group-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
