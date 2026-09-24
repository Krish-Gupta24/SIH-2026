import { NextRequest, NextResponse } from "next/server";
import {
  SYSTEM_ENGINEERING_PROMPT,
  MATERIAL_DATABASE,
} from "@/features/chatbot/chatbot-knowledge";
import {
  generateThermalAIResponse,
  ProjectContextTelemetry,
} from "@/features/chatbot/thermal-ai-engine";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  projectContext?: ProjectContextTelemetry;
  apiKey?: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { messages = [], projectContext, apiKey: bodyApiKey, model = "gemini-1.5-flash" } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided." },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1]?.content || "";

    // 1. Check for Groq API Key (Primary ultra-fast LPU inference)
    const clientHeaderGroq = req.headers.get("x-groq-key");
    const isGroqBodyKey = bodyApiKey && (bodyApiKey.startsWith("gsk_") || bodyApiKey.length > 40);
    const activeGroqKey =
      (clientHeaderGroq && clientHeaderGroq.trim() !== "" ? clientHeaderGroq.trim() : null) ||
      (isGroqBodyKey ? bodyApiKey.trim() : null) ||
      (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "" ? process.env.GROQ_API_KEY.trim() : null) ||
      (process.env.NEXT_PUBLIC_GROQ_API_KEY && process.env.NEXT_PUBLIC_GROQ_API_KEY.trim() !== "" ? process.env.NEXT_PUBLIC_GROQ_API_KEY.trim() : null) ||
      null;

    // 2. Check for Gemini API Key (Secondary / Large context)
    const clientHeaderGemini = req.headers.get("x-gemini-key");
    const isGeminiBodyKey = bodyApiKey && (bodyApiKey.startsWith("AIza") || (!isGroqBodyKey && bodyApiKey.trim() !== ""));
    const activeGeminiKey =
      (clientHeaderGemini && clientHeaderGemini.trim() !== "" ? clientHeaderGemini.trim() : null) ||
      (isGeminiBodyKey && !isGroqBodyKey ? bodyApiKey.trim() : null) ||
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "" ? process.env.GEMINI_API_KEY.trim() : null) ||
      (process.env.NEXT_PUBLIC_GEMINI_API_KEY && process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim() !== "" ? process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim() : null) ||
      null;

    // Build context-rich prompt
    const contextPromptChunk = projectContext
      ? `
CURRENT ACTIVE SHELTER TELEMETRY:
- Project Name: ${projectContext.projectName || "Ladakh Passive Solar Outpost"}
- Geographic Location: ${projectContext.locationName || "Leh, Ladakh, India"} (Elevation: ${projectContext.elevationM || 3500}m ASL)
- Outdoor Design Winter Minimum: ${projectContext.winterMinC ?? -20}°C
- Dimensions: ${projectContext.dimensions?.length ?? 6}m (L) x ${projectContext.dimensions?.width ?? 4}m (W) x ${projectContext.dimensions?.height ?? 2.8}m (H)
- Floor Area: ${projectContext.dimensions?.floorAreaM2 ?? 24} m² | Volume: ${projectContext.dimensions?.volumeM3 ?? 67.2} m³
- Wall Assembly: ${projectContext.envelopeSummary?.wallLayers?.join(" + ") || "150mm EPS + 200mm Rammed Earth"}
- Roof Assembly: ${projectContext.envelopeSummary?.roofLayers?.join(" + ") || "150mm Rockwool Insulated Deck"}
- Glazing & Aperture: ${projectContext.envelopeSummary?.windowAreaM2 ?? 3.6} m² (${projectContext.envelopeSummary?.glazingType || "Triple Low-E Argon"}) facing ${projectContext.envelopeSummary?.orientationDeg ?? 0}° Azimuth
- Passive Trombe Wall: ${projectContext.envelopeSummary?.hasTrombeWall ? "Active" : "Disabled / Not Installed"}
- Latest Simulation Comfort: ${projectContext.simulationResults?.comfortHoursPct ?? 92}% hours in 18°C-24°C band
- Indoor Temperatures: Min ${projectContext.simulationResults?.indoorMinC ?? 18.2}°C, Mean ${projectContext.simulationResults?.indoorMeanC ?? 20.6}°C, Max ${projectContext.simulationResults?.indoorMaxC ?? 23.8}°C
- Annual Heating Demand: ${projectContext.simulationResults?.heatingDemandKwhM2 ?? 14.2} kWh/m²
- Bukhari Fuel Displaced: ~${projectContext.simulationResults?.fuelDisplacementLiters ?? 1680} Liters kerosene
`
      : "";

    // Execution Priority 1: Groq API (Ultra-fast LPU inference: llama-3.3-70b-versatile)
    if (activeGroqKey) {
      try {
        const groqEndpoint = "https://api.groq.com/openai/v1/chat/completions";
        const groqModel = model && model.includes("llama") ? model : "llama-3.3-70b-versatile";

        const groqMessages = [
          {
            role: "system",
            content: `${SYSTEM_ENGINEERING_PROMPT}\n\n${contextPromptChunk}`,
          },
          ...messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
        ];

        const groqRes = await fetch(groqEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeGroqKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: groqMessages,
            temperature: 0.35,
            max_tokens: 1500,
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const candidateText = data.choices?.[0]?.message?.content;

          if (candidateText && candidateText.trim().length > 0) {
            return NextResponse.json({
              reply: candidateText.trim(),
              engine: `groq (${groqModel})`,
              isLiveLLM: true,
            });
          }
        } else {
          const errData = await groqRes.json().catch(() => null);
          console.warn("Groq API returned non-OK response:", groqRes.status, errData);
        }
      } catch (err: any) {
        console.warn("Groq fetch exception:", err?.message);
      }
    }

    // Execution Priority 2: Google Gemini API (gemini-1.5-flash)
    if (activeGeminiKey) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeGeminiKey}`;

        const geminiContents = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        const geminiPayload = {
          systemInstruction: {
            parts: [
              {
                text: `${SYSTEM_ENGINEERING_PROMPT}\n\n${contextPromptChunk}`,
              },
            ],
          },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.35,
            topP: 0.95,
            maxOutputTokens: 1500,
          },
        };

        const res = await fetch(geminiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(geminiPayload),
        });

        if (res.ok) {
          const data = await res.json();
          const candidateText =
            data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (candidateText && candidateText.trim().length > 0) {
            return NextResponse.json({
              reply: candidateText.trim(),
              engine: "gemini (gemini-1.5-flash)",
              isLiveLLM: true,
            });
          }
        }

        console.warn(
          "Gemini API returned non-OK response, falling back to Autonomous Thermal Engine."
        );
      } catch (err: any) {
        console.warn("Gemini fetch exception:", err?.message);
      }
    }

    // Execution Priority 3: High-Fidelity Autonomous Thermal Engineering Engine Fallback
    const localReply = generateThermalAIResponse(lastMessage, projectContext);

    return NextResponse.json({
      reply: localReply,
      engine: "thermoshelter-core",
      isLiveLLM: false,
      note: (activeGroqKey || activeGeminiKey)
        ? "External LLM API unavailable; answered via ThermoShelter Engineering Intelligence Core."
        : "Answered via ThermoShelter Autonomous High-Altitude Thermal Engineering Intelligence Core.",
    });
  } catch (error: any) {
    console.error("Chat API route error:", error);
    return NextResponse.json(
      {
        reply:
          "### ⚠️ Thermal Engine Notification\nAn unexpected processing error occurred. However, the ThermoShelter core recommends checking the building envelope insulation (150mm EPS composite) and south Trombe aperture for -20°C alpine stability.",
        engine: "thermoshelter-fallback",
        error: error?.message || "Internal error",
      },
      { status: 200 } // Return 200 with fallback message so client UI never breaks
    );
  }
}
