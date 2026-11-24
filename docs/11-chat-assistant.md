# 11 · Shopping assistant (chatbot)

The chat button at the bottom right of every store page (except the checkout form) opens **TOS Assistant**. It:

- answers questions about delivery, payment, returns and the store;
- helps shoppers choose by asking one short question at a time (skin type, who it's for, budget…), with tappable answers;
- shows real products as cards with live price, photo and **Add to bag**, and can add products to the bag when asked;
- answers questions about the product being viewed ("Questions about this product?" on product pages);
- hands over to a person on WhatsApp, with the question pre-filled;
- replies in English, Sinhala, Tamil or Singlish, matching the shopper.

It runs on Google Gemini. Everything it says comes from the store's own data, never from the internet or the model's general knowledge.

## How it stays truthful

| What | Where it comes from |
|---|---|
| Store details, contact, hours | Settings › Store details |
| Delivery zones, fees, same-day, free delivery | Settings › Checkout & delivery |
| Payment methods, instalments | Settings › Payments (names only; no account numbers or keys) |
| Returns, terms, privacy | Settings › Policies (or the same short summaries the policy pages show until they're written) |
| Promotions | Automatic discounts that are live now (never coupon codes) |
| Extra answers | Settings › Chat assistant › Knowledge (questions & answers, notes) |
| Products | Live catalogue search (published products only), through tools the model calls |

- **Product cards** are loaded from the catalogue by the shopper's browser. The price, stock and photo shown are always the live ones, even if the model's wording is off. The server only lets the model show products that its searches returned in that chat.
- **Missing details:** when a product has no "How to use" or ingredients, the assistant says they aren't on the website yet and suggests the pack or WhatsApp. It doesn't fill gaps from general knowledge.
- **Off-topic requests**, attempts to change its rules, and requests for its instructions or coupon codes are declined.
- **Order status:** it can't look orders up. It sends shoppers to `/track-order`, or to WhatsApp for problems.
- **Unanswered questions:** it records store questions it couldn't answer. They appear on the chat (Insights › Chat conversations, filter "Unanswered"). Add the answers under **Settings › Chat assistant › Knowledge**.

## Admin

**Settings › Chat assistant** (store managers edit; marketing and support can view). Its tabs:

- **General:** switch it on or off; name, line under the name, greeting, suggested questions, tone.
- **Knowledge:** questions and answers, and extra notes.
- **Limits:**
  - Per shopper: messages per hour (20), per day (60), per chat (40), and the longest message (500 characters).
  - Shared connection allowance (×5). One IP may send five times the per-shopper limits, because Sri Lankan mobile networks put many people behind one IP.
  - Messages per day for the whole store (2,000). When reached, the chat asks shoppers to use WhatsApp until midnight, Sri Lanka time.
  - Automatic blocking (off by default). When on, an IP that keeps hitting the limits gets a 24-hour block.
- **Model & privacy:**
  - Gemini model (`gemini-flash-latest`) and a backup model (`gemini-flash-lite-latest`) that answers when the main one is busy.
  - Creativity (0.4) and the longest reply.
  - How long chats are kept (90 days).

**Insights › Chat conversations** (store managers, marketing and support):

- every chat as speech bubbles, with the products shown and WhatsApp hand-overs;
- the shopper: their customer account if they were signed in, otherwise "Guest" and a device ID;
- where it came from:
  - IP address;
  - location worked out from the IP (city, region, country);
  - internet provider, with a "hosting / datacenter network" flag;
  - device and browser;
  - referrer;
- signals:
  - limit hits;
  - messages sent too fast;
  - a **Suspicious** flag with the reasons (script or bot browser, datacenter network, repeated limit hits, bursts);
- usage: shopper messages, products shown, Gemini tokens;
- the **Block** card (store managers and admins) blocks this IP, its range, this device or this customer:
  - for 24 hours, 7 days, 30 days or until removed;
  - with a reason;
  - Unblock removes the block.

**Insights › Chat blocks** lists every block with its hit counter.

- A blocked visitor sees "Chat isn't available right now" with the WhatsApp link, and Gemini is never called.
- Blocking a device is safest for one person: mobile networks share IP addresses, so an IP or range block can affect other shoppers.

## Setup

1. **Gemini key.**
   - Create a key at https://aistudio.google.com/apikey.
   - Put it in the server's `/srv/theonlinestore/.env` as `GEMINI_API_KEY=…`.
   - Run `deploy/deploy.sh`. Pages are pre-built with or without the chat button, so a restart alone isn't enough.
   - Without the key the chat button doesn't appear.
2. **Turn on billing for the key's Google Cloud project** before launch.
   - The free tier allows about 15 requests a minute per model, and each shopper message uses 2–4 requests.
   - Google may also use free-tier conversations to improve its products.
   - Paid-tier usage isn't used that way, and its limits are far higher.
3. **IP location files.**
   - `deploy.sh` downloads the free DB-IP "Lite" city and network databases (CC BY 4.0, https://db-ip.com) into `GEOIP_DIR` (`/srv/theonlinestore/geoip`). It refreshes them monthly.
   - Locally, run `pnpm geoip:update` (files go to `./.geoip`).
   - Lookups happen on the server; no visitor IP is sent anywhere.
   - The city file is ~130 MB and is loaded into memory once.
4. **Caddy streaming.** The deploy kit's `deploy/Caddyfile` now has `flush_interval -1`, so replies appear word by word. On the server, copy it once: `cp /srv/theonlinestore/app/deploy/Caddyfile /etc/caddy/Caddyfile`, then `systemctl reload caddy` (as root). Without this the chat still works, but each reply may arrive all at once.
5. **Privacy policy.** Add a line saying chats are saved with the IP address, approximate location and device for security, and deleted after the retention period. The built-in summary at `/privacy` already says so.
6. **Knowledge.** Fill in Settings › Store details: hours, WhatsApp number and address. The assistant can only quote what is there.

## Costs

Each shopper message makes 2–4 Gemini calls: a search, maybe a product lookup, then the answer. Each call sends about 3–6 thousand tokens (instructions, store information, the chat so far) and receives a few hundred.

- Tokens per chat are on each conversation, under Usage.
- Check Google's current Flash prices to estimate the bill.
- The store-wide daily cap is the hard ceiling.

## How it works (developers)

- **Endpoint:** `POST /api/assistant/chat` (`src/endpoints/assistant.ts`) streams NDJSON events:
  - `start`, `text`, `products`, `replies`, `handoff`, `bag`, `limit`, `blocked`, `error`, `done`.
  - Same-origin only.
  - An httpOnly `tos_chat_vid` cookie identifies the device.
  - History is read from the database (never from the browser), so a page can't forge earlier answers.
- **Request order:**
  1. key and switch;
  2. origin;
  3. length;
  4. blocks (`lib/assistant/blocks.ts`, in memory, reloaded when blocks change);
  5. limits (`lib/assistant/limits.ts`; the daily cap is counted from `chat_conversations`);
  6. then Gemini.
- **Model loop:** `lib/assistant/run.ts`, with up to 4 tool rounds. The tools are in `lib/assistant/tools.ts`:
  - `search_products`, `get_product`;
  - `show_products`, `suggest_replies`, `whatsapp_handoff`, `add_to_bag`, `note_unanswered`.
- **System prompt:**
  - `lib/assistant/prompt.ts` holds the rules.
  - `lib/assistant/knowledge.ts` holds the store information. It is cached and rebuilt after any catalogue or settings save, or every 10 minutes.
- **Gemini:** called over its REST API (`v1beta …:streamGenerateContent?alt=sse`) with plain `fetch`, in `lib/assistant/gemini.ts`. The official SDK hung inside the Next.js production build, so it isn't used.
  - Google gets 25 seconds to start answering.
  - A busy main model (429/5xx/timeout before any text) falls through to the backup model, and is skipped for 2 minutes.
  - `CHAT_DEBUG=1` in the server env logs which model answered and how long Google took (no message text).
- **Widget:**
  - `components/assistant/`: `ChatProvider` (state and streaming), `ChatAssistant` (button and panel), `ChatProducts` (cards), `ChatText` (safe text: bold, lists, links to site pages only), `AskAboutProduct`.
  - The chat is kept in `sessionStorage`.
  - When the assistant is on, the floating WhatsApp button moves above the chat button on desktop, and into the chat on phones.
- **Admin:**
  - collections `chat-conversations` and `chat-blocks`, global `chat-settings`;
  - `components/admin/assistant/ChatTranscript.tsx` and `BlockVisitor.tsx`;
  - a daily job `cleanupChats` deletes chats past retention and blocks that expired over 90 days ago.
- **Tests:** `tests/int/assistant.int.spec.ts` replaces Gemini with a scripted fake. It covers grounding, limits, blocks, history ownership, the signed-in link, the IP helpers and link safety.
