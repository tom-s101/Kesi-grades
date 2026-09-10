# WhatsApp integration

Teachers who aren't comfortable with the web dashboard can text a small set
of commands to a WhatsApp number and have KESI update the database directly.
The webhook (`src/app/api/whatsapp/webhook/route.ts`) is fully built and
tested; what's missing is *your* WhatsApp Business phone number, which only
you can set up (it needs your organization's Meta Business/Facebook
verification).

## What it does today

- Verifies the Meta webhook handshake.
- Verifies every inbound webhook's signature (`WHATSAPP_APP_SECRET`) so a
  stranger can't forge grade/attendance updates.
- Matches the sender's phone number to a row in `teachers.whatsapp_number`
  (set this when you import your roster — see `supabase/seed/`).
- Parses three commands and writes straight to Supabase, scoped to only the
  classes that teacher is assigned to (same RLS-equivalent scoping the web
  app uses, enforced in the route handler since the admin client bypasses
  RLS by necessity):

  ```
  ATT LastName AM|PM P|L|A [YYYY-MM-DD]
    ATT Santos AM P                → present, this morning, today
    ATT Santos PM A 2026-09-10     → absent, that afternoon, a specific date

  SCORE LastName SubjectCode QUIZ|HW WeekNum Percentage
    SCORE Santos math QUIZ 3 90    → Week 3 quiz, 90%

  EXAM LastName SubjectCode QuarterNum Percentage
    EXAM Santos math 1 88          → Quarter 1 exam, 88%

  HELP                              → replies with this list
  ```

  Subject codes: `bible`, `math`, `english`, `filipino`, `science`,
  `social_studies`, `music_arts`, `pe_health` (see `subjects` table).

  If two students share a last name, the bot replies with the full list and
  asks the teacher to resend using `LastName,FirstName` (e.g. `Santos,Maria`).

- Replies to the teacher confirming what was saved, or explaining what went
  wrong (unknown subject code, ambiguous student, etc).

## What it doesn't do (yet)

- No natural-language understanding — it's a fixed command grammar. A
  teacher who's never used it will need the `HELP` text once. If that proves
  too stiff in practice, the next step is either WhatsApp's interactive
  list/button messages (still Cloud-API-native, no extra service) or routing
  free-text through an LLM to extract the same fields before hitting the
  same write path — the write path itself doesn't change either way.
- No media/voice notes.
- No conversational multi-turn state (each message is handled independently).

## Setup

1. **Create a Meta developer app** at [developers.facebook.com](https://developers.facebook.com/)
   with the WhatsApp product added.
2. **Get a WhatsApp Business phone number** (Meta gives you a free test
   number during development; you'll want to port your organization's real
   number for production, which requires Meta Business verification —
   budget a few days for that review).
3. In the Meta app dashboard, under WhatsApp → Configuration:
   - **Callback URL**: `https://<your-deployed-domain>/api/whatsapp/webhook`
   - **Verify token**: any random string — put the same value in
     `WHATSAPP_VERIFY_TOKEN`.
   - Subscribe to the `messages` webhook field.
4. Copy these into your `.env` / hosting provider's environment variables
   (see `.env.example`):
   - `WHATSAPP_VERIFY_TOKEN` — matches what you typed into Meta's dashboard.
   - `WHATSAPP_APP_SECRET` — App Dashboard → Settings → Basic → App Secret.
     Used to verify inbound webhook signatures.
   - `WHATSAPP_ACCESS_TOKEN` — a permanent token from a System User with
     `whatsapp_business_messaging` permission (the temporary 24-hour token
     Meta shows you by default will expire and break replies).
   - `WHATSAPP_PHONE_NUMBER_ID` — from WhatsApp Manager, the numeric ID of
     your sending number (not the phone number itself).
5. Register each teacher's WhatsApp number (E.164 format, e.g.
   `+639171234567`) in the `whatsapp_number` column when you import the
   roster (`supabase/seed/import-teachers.ts` — the CSV template has a
   column for it).
6. Text `HELP` to your business number from a registered teacher's phone to
   confirm it's wired up.

Until step 4 is done, the route still runs — `sendWhatsAppMessage` just logs
to the server console instead of calling the Graph API, so you can develop
and test the parsing/DB-write logic locally before you have real WhatsApp
credentials.
