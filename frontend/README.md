This frontend is a [Next.js 14](https://nextjs.org) App Router project configured for TypeScript, RTL layouts, and authentication against the companion FastAPI backend.

## Prerequisites

- Node.js 18+
- npm (bundled with Node) or your preferred package manager

## Setup

Install dependencies:

```bash
npm install
```

Download the Vercel Geist fonts (optional, provides the intended typography):

```bash
npm run setup:fonts
```

> The fonts are fetched from the public Vercel repository at runtime so that we can avoid committing binary assets to the repository. If you skip this step, the UI falls back to system-friendly fonts automatically.

Create a `.env.local` file (see `.env.example` for the expected variables) and populate it with your backend URLs and secrets.

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` – start the Next.js development server
- `npm run lint` – run ESLint
- `npm run setup:fonts` – download the Geist Sans and Geist Mono font files locally

## Authentication Overview

The frontend delegates authentication to the FastAPI backend using httpOnly cookies. Custom API route proxies under `app/api/auth/*` forward credentials and session data, while middleware protects the `/dashboard` routes. Client hooks in `hooks/` expose the current user and authentication helpers for React components.
