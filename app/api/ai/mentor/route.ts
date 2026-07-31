import { NextRequest, NextResponse } from "next/server";
import { SENIOR_MENTOR_SYSTEM_PROMPT, buildUserPromptWithContext, MentorMode, TopicContext } from "@/lib/ai/prompt";

export const runtime = "nodejs";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      mode = "grill",
      topicContext,
      apiKey: customApiKey,
      provider = "openrouter",
      model,
    }: {
      messages: ChatMessage[];
      mode: MentorMode;
      topicContext?: TopicContext;
      apiKey?: string;
      provider?: string;
      model?: string;
    } = body;

    // Resolve API key
    const envOpenRouter = process.env.OPENROUTER_API_KEY;
    const envMentor = process.env.AI_MENTOR_API_KEY;
    const envGroq = process.env.GROQ_API_KEY;
    const envOpenAI = process.env.OPENAI_API_KEY;
    const envGemini = process.env.GEMINI_API_KEY;

    const apiKey =
      customApiKey ||
      req.headers.get("x-api-key") ||
      envOpenRouter ||
      envMentor ||
      envGroq ||
      envOpenAI ||
      envGemini;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "NO_API_KEY",
          message:
            "No API key found. Please add OPENROUTER_API_KEY to your .env.local file or configure your key in settings.",
        },
        { status: 401 }
      );
    }

    // Determine Endpoint and Target Model
    let endpoint = "https://openrouter.ai/api/v1/chat/completions";
    const defaultForMode =
      mode === "code-review"
        ? "nvidia/nemotron-3-ultra-550b-a55b:free"
        : "inclusionai/ling-3.0-flash:free";

    const ALLOWED_MODELS = [
      "inclusionai/ling-3.0-flash:free",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "deepseek/deepseek-r1:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ];

    let selectedModel =
      !model || model === "auto" || !ALLOWED_MODELS.includes(model)
        ? defaultForMode
        : (model === "deepseek/deepseek-v4-flash:free" ? "inclusionai/ling-3.0-flash:free" : model);

    // Build complete message chain
    const formattedMessages: ChatMessage[] = [
      { role: "system", content: SENIOR_MENTOR_SYSTEM_PROMPT },
    ];

    // Append prior conversation
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (i === messages.length - 1 && msg.role === "user") {
        // Enrich latest message with topic context & mode instructions
        const enrichedContent = buildUserPromptWithContext(msg.content, mode, topicContext);
        formattedMessages.push({ role: "user", content: enrichedContent });
      } else {
        formattedMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const payload = {
      model: selectedModel,
      messages: formattedMessages,
      temperature: 0.7,
      stream: true,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "AI_PROVIDER_ERROR", message: errorText },
        { status: response.status }
      );
    }

    // Robust SSE Event Parser Stream
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        
        // SSE events are demarcated by double newlines \n\n
        const events = buffer.split("\n\n");
        // Save incomplete tail in buffer
        buffer = events.pop() || "";

        for (const event of events) {
          const lines = event.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue; // Skip SSE keepalive comments

            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(dataStr);
                const textContent = parsed.choices?.[0]?.delta?.content;
                if (textContent) {
                  controller.enqueue(encoder.encode(textContent));
                }
              } catch (e) {
                // Ignore incomplete JSON
              }
            }
          }
        }
      },
      flush(controller) {
        if (buffer.includes("data: ")) {
          const lines = buffer.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ") && !trimmed.includes("[DONE]")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6).trim());
                const textContent = parsed.choices?.[0]?.delta?.content;
                if (textContent) {
                  controller.enqueue(encoder.encode(textContent));
                }
              } catch (e) {
                // Ignore
              }
            }
          }
        }
      },
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
