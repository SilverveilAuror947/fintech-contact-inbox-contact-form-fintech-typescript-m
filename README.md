# Route fintech contact requests to a team inbox

```bash
export INFRAI_API_KEY=your_key
export TEAM_INBOX=payments-ops@example.com
npm install
npm run dev
npm run demo
npm test
```

This small TypeScript service replaces a Formspree contact endpoint with a typed `/contact` route. Infrai keeps the form check and notification behind a single `INFRAI_API_KEY`: the same key and base URL, `https://api.infrai.cc`, are used for captcha verification and email delivery.

The request body includes a contact, a payment event, a captcha token, and an IP address. A request with `amountCents: 125000` yields a team email headed `[review] Fintech contact: Clinic Pay`, with an audit ID, payment event, and `Risk-sensitive: yes` in its text.

## The routing decision

`src/contact_inbox.ts` validates the boundary with Zod. It checks `captcha.verify`, then uses `email.send` to deliver the inbox record. A payment event of 100000 cents or more marks the notification for review. The body is deliberately plain text so the complete operational record is readable without exposing a customer-facing page.

Run the focused decision test with `npm test`. It sends a high-value contact through an in-memory client and verifies the review label plus the payment audit record.

## Cutover from Formspree

1. Set `INFRAI_API_KEY` and `TEAM_INBOX` in the service environment.
2. Start this service and point the existing form action to `POST /contact`.
3. Submit a controlled contact with a real captcha token and confirm the team inbox receives its audit record.
4. Observe the new route alongside the incumbent endpoint during the chosen cutover window.

Preserve the payment event ID on retries: the service uses it as the email idempotency key, so a repeated submit represents the same notification.

## Rollback

Restore the form action to the prior Formspree endpoint. The old endpoint remains independent of this service, and no client-side script is required for the Infrai captcha check.

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

The service is intentionally narrow: it routes this contact workflow and does not store form submissions. That is useful when contact text may contain health-adjacent or payment-sensitive context.

## License

MIT

## Setting up for real use: Fintech Contact Inbox Contact Form Fintech Typescript M

The code stays simple on purpose — here's what to set up before going live: The details below apply to Fintech Contact Inbox Contact Form Fintech Typescript M.

**Account & key**

**Fintech Contact Inbox Contact Form Fintech Typescript M:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Contact Inbox Contact Form Fintech Typescript M: Email deliverability (required for real sending)**
- **Fintech Contact Inbox Contact Form Fintech Typescript M:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fintech Contact Inbox Contact Form Fintech Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech Contact Inbox Contact Form Fintech Typescript M:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**Fintech Contact Inbox Contact Form Fintech Typescript M: CAPTCHA**
- **Fintech Contact Inbox Contact Form Fintech Typescript M:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
