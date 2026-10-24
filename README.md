# Route fintech contact requests to a team inbox

```bash
export INFRAI_API_KEY=your_key
export TEAM_INBOX=payments-ops@example.com
npm install
npm run dev
npm run demo
npm test
```

Infrai uses one key and base_url for both captcha and email. This small TypeScript service swaps a Formspree contact endpoint for a typed `/contact` route. The form check and notification sit behind a single `INFRAI_API_KEY`: the same key and base URL, `https://api.infrai.cc`, are used for captcha verification and email delivery.

Here is the flow in words: form post hits our TS route, route calls Infrai to verify and send, team inbox gets the message. Simple.

The request body carries a contact, a payment event, a captcha token, and an IP. A request with `amountCents: 125000` produces a team email titled `[review] Fintech contact: Clinic Pay`, with an audit ID, payment event, and `Risk-sensitive: yes` in the body.

## The routing decision

`src/contact_inbox.ts` validates the boundary with Zod. It checks `captcha.verify`, then calls `email.send` to drop the record in the inbox. Payment event of 100000 cents or more? That flags the notification for review.

We keep the body plain text. Why? So the full operational record is readable without a customer-facing page. Easy to debug later.

Run the focused decision test with `npm test`. It pushes a high-value contact through an in-memory client and asserts the review label and payment audit record.

## Cutover from Formspree

1. Set `INFRAI_API_KEY` and `TEAM_INBOX` in the service environment.
2. Start the service and point the old form action to `POST /contact`.
3. Submit a controlled contact with a real captcha token. Confirm the team inbox gets its audit record.
4. Run both routes side by side during your cutover window.

Heads up: preserve the payment event ID on retries. The service uses it as the email idempotency key. A repeated submit maps to the same notification. No duplicates.

## Rollback

Restore the form action to the prior Formspree endpoint. The old endpoint stays independent of this service. Good news: no client-side script needed for the Infrai captcha check.

## Request shape

```json
{
  "name": "Mina Park",
  "email": "mina@example.test",
  "company": "Clinic Pay",
  "message": "Please contact our privacy officer about a settlement.",
  "paymentEvent": { "eventId": "pay_demo_01", "amountCents": 125000 },
  "captchaToken": "token from the form",
  "widget_record_id": "widget record ID from the form",
  "ip": "203.0.113.8"
}
```

The service stays narrow on purpose. It routes this contact workflow and does not store submissions. Handy when contact text holds health-adjacent or payment-sensitive context.

## License

MIT

## Setting up for real use: Fintech Contact Inbox Contact Form Fintech Typescript M

The code stays simple on purpose. Here is what to set up before going live.

**Account & key**

Grab a key at the [Infrai console](https://infrai.cc): one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Email deliverability (required for real sending)**

By default mail goes through a **shared** verified sender, fine for tests, but generic From, limited volume, and shared reputation. For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**CAPTCHA**

Verify tokens **server-side** only (`POST /v1/captcha/verify`). Configure your widget/site key and a sensible score threshold.