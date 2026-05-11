# KhmerLesson Dashboard

A full-stack dashboard for managing Khmer learning content, built with Express, Vite, React, Tailwind CSS, and PostgreSQL.

## Prerequisites

- Node.js 18+ / 20+ (recommended)
- npm
- PostgreSQL database

## Clone the repository

```bash
git clone <repo-url>
cd khmerlesson-dashboard
```

## Install dependencies

```bash
npm install
```

## Configure environment variables

Create a `.env` file in the project root and add the required values.

Example `.env`:

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/khmerlesson
API_KEY=your_api_key_here
BASE_URL=http://localhost
PORT=5001
TOKEN_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
```

Make sure PostgreSQL is running and the database referenced by `DATABASE_URL` exists.

## Start the project in development

```bash
npm run dev
```

Then open:

```text
http://localhost:5001
```

This command starts the Express server and uses Vite to serve the React frontend.

## Build and run production mode

```bash
npm run build
npm start
```

## Database setup

If you need to push schema changes or initialize the database using Drizzle, use:

```bash
npm run db:push
```

## Notes

- The development server uses `server/index.ts` as the entrypoint.
- `PORT` is used by the server; the default in this repo is `5001`.
- Keep your `TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` values secure.
