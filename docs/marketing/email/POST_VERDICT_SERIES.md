# Post-Discovery email series

Trigger: Resend contact created with `source = verdict_email` (from
`POST /api/v1/leads/verdict-email`). Exit: `signup_completed` or
`checkout_completed` for that email. Plain text or minimal HTML. No advice
language. Sign-off and unsubscribe on every send.

Guarantee line: `Free Discovery. No signup. No card.`
Sign-off: `Google Deal Gap IQ. Know what to offer.`

---

## Automation (Resend dashboard)

1. Audience: contacts where `source` = `verdict_email`.
2. Create a 3-step sequence. Email 1 is already sent transactionally by the
   backend (`EmailService.send_verdict_email`); do not send it twice. This
   automation starts at email 2.
3. Exit conditions: contact has `signup_completed` or `checkout_completed`
   (PostHog → Resend webhook, or suppress when the contact gains a user id).
4. Unsubscribe footer on every step. `We analyze. You decide.`

If the connector is not live, paste these three bodies into Resend Broadcasts
and trigger from the contact property.

---

## Email 1 — immediately (B1 transactional)

**Subject:** `Your Discovery for <address>`

Sent by the API. Three numbers (Income Value, Target Buy, Deal Gap), link
back to Discovery, guarantee line, sign-off. Footer: unsubscribe,
`We analyze. You decide.`

---

## Email 2 — +2 days

**Subject:** `The number listing sites don't show you`

Listing sites show the asking price. Your Discovery showed two more: Income
Value (what the rent supports) and Target Buy (the price where the deal
works). The difference is the Deal Gap.

The gap is the negotiation.

See the four ways to close it: <Discovery URL>

Free Discovery. No signup. No card.

Google Deal Gap IQ. Know what to offer.

We analyze. You decide.

Unsubscribe: <link>

---

## Email 3 — +5 days

**Subject:** `When the seller says no to the price`

A 6% cut is often a no. A 2% cut, a seller second, and verified rent is the
same math in three smaller asks. The script for that blended plan is on your
Discovery.

Read the script: <Discovery URL>

A free account saves 10 properties so the next address is a comparison, not
a memory.

Google Deal Gap IQ. Know what to offer.

We analyze. You decide.

Unsubscribe: <link>
