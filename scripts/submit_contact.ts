export {};

const response = await fetch(process.env.CONTACT_URL ?? "http://localhost:3000/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Mina Park",
    email: "mina@example.test",
    company: "Clinic Pay",
    message: "Please contact our privacy officer about a settlement.",
    paymentEvent: { eventId: "pay_demo_01", amountCents: 125000 },
    captchaToken: process.env.CAPTCHA_TOKEN ?? "demo-token",
    widget_record_id: process.env.CAPTCHA_WIDGET_RECORD_ID ?? "demo-widget",
    ip: "203.0.113.8",
  }),
});
console.log(await response.json());
