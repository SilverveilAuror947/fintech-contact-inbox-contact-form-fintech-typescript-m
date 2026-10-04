import test from "node:test";
import assert from "node:assert/strict";
import { routeContactToInbox, type ContactRequest } from "../src/contact_inbox";

process.env.TEAM_INBOX = "inbox@example.test";

test("large payment contacts are labeled for review with an audit record", async () => {
  let sent: { subject: string; body: string } | undefined;
  let verified: { widget_record_id: string; token: string } | undefined;
  const client = {
    captcha: { verify: async (body: { widget_record_id: string; token: string }) => {
      verified = body;
      return { passed: true };
    } },
    email: {
      send: async (body: { to: string; subject: string; body: string }) => {
        sent = body;
        return { message_id: "msg_42" };
      },
    },
  };
  const input: ContactRequest = {
    name: "Mina Park", email: "mina@example.test", company: "Clinic Pay",
    message: "Please contact our privacy officer about a settlement.",
    paymentEvent: { eventId: "pay_42", amountCents: 125000 }, captchaToken: "token", widget_record_id: "widget_42", ip: "203.0.113.8",
  };
  const result = await routeContactToInbox(input, client);
  assert.equal(result.riskSensitive, true);
  assert.equal(result.messageId, "msg_42");
  assert.equal(verified?.widget_record_id, "widget_42");
  assert.match(sent?.subject ?? "", /^\[review\] Fintech contact: Clinic Pay$/);
  assert.match(sent?.body ?? "", /Payment event: pay_42/);
  assert.match(sent?.body ?? "", /Risk-sensitive: yes/);
});
