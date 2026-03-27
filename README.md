# heymilo.nl — Website

De marketingwebsite voor **Milo**, persoonlijke AI-assistent via WhatsApp.

Gebouwd door BotLease B.V. | [heymilo.nl](https://heymilo.nl)

---

## Wat is dit?

Deze repo bevat alleen de **frontend website** — geen backend logica. Het product zelf (WhatsApp bot, AI, betalingen) staat in [milo-backend](https://github.com/fredved1/milo-backend).

```
heymilo.nl (deze repo)          milo-backend (andere repo)
──────────────────────          ──────────────────────────
Marketing pagina                WhatsApp bot
Pricing                         AI (OpenRouter)
Privacy beleid                  Stripe webhook
Welkomstpagina na betaling      CEO dashboard
                                SQLite database
         │                              ▲
         │  Stripe betaallink           │
         └──────────────────────────────┘
              Stripe webhook naar backend
```

---

## Stack

| Onderdeel | Technologie |
|-----------|-------------|
| Hosting | Vercel (auto-deploy via GitHub) |
| Frontend | Vanilla HTML/CSS/JS |
| Chatbot widget | Vercel serverless function → OpenRouter |
| Analytics | Vercel Analytics |

---

## Bestanden

```
index.html      — Hoofdpagina (marketing, pricing, chatbot widget)
privacy.html    — Privacybeleid (vereist voor Meta app verificatie)
welkom.html     — Welkomstpagina na Stripe betaling
robots.txt      — SEO
sitemap.xml     — SEO
vercel.json     — URL rewrites (/privacy → privacy.html etc.)
api/
└── chat.js     — Vercel serverless: chatbot proxy naar OpenRouter
```

---

## URL rewrites

| URL | Bestand |
|-----|---------|
| `/privacy` | `privacy.html` |
| `/welkom` | `welkom.html` |
| `/login` | `login.html` *(niet actief)* |
| `/dashboard` | `dashboard.html` *(niet actief)* |

---

## Chatbot widget (`api/chat.js`)

De chatbot op de homepage praat gratis met bezoekers via OpenRouter.

Modellen (met fallback):
1. `google/gemini-2.0-flash-exp` — primair
2. `qwen/qwen-2.5-7b-instruct` — fallback
3. `google/gemma-3-4b-it` — laatste fallback

Vereiste env var in Vercel:
```
OPENROUTER_API_KEY=sk-or-v1-...
```

---

## Deployen

Vercel deploy automatisch bij elke push naar `master`.

Handmatig:
```bash
vercel --prod --yes
```

---

## Koppeling met backend

Na een succesvolle Stripe betaling stuurt Stripe een webhook naar de backend (`api.heymilo.nl`). De welkomstpagina (`/welkom`) toont een bevestiging aan de klant.

De betaallink staat in `index.html` en wijst naar Stripe Checkout met een verplicht `whatsapp_number` veld.

---

## DNS (Cloudflare)

| Record | Type | Waarde |
|--------|------|--------|
| `heymilo.nl` | A | `216.198.79.1` (Vercel) |
| `www.heymilo.nl` | CNAME | `aa8d311827699b3a.vercel-dns-017.com` |

---

## Licentie

Privé project — BotLease B.V. © 2026
