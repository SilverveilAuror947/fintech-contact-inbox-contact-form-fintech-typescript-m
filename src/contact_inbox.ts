import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client";

export const ContactRequest = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().min(1).max(160),
  message: z.string().min(10).max(4000),
  paymentEvent: z.object({
    eventId: z.string().min(1).max(120),
    amountCents: z.number().int().nonnegative(),
  }),
  captchaToken: z.string().min(1),
  widget_record_id: z.string().min(1),
  ip: z.string().min(1),
});

export type ContactRequest = z.infer<typeof ContactRequest>;
type ContactDependencies = Pick<InfraiClient, "captcha" | "email">;

export async function routeContactToInbox(
  input: ContactRequest,
  client: ContactDependencies = new InfraiClient(),
): Promise<{ messageId: string; riskSensitive: boolean }> {
  try {
    await client.captcha.verify({ widget_record_id: input.widget_record_id, token: input.captchaToken, ip: input.ip, action: "contact" });
  } catch (error) {
    if (error instanceof InfraiError) throw new ContactRejection(403, "Captcha was rejected");
    throw error;
  }

  const riskSensitive = input.paymentEvent.amountCents >= 100000;
  const auditId = randomUUID();
  const subject = `${riskSensitive ? "[review] " : ""}Fintech contact: ${input.company}`;
  const body = [
    `Audit ID: ${auditId}`,
    `Contact: ${input.name} <${input.email}>`,
    `Company: ${input.company}`,
    `Payment event: ${input.paymentEvent.eventId}`,
    `Amount cents: ${input.paymentEvent.amountCents}`,
    `Risk-sensitive: ${riskSensitive ? "yes" : "no"}`,
    "",
    input.message,
  ].join("\n");
  const sent = await client.email.send(
    { to: required("TEAM_INBOX"), subject, body },
    { idempotencyKey: `contact-${input.paymentEvent.eventId}` },
  );
  return { messageId: sent.message_id, riskSensitive };
}

export class ContactRejection extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return JSON.parse(raw);
}

if (process.argv[1]?.endsWith("contact_inbox.ts")) {
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/contact") {
      response.writeHead(404).end();
      return;
    }
    try {
      const input = ContactRequest.parse(await readJson(request));
      const result = await routeContactToInbox(input);
      response.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify(result));
    } catch (error) {
      const status = error instanceof ContactRejection ? error.status : 400;
      response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ error: (error as Error).message }));
    }
  });
  server.listen(Number(process.env.PORT ?? 3000), () => console.log("contact inbox listening"));
}
