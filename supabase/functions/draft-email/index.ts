// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const looksCutOff = (text: string) => {
  const t = text.trim();
  if (!t) return false;
  if (/(^|\n)\s*(best|thanks|regards|sincerely|warm regards)\s*,?\s*$/i.test(t)) return true;
  if (/[.!?]$/.test(t)) return false;
  if (t.length > 80) return true;
  const tokens = t.toLowerCase().split(/\s+/);
  const last = (tokens[tokens.length - 1] || "").replace(/[.,;:!?]+$/g, "");
  const danglingWords = new Set([
    "the", "a", "an", "to", "for", "with", "and", "or", "of", "in", "on", "at", "as", "by", "from",
    "that", "this", "it", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "will", "would", "can", "could", "should", "please", "attached",
  ]);
  return t.length > 40 && danglingWords.has(last);
};

const MASTER_SYSTEM_PROMPT = `You are a high-end professional email writing assistant used in a premium productivity application.

Your output must feel like it was written by an experienced human professional, not a template.

STYLE REQUIREMENTS:
- Natural human phrasing with sentence-length variation.
- Avoid generic cliches like "Hope you're doing well" or "I am writing to inform".
- Prefer clear, confident, direct language over passive wording.
- Keep smooth flow across sentences with natural connectors.
- Avoid robotic, repetitive, or interchangeable phrasing.

REALISM RULES:
- Every sentence must have intent; no filler.
- Keep wording context-aware and deliberate.
- Allow subtle warmth, never exaggerated friendliness.

STRICT CONSTRAINTS:
- Do not invent facts, names, or details.
- Do not introduce new requests unless explicitly present in user input.
- Do not ask clarifying questions unless explicitly requested.
- Use placeholders like [Name], [Company], [Date], [Your Name] when needed.

OUTPUT RULE:
- Output only final email text (no markdown, no labels, no explanations).
`;

const WRITING_MODES = new Set(["draft", "refine", "reply", "subject-lines", "ab-draft"]);

type FewShotTurn = { role: "user" | "model"; text: string };

const FEW_SHOT_EXAMPLES: Record<string, FewShotTurn[]> = {
  draft: [
    {
      role: "user",
      text: "Context: project timeline update; backend integration complete; minor edge cases under review; release on track. Tone: professional.",
    },
    {
      role: "model",
      text: "Hi [Name],\n\nFollowing up on our discussion, I consolidated the latest project timeline updates.\n\nBackend integration is complete, and initial API-layer testing is underway. A few minor edge cases are still being reviewed, but none impact the overall delivery timeline.\n\nWe remain on track for the planned release window.\n\nBest regards,\n[Your Name]",
    },
    {
      role: "user",
      text: "Bad style example to avoid: 'Hope you are doing well. I am writing to inform you... Please let me know your thoughts.'",
    },
    {
      role: "model",
      text: "Acknowledged. I will avoid generic openings, filler, and vague asks.",
    },
  ],
  refine: [
    {
      role: "user",
      text: "Refine this draft while preserving intent: 'Hi, I am writing to inform you that we completed the work and it is going well. Please let me know your thoughts.'",
    },
    {
      role: "model",
      text: "Hi [Name],\n\nThe work has been completed and is progressing as expected.\n\nBest regards,\n[Your Name]",
    },
  ],
  reply: [
    {
      role: "user",
      text: "Reply context: proposal mostly aligned; phase-two resource allocation should be reduced; proceed after that adjustment. Tone: professional.",
    },
    {
      role: "model",
      text: "Hi [Name],\n\nI reviewed the proposal and aligned it against our current priorities. The overall approach is sound, especially the phased rollout.\n\nOne adjustment is required in phase two: resource allocation should be reduced to keep scope aligned. With that update, we can proceed.\n\nRegards,\n[Your Name]",
    },
  ],
};

const getSystemPromptForMode = (mode: string) => {
  const taskPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.draft;
  if (!WRITING_MODES.has(mode)) return taskPrompt;
  return `${MASTER_SYSTEM_PROMPT}\n${taskPrompt}`;
};

const buildGeminiContents = (
  mode: string,
  messages: { role: string; content: string }[]
) => {
  const fewShot = (FEW_SHOT_EXAMPLES[mode] || []).map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const chatTurns = messages
    .filter((message) => typeof message?.content === "string" && message.content.trim().length > 0)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  return [...fewShot, ...chatTurns];
};

const SYSTEM_PROMPTS: Record<string, string> = {
  draft:
    "Write a complete professional email using only the provided context/key points as the base content.\n\nREQUIREMENTS:\n- Opening: establish purpose quickly in 1-2 lines.\n- Body: group related points logically in natural paragraphs.\n- Tone: match requested tone while sounding human.\n- Closing: calm, professional wrap-up with complete sign-off.\n\nRULES:\n- Include all important provided key points clearly.\n- Rephrase intelligently; do not copy awkwardly.\n- Do not add new asks/questions/actions not present in input.\n- Do not ask clarifying questions unless explicitly requested.",
  refine:
    "Improve the email for clarity, flow, and professionalism while preserving intent exactly.\n\nFOCUS:\n- Remove robotic wording and weak transitions.\n- Preserve personality and natural rhythm.\n- Rephrase and polish only; do not add new asks/tasks/questions/actions unless they already exist in input.\n- Do not insert clarifying questions unless explicitly requested.",
  "subject-lines":
    "Generate exactly 5 subject lines.\nRules: under 60 characters, distinct style per option, tightly aligned with content, avoid generic business cliches.\nOutput as a numbered list only.",
  "grammar-check":
    "You are a professional writing coach and editor. Analyze the provided email comprehensively for: **Grammar & Spelling** (errors, typos), **Clarity & Structure** (sentence restructuring, jargon simplification), **Tone & Professionalism** (politeness enhancement, consistent tone), **Voice** (passive to active voice suggestions), **Readability** (complex word alternatives). Provide specific suggestions with before/after examples. Be constructive and actionable.",
  reply:
    "Write a thoughtful human reply using the provided context/key points as required input.\n\nRULES:\n- Address the sender's points clearly.\n- Rephrase and structure provided information; do not add new asks/questions/actions unless explicitly present in input.\n- Sound like a deliberate human response, not a template.\n- Use placeholders if details are missing.\n- Finish with a complete professional closing.",
  "tone-analysis":
    "You are a tone analysis expert. Analyze the provided email text and output exactly 4 numbers (0-100) on the first 4 lines, then a short label on the 5th line:\nLine 1: Formality score (0=very casual, 100=very formal)\nLine 2: Friendliness score (0=cold/distant, 100=very warm)\nLine 3: Confidence score (0=tentative/uncertain, 100=very assertive)\nLine 4: Urgency score (0=relaxed, 100=very urgent)\nLine 5: A 2-3 word overall tone label (e.g. 'Professional & Warm', 'Casual & Friendly')\n\nScoring rules:\n- Use the full range when justified; do not default to 50.\n- Urgency should increase strongly for deadlines, immediate asks, escalation words, or time pressure.\n- Confidence should increase for direct commitments and decisive statements.\n- Formality should increase for business wording and structured etiquette.\n- Friendliness should increase for warm appreciation and supportive language.\n\nOutput ONLY these 5 lines, nothing else.",
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

    const systemPrompt = getSystemPromptForMode(mode);
    const primaryModel = "gemini-2.5-flash";
    const defaultFallbackModels = [
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-flash-latest",
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
      draft: 2400,
      reply: 2400,
      refine: 2400,
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

    if (mode === "tone-analysis") {
      const toneText = messages
        .map((m) => (typeof m?.content === "string" ? m.content : ""))
        .join("\n\n")
        .trim();

      if (!toneText) {
        return new Response(
          JSON.stringify({ error: "No text provided for tone analysis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fastModels = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        ...modelCandidates,
      ].filter((model, index, all) => all.indexOf(model) === index);

      let tonePayload = "";
      let toneModel = "";
      let toneStatus = 500;
      let toneErrorText = "";

      for (const modelName of fastModels) {
        const toneResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_PROMPTS["tone-analysis"] }] },
              contents: [{ role: "user", parts: [{ text: toneText }] }],
              generationConfig: {
                temperature: 0.15,
                topP: 0.8,
                maxOutputTokens: 90,
              },
            }),
          }
        );

        if (toneResp.ok) {
          const toneJson = await toneResp.json();
          tonePayload = (toneJson?.candidates?.[0]?.content?.parts ?? [])
            .map((part: { text?: string }) => part?.text ?? "")
            .join("")
            .trim();
          toneModel = modelName;
          break;
        }

        toneStatus = toneResp.status;
        toneErrorText = await toneResp.text();
      }

      if (!tonePayload) {
        return new Response(
          JSON.stringify({ error: "Tone analysis failed", detail: toneErrorText || "No response" }),
          { status: toneStatus || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const payload = `data: ${JSON.stringify({ choices: [{ delta: { content: tonePayload } }] })}\n\n`;
          controller.enqueue(encoder.encode(payload));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-AI-Model": toneModel || "tone-fast-path",
        },
      });
    }

    const geminiContents = buildGeminiContents(mode, messages);

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
              temperature: 0.65,
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

        const emitFromRawLine = (rawLine: string) => {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) return;

          const dataText = line.slice(5).trim();
          if (!dataText) return;
          if (dataText === "[DONE]") return;

          let parsed: any;
          try {
            parsed = JSON.parse(dataText);
          } catch {
            return;
          }

          const chunkText = (parsed?.candidates?.[0]?.content?.parts ?? [])
            .map((part: { text?: string }) => part?.text ?? "")
            .join("");

          if (!chunkText) return;

          let delta = chunkText;
          if (chunkText.startsWith(emittedText)) {
            delta = chunkText.slice(emittedText.length);
            emittedText = chunkText;
          } else {
            emittedText += chunkText;
          }

          if (!delta) return;

          const payload = `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        try {
          while (true) {
            const { done, value } = await geminiReader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const rawLine of lines) {
              emitFromRawLine(rawLine);
            }
          }

          if (buffer.trim().length > 0) {
            buffer
              .split("\n")
              .filter((line) => line.trim().length > 0)
              .forEach((line) => emitFromRawLine(line));
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