/**
 * Minimal HTTP wrapper around Ollama's /api/chat REST endpoint.
 * Uses raw fetch() -- no ollama npm package needed.
 * Provides availability check, timeout enforcement, abort of pending requests, and model warm-up.
 */

/** Shape of the POST body sent to /api/chat */
export interface OllamaChatRequest {
    model: string;
    messages: Array<{ role: string; content: string }>;
    format?: object;
    stream: boolean;
    options?: { temperature: number };
    keep_alive?: string;
}

/** Shape of the JSON response from /api/chat (stream: false) */
export interface OllamaChatResponse {
    model: string;
    message: { role: string; content: string };
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
}

export class OllamaClient {
    private baseUrl: string;
    private model: string;
    private timeoutMs: number;

    /** null = unchecked, true = available, false = unavailable */
    private available: boolean | null = null;
    /** Controller for the currently in-flight chat request (for abort on rapid input) */
    private pendingController: AbortController | null = null;

    constructor(
        baseUrl: string = 'http://localhost:11434',
        model: string = 'qwen2.5:3b',
        timeoutMs: number = 2000,
    ) {
        this.baseUrl = baseUrl;
        this.model = model;
        this.timeoutMs = timeoutMs;
    }

    /**
     * GET to the Ollama base URL to check if the server is running.
     * Sets internal `available` flag. Returns the result.
     */
    async checkAvailability(): Promise<boolean> {
        try {
            const res = await fetch(this.baseUrl, {
                signal: AbortSignal.timeout(1000),
            });
            this.available = res.ok;
        } catch {
            this.available = false;
        }
        return this.available;
    }

    /**
     * Synchronous check of cached availability state.
     * Returns true only if checkAvailability() previously succeeded.
     */
    isAvailable(): boolean {
        return this.available === true;
    }

    /**
     * Send a chat request to Ollama with JSON schema constraint.
     * Aborts any pending in-flight request to prevent race conditions.
     * Enforces timeout via AbortSignal.timeout combined with manual AbortController.
     */
    async chat(
        systemPrompt: string,
        userMessage: string,
        schema: object,
    ): Promise<{ content: string }> {
        // Abort previous in-flight request if any
        if (this.pendingController) {
            this.pendingController.abort();
        }

        // Create new controller for this request
        const controller = new AbortController();
        this.pendingController = controller;

        const body: OllamaChatRequest = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            format: schema,
            stream: false,
            options: { temperature: 0 },
            keep_alive: '30m',
        };

        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(this.timeoutMs),
            ]),
        });

        this.pendingController = null;

        if (!res.ok) {
            throw new Error(`Ollama returned ${res.status}`);
        }

        const data = (await res.json()) as OllamaChatResponse;
        return { content: data.message.content };
    }

    /**
     * Fire-and-forget request to pre-load the model into memory.
     * Uses a longer timeout since model loading can take several seconds.
     * Failures are silently ignored -- warm-up is non-critical.
     */
    async warmUp(): Promise<void> {
        try {
            await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'hi' }],
                    stream: false,
                    keep_alive: '30m',
                }),
                signal: AbortSignal.timeout(15000),
            });
        } catch {
            // Warm-up failure is non-critical -- silently ignore
        }
    }
}
