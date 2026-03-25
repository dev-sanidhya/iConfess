# iConfess

iConfess is an anonymous confession platform built with Next.js 16, Prisma, and PostgreSQL. Users sign up with OTP verification, create a searchable profile based on real-world contexts like college, school, workplace, gym, or neighbourhood, and send anonymous confessions either by phone number or by profile matching.

The app is designed around three core ideas:

- anonymous confession delivery
- profile discovery without direct name search
- mutual-reveal logic only when both sides consent

## Product Overview

Users can:

- register with phone OTP
- set a username and password for future logins
- create a primary profile category and optional additional categories
- add Instagram and Snapchat handles
- search people by phone number, structured profile details, or social handle
- send anonymous confessions
- receive confessions and reply
- unlock confession content and reveal identity through payment flows

## Main Flows

### Authentication

- Signup starts with phone OTP verification.
- New users must provide:
  - full name
  - gender
  - username
  - password
  - Instagram handle
  - Snapchat handle
- Gender is fixed at signup and cannot be changed later.
- Existing users log in with username and password. OTP is not required on every login.

### Profile Model

Each user has:

- one required `primaryCategory`
- zero or more additional categories
- category-specific details for each selected place

Supported categories:

- College / University
- School
- Workplace / Office
- Gym
- Neighbourhood

This allows one user to be discoverable across multiple contexts at once.

### Search

Search does not allow direct free-text name lookup.

Supported search modes:

- phone number
- structured profile details
- social handle search via Instagram or Snapchat

Search results only show the context relevant to the query instead of exposing all stored profile data.

### Sending Confessions

There are two sending modes:

- by phone number
- by structured profile matching

When sending a confession:

- first name is required
- last name is optional
- message is required

For testing, repeat confessions can be temporarily allowed for tightly scoped test profiles without changing the rule for general users.

## Tech Stack

- Next.js 16.2.1
- React 19
- TypeScript
- Prisma ORM
- Neon PostgreSQL
- Tailwind CSS 4
- Framer Motion
- JWT cookie auth
- 2factor.in for OTP delivery
- Razorpay placeholders for monetization flows

## Project Structure

High-level app layout:

```text
src/
  app/
    api/
      auth/
      confessions/
      payments/
      users/
    auth/
      login/
      register/
    dashboard/
      confessions/
      profile/
      search/
      send/
  components/
  lib/
prisma/
  migrations/
  schema.prisma
```

Important areas:

- [`src/app/api`](/C:/Users/shish/Desktop/iConfess/src/app/api): route handlers for auth, users, confessions, and payments
- [`src/app/auth`](/C:/Users/shish/Desktop/iConfess/src/app/auth): login and signup pages
- [`src/app/dashboard`](/C:/Users/shish/Desktop/iConfess/src/app/dashboard): authenticated product UI
- [`src/components`](/C:/Users/shish/Desktop/iConfess/src/components): reusable client/server UI components
- [`src/lib`](/C:/Users/shish/Desktop/iConfess/src/lib): auth, Prisma, matching, utilities, and profile sync logic
- [`prisma/schema.prisma`](/C:/Users/shish/Desktop/iConfess/prisma/schema.prisma): database schema

## Database

The project now uses PostgreSQL in production and local development can also point to PostgreSQL.

Current Prisma datasource:

- `provider = "postgresql"`
- `url = env("DATABASE_URL")`
- `directUrl = env("DIRECT_URL")`

Recommended production provider:

- Neon PostgreSQL

## Environment Variables

Create a `.env` file with the following values:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="replace-this-in-production"
TWOFACTOR_API_KEY="your-2factor-key"
OTP_DELIVERY_MODE="sms"
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
NEXT_PUBLIC_RAZORPAY_KEY_ID=""
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
TEST_REPEAT_CONFESSION_USERNAMES=""
TEST_REPEAT_CONFESSION_PHONES=""
```

Notes:

- `DATABASE_URL` should use the pooled PostgreSQL connection string.
- `DIRECT_URL` should use the direct PostgreSQL connection string.
- `OTP_DELIVERY_MODE` supports `sms`, `voice`, and `mock`.
- Instagram and Snapchat handles are required at signup. If unavailable, users can enter `NA Handle`.

## Local Development

Install dependencies:

```bash
npm install
```

Prisma Client is generated automatically via `postinstall`, but can also be generated manually:

```bash
npx prisma generate
```

Push the current schema to the configured database:

```bash
npx prisma db push
```

Start development:

```bash
npm run dev
```

The app runs on:

```text
http://localhost:3000
```

## Production Deployment

This app is intended to be deployed on Vercel with a hosted PostgreSQL database such as Neon.

### Required production setup

1. Create a hosted PostgreSQL database.
2. Set `DATABASE_URL` and `DIRECT_URL` in Vercel.
3. Set all auth and provider secrets in Vercel:
   - `JWT_SECRET`
   - `TWOFACTOR_API_KEY`
   - `OTP_DELIVERY_MODE`
   - payment keys if enabled
4. Redeploy the app.

### Why local SQLite was removed

SQLite with a local file works on a laptop but is not a stable production model for serverless deployments. Production requires a real hosted database because route handlers and API requests cannot rely on a local writable file database.

## Prisma Commands

Useful commands:

```bash
npx prisma generate
npx prisma db push
npx prisma studio
```

If you later move to migration-based deploys instead of schema pushes:

```bash
npx prisma migrate dev
npx prisma migrate deploy
```

## Current Business Rules

- Gender is required at signup and cannot be edited later.
- Phone number changes must go through verification, not direct profile editing.
- Direct name search is not supported.
- Confession sending requires first name.
- Last name during confession sending is optional.
- Username and social handles must remain unique.
- Social handles accept `NA Handle`, which is normalized as not available.

## Matching Logic

Profile matching is shared between confession sending and search so both systems operate on the same structured profile rules.

The matching layer lives in:

- [`src/lib/matching.ts`](/C:/Users/shish/Desktop/iConfess/src/lib/matching.ts)

Profile category persistence logic lives in:

- [`src/lib/profile-details.ts`](/C:/Users/shish/Desktop/iConfess/src/lib/profile-details.ts)

## OTP Delivery

OTP sending is handled through:

- [`src/app/api/auth/otp/send/route.ts`](/C:/Users/shish/Desktop/iConfess/src/app/api/auth/otp/send/route.ts)

Supported modes:

- `sms`
- `voice`
- `mock`

The current recommended production setup is SMS through 2factor.in because voice OTP depends on separate voice balance.

## Build And Verification

Build the app:

```bash
npm run build
```

Start the production server locally:

```bash
npm run start
```

## Security Notes

- Do not commit live secrets.
- Rotate any secret that has been pasted into logs, screenshots, or chats.
- Use a strong production `JWT_SECRET`.
- Use hosted PostgreSQL instead of local file-based SQLite in production.
- Restrict provider credentials to the deployment environment.

## Known Future Work

- full Razorpay payment validation
- production-grade phone-number change flow
- migration history cleanup after the SQLite-to-Postgres transition
- stronger observability and error reporting for production

## License

This repository is currently private/internal unless a separate license is added.
