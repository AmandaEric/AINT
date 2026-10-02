// aiProviders.js
// Tries each AI provider in order (Gemini -> Groq -> OpenRouter) and returns
// the first successful answer. If one provider is rate limited (429), down,
// or missing its key, the next one is tried automatically.

import { GoogleGenerativeAI } from "@google/generative-ai";

const REQUEST_TIMEOUT_MS = 20000;

// ------------------------------------------------------------------
// Provider 1: Google Gemini
// ------------------------------------------------------------------
let geminiModel = null;

async function callGemini(prompt) {
    if (!geminiModel) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
}

// ------------------------------------------------------------------
// Providers 2 and 3: Groq and OpenRouter
// Both speak the same "OpenAI-compatible" format, so one helper covers both.
// ------------------------------------------------------------------
async function callOpenAICompatible({ url, apiKey, model, prompt, extraHeaders = {} }) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...extraHeaders,
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
        throw new Error("Empty response from provider");
    }

    return text;
}

function callGroq(prompt) {
    return callOpenAICompatible({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.3-70b-versatile",
        prompt,
    });
}

function callOpenRouter(prompt) {
    return callOpenAICompatible({
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY,
        // "openrouter/free" automatically picks whichever free model is
        // available, so this keeps working when individual free models rotate out.
        model: "openrouter/free",
        prompt,
    });
}

// ------------------------------------------------------------------
// Failover logic
// ------------------------------------------------------------------

// Order matters: first entry is tried first.
// Keys are checked when a request happens (not at import time), so it
// doesn't matter whether dotenv loads before or after this file.
function getProviders() {
    return [
        { name: "Gemini",     key: process.env.GEMINI_API_KEY,     call: callGemini },
        { name: "Groq",       key: process.env.GROQ_API_KEY,       call: callGroq },
        { name: "OpenRouter", key: process.env.OPENROUTER_API_KEY, call: callOpenRouter },
    ];
}

export async function generateWithFailover(prompt) {
    const errors = [];

    for (const provider of getProviders()) {

        // Skip providers you haven't set up a key for
        if (!provider.key) {
            errors.push(`${provider.name}: no API key set, skipped`);
            continue;
        }

        try {
            const text = await provider.call(prompt);
            console.log(`AI answered using: ${provider.name}`);
            return { text, provider: provider.name };
        } catch (err) {
            // Any failure (rate limit, outage, timeout, bad key) moves to the next provider
            console.warn(`${provider.name} failed: ${err.message}`);
            errors.push(`${provider.name}: ${err.message}`);
        }
    }

    throw new Error("All AI providers failed. " + errors.join(" | "));
}