// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  draft:
    "You are an expert email writer. Write clear, well-structured emails based on the user's instructions. Output only the email body text — no subject line, no markdown headers. Use appropriate greetings and sign-offs. Keep it concise and natural.",
  refine:
    "You are an expert email editor. The user will provide an existing email draft and instructions for how to refine it. Apply the requested changes while preserving the overall structure and intent. Output only the refined email body.",
  "subject-lines":
    "You are an expert at writing email subject lines. Given an email body or context, generate exactly 5 compelling subject line options. Output them as a numbered list (1. ... 2. ... etc). Each should be concise (under 60 chars), attention-grabbing, and relevant.",
  "grammar-check":
    "You are a professional writing coach and editor. Analyze the provided email comprehensively for: **Grammar & Spelling** (errors, typos), **Clarity & Structure** (sentence restructuring, jargon simplification), **Tone & Professionalism** (politeness enhancement, consistent tone), **Voice** (passive to active voice suggestions), **Readability** (complex word alternatives). Provide specific suggestions with before/after examples. Be constructive and actionable.",
  reply:
    "You are an expert email writer. The user will share an email they received and optionally some context about how they want to reply. Write a thoughtful, well-structured reply. Output only the reply email body with appropriate greeting and sign-off.",
  "tone-analysis":
    "You are a tone analysis expert. Analyze the provided email text and output exactly 4 numbers (0-100) on the first 4 lines, then a short label on the 5th line:\nLine 1: Formality score (0=very casual, 100=very formal)\nLine 2: Friendliness score (0=cold/distant, 100=very warm)\nLine 3: Confidence score (0=tentative/uncertain, 100=very assertive)\nLine 4: Urgency score (0=relaxed, 100=very urgent)\nLine 5: A 2-3 word overall tone label (e.g. 'Professional & Warm', 'Casual & Friendly')\nOutput ONLY these 5 lines, nothing else.",
  summarize:
    "You are an expert email summarizer. Read the provided email and produce a concise TL;DR summary in 2-3 sentences. Focus on the key message, any requests, and the overall intent. Output only the summary, no headers.",
  "extract-actions":
    "You are an expert at extracting action items from emails. Read the provided email and list all tasks, deadlines, decisions, or requests. Output a numbered list of action items. If there are none, say 'No action items found.' Be specific and concise.",
  "quick-replies":
    "You are an expert at generating quick email reply options. Read the provided email and generate exactly 3 short, one-sentence reply options. Each should take a different approach (e.g., accept, decline, ask for more info). Output them as a numbered list (1. ... 2. ... 3. ...). Each reply should be complete and ready to send as a brief response.",
  "cold-optimize":
    "You are a cold email optimization expert. Analyze the provided cold outreach email and provide specific improvements for higher response probability. Score the current email (1-10) and provide: **Subject Line** suggestions, **Opening Hook** improvements, **Value Proposition** clarity, **Call-to-Action** effectiveness, **Overall Length** assessment. Provide a rewritten optimized version at the end.",
  "email-to-task":
    "You are an expert at converting emails into structured tasks. Read the provided email and extract all actionable items as a structured checklist. For each task include: a clear task title, priority (high/medium/low), and deadline if mentioned. Output as a numbered list with format: '[Priority] Task description (Deadline: date if mentioned)'. If no tasks found, say 'No actionable tasks found.'",
  negotiation:
    "You are an expert negotiation email writer. The user will provide context about a negotiation (salary, vendor pricing, contract terms, etc). Write a professional, persuasive email that: presents the position clearly with supporting rationale, uses collaborative language, proposes specific terms, maintains professionalism, and includes a clear next step. Output only the email body.",
  "compliance-check":
    "You are a corporate communications compliance expert. Analyze the provided email for: **Professionalism** (inappropriate language, slang), **Bias & Inclusivity** (gender bias, cultural insensitivity, ageism), **Toxicity** (aggressive or passive-aggressive language), **Corporate Etiquette** (proper greetings, appropriate sign-offs, formal structure), **Confidentiality** (potential data leaks, sensitive references). Rate each category (Pass/Warning/Fail) and provide specific suggestions. Be thorough but concise.",
  categorize:
    "You are an email categorization expert. Analyze the provided email and output exactly 2 lines:\nLine 1: Category (one of: urgent, action-required, fyi, social, newsletter, spam)\nLine 2: Priority (one of: high, medium, low)\nOutput ONLY these 2 lines, nothing else.",
  "ab-draft":
    "You are an expert email writer. The user will provide an existing email draft. Write a completely different alternative version of the same email with a different approach, structure, and phrasing while keeping the same intent and key information. Output only the alternative email body.",
  chat:
    "You are MailCraft AI, a helpful email writing assistant. Help users brainstorm email ideas, improve their writing, suggest approaches for difficult conversations, and answer questions about email etiquette and best practices. Be concise, friendly, and actionable. Use markdown formatting for clarity when helpful.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    let payload: { messages?: { role: string; content: string }[]; mode?: string };
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, mode = "draft" } = payload;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.draft;
    const primaryModel = "gemini-2.5-flash";
    const defaultFallbackModels = [
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-2.5-pro",
      "gemini-3-pro-preview",
      "gemini-3.1-pro-preview",
    ];
    const extraFallbackModels = (Deno.env.get("GEMINI_MODEL_FALLBACKS_EXTRA") || "")
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean);
    const modelCandidates = [
      primaryModel,
      ...defaultFallbackModels,
      ...extraFallbackModels,
    ].filter((model, index, all) => all.indexOf(model) === index);
    const maxOutputTokensByMode: Record<string, number> = {
      draft: 1400,
      reply: 1400,
      refine: 1400,
      "subject-lines": 180,
      summarize: 220,
      "quick-replies": 180,
      categorize: 60,
      "tone-analysis": 120,
      "extract-actions": 320,
      "email-to-task": 360,
      "grammar-check": 720,
      "compliance-check": 760,
      "cold-optimize": 760,
      negotiation: 1400,
      "ab-draft": 1400,
      chat: 1200,
    };
    const maxOutputTokens = maxOutputTokensByMode[mode] ?? 520;

    const geminiContents = messages
      .filter((message) => typeof message?.content === "string" && message.content.trim().length > 0)
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

    const retryableStatuses = new Set([402, 404, 408, 409, 429, 500, 502, 503, 504]);
    let response: Response | null = null;
    let selectedModel = "";
    let lastStatus = 500;
    let lastErrorText = "";

    for (const modelName of modelCandidates) {
      const modelResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: geminiContents,
            generationConfig: {
              temperature: 0.5,
              topP: 0.9,
              maxOutputTokens,
            },
          }),
        }
      );

      if (modelResponse.ok) {
        response = modelResponse;
        selectedModel = modelName;
        break;
      }

      lastStatus = modelResponse.status;
      lastErrorText = await modelResponse.text();
      console.warn(`Gemini model failed: ${modelName} (${lastStatus})`, lastErrorText);

      const shouldTryNext = retryableStatuses.has(lastStatus);
      if (!shouldTryNext) {
        break;
      }
    }

    if (!response) {
      if (lastStatus === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded across fallback models" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (lastStatus === 402) {
        return new Response(
          JSON.stringify({ error: "Payment or quota issue across fallback models" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Gemini API error", detail: lastErrorText || "All fallback models failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.body) {
      return new Response(
        JSON.stringify({ error: "Empty Gemini stream response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const geminiReader = response.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = "";
        let emittedText = "";

        try {
          while (true) {
            const { done, value } = await geminiReader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line.startsWith("data:")) continue;

              const dataText = line.slice(5).trim();
              if (!dataText || dataText === "[DONE]") continue;

              let parsed: any;
              try {
                parsed = JSON.parse(dataText);
              } catch {
                continue;
              }

              const chunkText = (parsed?.candidates?.[0]?.content?.parts ?? [])
                .map((part: { text?: string }) => part?.text ?? "")
                .join("");

              if (!chunkText) continue;

              let delta = chunkText;
              if (chunkText.startsWith(emittedText)) {
                delta = chunkText.slice(emittedText.length);
                emittedText = chunkText;
              } else {
                emittedText += chunkText;
              }

              if (!delta) continue;

              const payload = `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;
              controller.enqueue(encoder.encode(payload));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        } finally {
          geminiReader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-AI-Model": selectedModel,
      },
    });
  } catch (e) {
    console.error("draft-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
