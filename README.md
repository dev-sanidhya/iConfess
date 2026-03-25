# iConfess

iConfess is a production-oriented anonymous confession platform built with Next.js, Prisma, and PostgreSQL. It allows users to create structured, discoverable profiles across real-world contexts such as college, school, workplace, gym, and neighbourhood, then send anonymous confessions by profile matching, phone number, or social handle.

The product is designed around three principles:

- anonymous communication by default
- structured discovery instead of open-name lookup
- consent-based identity reveal only after mutual confirmation

## Highlights

- OTP-based onboarding with persistent username/password login
- multi-profile identity model with one primary category and optional additional categories
- search by phone number, structured profile details, Instagram handle, or Snapchat handle
- anonymous confession delivery with reply flow
- mutual confession detection and gated identity reveal
- paid unlock hooks for inbox and search insight experiences
- responsive dashboard and mobile-friendly navigation

## Core Product Flows

### 1. Authentication

- New users verify their phone number using OTP.
- After verification, they create an account with:
  - full name
  - gender
  - username
  - password
  - Instagram handle
  - Snapchat handle
- Returning users sign in with username and password.
- Gender is fixed after signup.
- Phone number changes are not directly editable and must go through verification.

### 2. Profile System

Each user has:

- one required `primaryCategory`
- zero or more additional profile categories
- category-specific details for each selected category

Supported categories:

- College / University
- School
- Workplace / Office
- Gym
- Neighbourhood

The system supports people who are discoverable in multiple places at once, for example college plus gym plus workplace.

### 3. Search

The platform does not support direct name search as a primary discovery method.

Supported search modes:

- phone number
- structured profile details
- social media handle

Search results intentionally show only relevant context from the search input, not the user’s full stored profile.

### 4. Sending Confessions

Confessions can be sent through:

- profile matching
- phone number
- social handle lookup

When sending a confession:

- first name is required
- last name is optional
- message is required

### 5. Mutual Reveal

When two users have confessed each other:

- the system marks the pair as mutual
- both users can independently submit reveal consent
- once both consent, the anonymous identifier is replaced with the real name
- only the confession-relevant context is shown after reveal, not the entire profile

## Architecture

### Frontend

- Next.js App Router
- React 19
- Tailwind CSS 4
- Framer Motion
- responsive dashboard UI with mobile drawer navigation

### Backend

- Next.js route handlers under `src/app/api`
- JWT cookie-based session auth
- Prisma ORM
- Neon PostgreSQL

### Integrations

- 2factor.in for OTP delivery
- Razorpay integration points for paid unlock flows

## Technology Stack

- Next.js 16.2.1
- React 19
- TypeScript
- Prisma
- PostgreSQL
- Neon
- Tailwind CSS 4
- Framer Motion
- JWT
- bcryptjs
- 2factor.in
- Razorpay

## Repository Structure

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

Important directories:

- [`src/app/api`](/C:/Users/shish/Desktop/iConfess/src/app/api): backend route handlers
- [`src/app/auth`](/C:/Users/shish/Desktop/iConfess/src/app/auth): public auth pages
- [`src/app/dashboard`](/C:/Users/shish/Desktop/iConfess/src/app/dashboard): authenticated product UI
- [`src/components`](/C:/Users/shish/Desktop/iConfess/src/components): reusable UI components
- [`src/lib`](/C:/Users/shish/Desktop/iConfess/src/lib): auth helpers, matching logic, Prisma client, utilities
- [`prisma/schema.prisma`](/C:/Users/shish/Desktop/iConfess/prisma/schema.prisma): database schema

## Data Model Overview

The core schema includes:

- `User`
- `Confession`
- `UnlockedCard`
- `UnlockedProfileInsight`
- `OtpSession`
- category-specific profile tables:
  - `CollegeProfile`
  - `SchoolProfile`
  - `WorkplaceProfile`
  - `GymProfile`
  - `NeighbourhoodProfile`

The app uses PostgreSQL via Prisma with:

- `DATABASE_URL` for pooled runtime access
- `DIRECT_URL` for direct database access during schema operations

## Environment Variables

Create a local `.env` file with at least the following values:

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

- `DATABASE_URL` should use the pooled Neon connection string.
- `DIRECT_URL` should use the direct Neon connection string.
- `OTP_DELIVERY_MODE` supports `sms`, `voice`, and `mock`.
- `NA Handle` is accepted for social handles and normalized as unavailable.

## Local Development

Install dependencies:

```bash
npm install
```

Generate Prisma Client:

```bash
npx prisma generate
```

Sync the schema to the configured database:

```bash
npx prisma db push
```

Start the development server:

```bash
npm run dev
```

Local default URL:

```text
http://localhost:3000
```

## Production Deployment

The application is intended to run on Vercel with Neon PostgreSQL.

### Recommended Production Setup

1. Provision a Neon PostgreSQL database.
2. Configure the following environment variables in Vercel:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `TWOFACTOR_API_KEY`
   - `OTP_DELIVERY_MODE`
   - Razorpay keys, if monetization is enabled
3. Deploy the application.
4. Sync schema changes to the target database.

### Why PostgreSQL

The project originally used a local SQLite-style development setup, which is not appropriate for production serverless environments. PostgreSQL provides:

- durable hosted storage
- concurrent access safety
- production-grade operational support
- compatibility with Neon and Prisma in a serverless deployment model

## Prisma Commands

Useful commands:

```bash
npx prisma generate
npx prisma db push
npx prisma studio
```

If you later standardize on migration-driven deploys:

```bash
npx prisma migrate dev
npx prisma migrate deploy
```

## Current Business Rules

- Gender is required at signup and cannot be edited later.
- Direct name search is not supported.
- First name is required when sending a confession.
- Last name is optional when sending a confession.
- Username and social handles must remain unique.
- Search insight unlocks do not expose full confession content.
- Identity reveal only happens after mutual confession plus explicit consent from both users.

## Important Internal Modules

Matching logic:

- [`src/lib/matching.ts`](/C:/Users/shish/Desktop/iConfess/src/lib/matching.ts)

Profile category synchronization:

- [`src/lib/profile-details.ts`](/C:/Users/shish/Desktop/iConfess/src/lib/profile-details.ts)

Auth/session helpers:

- [`src/lib/auth.ts`](/C:/Users/shish/Desktop/iConfess/src/lib/auth.ts)

Confession send flow:

- [`src/app/api/confessions/send/route.ts`](/C:/Users/shish/Desktop/iConfess/src/app/api/confessions/send/route.ts)

Mutual reveal flow:

- [`src/app/api/confessions/reveal-consent/route.ts`](/C:/Users/shish/Desktop/iConfess/src/app/api/confessions/reveal-consent/route.ts)

## Build And Verification

Run a production build:

```bash
npm run build
```

Start the production server locally:

```bash
npm run start
```

## Security Notes

- Never commit production secrets.
- Rotate any credential that has been pasted into logs, screenshots, chats, or shared documents.
- Use a strong `JWT_SECRET` in production.
- Keep database credentials only in deployment environment variables.
- Use hosted PostgreSQL, not local file-backed storage, in production.

## Roadmap / Future Work

- full Razorpay payment verification
- stronger production observability and alerting
- dedicated change-phone verification flow
- improved auditability for paid unlock events
- migration-history cleanup and standardization

## License

This repository is currently private/internal unless a separate license is explicitly added.
