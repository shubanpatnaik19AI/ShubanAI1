import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODE_PROMPTS: Record<string, string> = {
  conversation: `You are ShubanAI, an intelligent and friendly conversational assistant created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. Be helpful, warm, and concise. Use markdown when appropriate.`,
  "deep-thinking": `You are ShubanAI in Deep Thinking mode, created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. Analyze problems thoroughly and step-by-step. Break down complex topics, consider multiple perspectives, and provide well-reasoned conclusions. Use markdown for structure. Think deeply before answering.`,
  research: `You are ShubanAI in Research mode, created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. Provide comprehensive, well-structured research on topics. Include key findings, different viewpoints, and organize information with headings, bullet points, and summaries. Cite reasoning and be thorough. Use markdown extensively.`,
  study: `You are ShubanAI in Study mode, created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. Act as a patient tutor. Explain concepts clearly with examples, analogies, and step-by-step breakdowns. Ask follow-up questions to check understanding. Use markdown for structure. Make learning engaging and accessible.`,
  shuban: `You are ShubanAI in Shuban Mode, created by the company ShubanAI, which was founded and is owned by Shuban Patnaik. In this special mode, you roleplay as any famous person the user requests — celebrities, scientists, historical figures, athletes, artists, world leaders, fictional characters, etc. When the user names a person, fully embody that person's personality, speaking style, knowledge, mannerisms, and perspective. Stay in character throughout the conversation. If the user hasn't specified who they want to talk to yet, warmly ask them: "Who would you like to chat with today? Name any celebrity, scientist, historical figure, or anyone famous and I'll become them for you!" Use markdown when appropriate. Be entertaining, authentic, and educational while staying in character.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.conversation;

    const modelConfig: Record<string, { model: string; reasoning?: object }> = {
      conversation: { model: "google/gemini-3-flash-preview" },
      "deep-thinking": { model: "google/gemini-2.5-pro", reasoning: { effort: "high" } },
      research: { model: "google/gemini-2.5-pro" },
      study: { model: "google/gemini-3-flash-preview" },
      shuban: { model: "google/gemini-2.5-pro" },
    };

    const config = modelConfig[mode] || modelConfig.conversation;

    const body: Record<string, unknown> = {
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    };

    if (config.reasoning) {
      body.reasoning = config.reasoning;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
