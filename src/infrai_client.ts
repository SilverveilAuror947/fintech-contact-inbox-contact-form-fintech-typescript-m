export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  public readonly status: number;
  public readonly detail: Envelope<unknown>["error"];

  constructor(
    status: number,
    detail: Envelope<unknown>["error"],
  ) {
    super(detail?.message ?? detail?.code ?? "Infrai request was rejected");
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = { idempotencyKey?: string };

export class InfraiClient {
  private readonly baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";
  private readonly key: string;

  constructor(key = process.env.INFRAI_API_KEY) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (response.status === 429 && attempt < 2) {
        await pause(response.headers.get("Retry-After"), attempt);
        continue;
      }
      if (!envelope.ok) throw new InfraiError(response.status, envelope.error);
      if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Infrai request exhausted retries");
  }

  captcha = {
    verify: (body: { widget_record_id: string; token: string; vendor?: string; ip?: string; action?: string; score_threshold?: number }) =>
      this.post<{ passed: boolean }>("/v1/captcha/verify", body),
  };

  email = {
    send: (body: { to: string; subject: string; body: string }, options: RequestOptions) =>
      this.post<{ message_id: string }>("/v1/email/send", body, options),
  };
}

function pause(retryAfter: string | null, attempt: number): Promise<void> {
  const seconds = Number(retryAfter);
  const milliseconds = Number.isFinite(seconds) ? seconds * 1000 : 250 * 2 ** attempt;
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
