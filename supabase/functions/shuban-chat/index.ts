import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MODES = ["conversation", "deep-thinking", "research", "study", "shuban"] as const;
type Mode = typeof ALLOWED_MODES[number];

const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 8000;

const MODE_PROMPTS: Record<Mode, string> = {
  conversation: `You are ShubanAI, an intelligent and friendly conversational assistant created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. Be helpful, warm, and concise. Use markdown when appropriate.`,
  "deep-thinking": `You are ShubanAI in Deep Thinking mode, created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. Analyze problems thoroughly and step-by-step. Break down complex topics, consider multiple perspectives, and provide well-reasoned conclusions. Use markdown for structure. Think deeply before answering.`,
  research: `You are ShubanAI in Research mode, created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. Provide comprehensive, well-structured research on topics. Include key findings, different viewpoints, and organize information with headings, bullet points, and summaries. Cite reasoning and be thorough. Use markdown extensively.`,
  study: `You are ShubanAI in Study mode, created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. Act as a patient tutor. Explain concepts clearly with examples, analogies, and step-by-step breakdowns. Ask follow-up questions to check understanding. Use markdown for structure. Make learning engaging and accessible.`,
  shuban: `You are ShubanAI in Shuban Mode, created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. In this special mode, you roleplay as any famous person the user requests — celebrities, scientists, historical figures, athletes, artists, world leaders, fictional characters, etc. When the user names a person, fully embody that person's personality, speaking style, knowledge, mannerisms, and perspective. Stay in character throughout the conversation. If the user hasn't specified who they want to talk to yet, warmly ask them: "Who would you like to chat with today? Name any celebrity, scientist, historical figure, or anyone famous and I'll become them for you!" Use markdown when appropriate. Be entertaining, authentic, and educational while staying in character.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication ---
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

    // --- Input validation ---
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { messages, mode } = body as { messages?: unknown; mode?: unknown };

    const safeMode: Mode = ALLOWED_MODES.includes(mode as Mode) ? (mode as Mode) : "conversation";

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: `messages must be an array of 1-${MAX_MESSAGES}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cleanMessages: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") {
        return new Response(JSON.stringify({ error: "Invalid message entry" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const role = (m as any).role;
      const content = (m as any).content;
      if (role !== "user" && role !== "assistant") {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof content !== "string" || content.length > MAX_CONTENT_LEN) {
        return new Response(JSON.stringify({ error: `content must be a string up to ${MAX_CONTENT_LEN} chars` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      cleanMessages.push({ role, content });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = MODE_PROMPTS[safeMode];

    const modelConfig: Record<Mode, { model: string; reasoning?: object }> = {
      conversation: { model: "google/gemini-3-flash-preview" },
      "deep-thinking": { model: "google/gemini-2.5-pro", reasoning: { effort: "high" } },
      research: { model: "google/gemini-2.5-pro" },
      study: { model: "google/gemini-3-flash-preview" },
      shuban: { model: "google/gemini-2.5-pro" },
    };

    const config = modelConfig[safeMode];

    const aiBody: Record<string, unknown> = {
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanMessages,
      ],
      stream: true,
    };

    if (config.reasoning) {
      aiBody.reasoning = config.reasoning;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
