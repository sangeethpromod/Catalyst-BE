# AI Stock Analysis Backend

TypeScript Node.js backend using Express, MongoDB (Mongoose), stubbed BullMQ, and AI agent scaffolding.

## Quick Start

1. Create `.env` from `.env.example` and set `MONGODB_URI` and API keys.
2. Install deps and start dev server.

### Dev

- `npm run dev` starts the server with tsx watcher.
- Server listens on `PORT` (default 4000).

### Primary Endpoint

POST `/api/screener` with JSON:

```json
{ "symbol": "AAPL", "timeframe": "3M" }
```

Response includes analysis persisted in MongoDB.

## Notes

- External API clients (Polygon, Gemini, Perplexity) are stubbed for now.
- FakeQueue is used instead of BullMQ; easy to swap later. This works fine
