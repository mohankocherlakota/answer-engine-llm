# CLAUDE.md — LLM Answer Engine

## Project Overview
A Perplexity-inspired AI answer engine built with Next.js 14, Groq/Mixtral, Brave Search, Serper, and LangChain.
Users type a query (or use `@mention` tool shortcuts) and get streaming answers, images, videos, and follow-up questions.

## Stack
- **Framework**: Next.js 14.1.2 (App Router, edge runtime on layout)
- **Inference**: Groq Mixtral-8x7b (default) via OpenAI-compatible API — config in `app/config.tsx`
- **Embeddings**: OpenAI `text-embedding-3-small` (default) — config in `app/config.tsx`
- **Search**: Brave Search API (web + images), Serper API (videos, shopping, places)
- **UI**: React 18, Tailwind CSS, Radix UI (shadcn/ui), Leaflet maps, TradingView charts
- **Streaming**: Vercel AI SDK v3 (`ai/rsc` — `createAI`, `createStreamableValue`, `useActions`)
- **Package manager**: npm (NOT bun — Vercel detected this; `.npmrc` has `legacy-peer-deps=true`)

## Key Files
| File | Purpose |
|------|---------|
| `app/action.tsx` | All server actions: search, tool calls, LLM streaming |
| `app/page.tsx` | Main chat UI: @mention menu, file upload, message rendering |
| `app/config.tsx` | Feature flags and model config |
| `app/globals.css` | Global styles + Leaflet CSS import |
| `next.config.js` | Marks cheerio/undici as server external packages (webpack compat) |
| `.npmrc` | `legacy-peer-deps=true` for Vercel CI |

## @mention Tool System
Users type `@` to get a dropdown picker. Four tools:

| Mention | Function | API Used | Component |
|---------|----------|----------|-----------|
| `@searchSong <query>` | `searchSong()` | Spotify Web API | `SpotifyComponent` |
| `@goShopping <query>` | `goShopping()` | Serper Shopping | `ShoppingComponent` |
| `@searchPlaces <query> [in <location>]` | `searchPlaces()` | Serper Places | `MapComponent` |
| `@getTickers <symbol>` | returns ticker string | TradingView (client embed) | `FinancialChart` |

## Feature Flags (`app/config.tsx`)
```ts
useFunctionCalling: true   // enables @mention tools
useRateLimiting: false     // Upstash Redis sliding window (10 req / 10 min)
useSemanticCache: false    // Upstash semantic cache for similar queries
useOllamaInference: false  // use local Ollama model for inference
useOllamaEmbeddings: false // use local Ollama model for embeddings
```

## Required Environment Variables
```
OPENAI_API_KEY          # OpenAI embeddings
GROQ_API_KEY            # Groq inference (Mixtral default)
BRAVE_SEARCH_API_KEY    # Web search + image search
SERPER_API              # Video, shopping, places search
```

## Optional Environment Variables
```
SPOTIFY_CLIENT_ID       # @searchSong tool
SPOTIFY_CLIENT_SECRET   # @searchSong tool
UPSTASH_REDIS_REST_URL  # rate limiting + semantic cache
UPSTASH_REDIS_REST_TOKEN
OLLAMA_BASE_URL         # default: http://localhost:11434/v1
```

## Answer Flow (Normal Query)
1. `getSources()` → Brave web search (snippets + links)
2. `getImages()` → Brave image search (sequential after sources, respects 1 req/s limit)
3. `getVideos()` → Serper videos (parallel)
4. All three stream to UI immediately
5. Groq LLM streams answer using Brave snippets as context (no page scraping — fast)
6. `relevantQuestions()` → 3 follow-up questions streamed last

## Answer Flow (@mention Tool)
1. `parseToolMention(message)` detects `@toolName query`
2. Routes to the matching function (Spotify/Serper/TradingView)
3. Streams result key (`spotify`, `shopping`, `places`, `ticker`) to UI
4. Skips normal search/LLM flow entirely

## File Upload RAG
- Paperclip button in input bar accepts `.txt`, `.pdf`, `.ts`, `.tsx`, `.md`
- File content read client-side, passed as `fileContent` arg to `myAction`
- Appended to snippet context fed to Groq

## Brave API Rate Limiting
`braveFetch()` helper in `action.tsx` retries on 429 with exponential backoff.
Sources and images are called **sequentially** (not parallel) to avoid hitting the 1 req/s limit.

## Known Architectural Notes
- `ai` is pinned to `3.3.44` — v4+ removed `ai/rsc` which the whole app depends on
- `cheerio` marked as `serverComponentsExternalPackages` in `next.config.js` to avoid webpack ESM issue
- `legacy-peer-deps=true` in `.npmrc` resolves `@langchain/community` vs `@vercel/kv` peer conflict
- `'use client'` required on ALL components that use React hooks (SearchResults, Images, Videos, etc.)
- Leaflet CSS imported in `app/globals.css` (not dynamically — won't bundle correctly)
- TradingView chart uses `tv.js` widget API with `onload` callback (not inline script JSON)

## Component Map
```
app/page.tsx               ← main UI shell
components/answer/
  SearchResultsComponent   ← Brave sources with favicons + snippets
  UserMessageComponent     ← user query display
  LLMResponseComponent     ← streaming Groq answer + copy button
  ImagesComponent          ← image grid with modal (Escape to close)
  VideosComponent          ← video thumbnails with YouTube embed (Escape to close)
  FollowUpComponent        ← 3 clickable follow-up questions
  SpotifyComponent         ← Spotify iframe embed
  ShoppingComponent        ← product cards with star ratings
  MapComponent             ← Leaflet map with place markers + sidebar
  FinancialChart           ← TradingView stock chart
  RateLimitComponent       ← modal shown when Upstash rate limit hit
```

## Development Commands
```bash
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint
npm run format       # Prettier format
npx tsc --noEmit     # TypeScript check (note: ai/rsc types show errors — pre-existing, build still works)
```
