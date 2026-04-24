## LLM Answer Engine
![per](https://github.com/user-attachments/assets/03b5ba8d-7149-4ee1-8c03-a10a8e842d18)

## Project Overview

An advanced Answer Engine powered by Groq (Mixtral-8x7b), Brave Search, and Serper — built on Next.js 14 with the Vercel AI SDK. Delivers immediate LLM answers backed by live search results, images, videos, maps, stock charts, Spotify tracks, and shopping results. Supports file upload RAG, @mention tool routing, Upstash rate limiting, and semantic caching.

![image](https://github.com/user-attachments/assets/6f6d7c39-6890-4d3c-b915-9575fb81110f)

## Features

- **Instant LLM answers** — Groq streams a response immediately after Brave/Serper fetch (no page scraping delay)
- **Web search** — Brave Search API with automatic 429 retry (exponential backoff)
- **Images & Videos** — Serper image/video results with accessible modals (Escape to close)
- **Follow-up questions** — AI-generated follow-up suggestions
- **@mention tool routing** — type `@` to pick a specialised tool:
  - `@searchSong <query>` — Spotify track embed via client_credentials OAuth
  - `@goShopping <query>` — Product cards with star ratings (Serper Shopping API)
  - `@searchPlaces <query>` — Interactive Leaflet map + place list (Serper Places API)
  - `@getTickers <ticker>` — Live TradingView chart embed (no API key required)
- **File upload RAG** — attach `.txt`, `.pdf`, `.js`, `.tsx` files; content is included in LLM context
- **Rate limiting** — Upstash Redis sliding window (10 req / 10 min per IP), shows modal when exceeded
- **Semantic cache** — Upstash Vector deduplicates identical/similar queries (optional)
- **Dark mode** — full dark/light theme support
- **Copy to clipboard** — one-click copy on LLM responses with toast confirmation

## Technologies Used

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| AI streaming | Vercel AI SDK v3 (`ai/rsc`) |
| LLM | Groq — Mixtral-8x7b-32768 |
| Embeddings | OpenAI `text-embedding-3-small` |
| Search | Brave Search API |
| Media / Places / Shopping | Serper API |
| Music | Spotify Web API |
| Stock charts | TradingView widget (`tv.js`) |
| Maps | Leaflet + OpenStreetMap |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Semantic cache | Upstash Vector (`@upstash/semantic-cache`) |
| RAG | LangChain (splitter + MemoryVectorStore) |
| HTML parsing | Cheerio |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys (see table below)

### Required API Keys

| Key | Where to get it | Required? |
|---|---|---|
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/signup) | Yes (embeddings) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/) | Yes |
| `BRAVE_SEARCH_API_KEY` | [brave.com/search/api](https://brave.com/search/api/) | Yes |
| `SERPER_API` | [serper.dev](https://serper.dev/) | Yes |
| `SPOTIFY_CLIENT_ID` | [developer.spotify.com](https://developer.spotify.com/dashboard) | For `@searchSong` |
| `SPOTIFY_CLIENT_SECRET` | Same dashboard | For `@searchSong` |
| `UPSTASH_REDIS_REST_URL` | [console.upstash.com](https://console.upstash.com/) | For rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Same console | For rate limiting |

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/mohankocherlakota/answer-engine-llm.git
    cd answer-engine-llm
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the root:
    ```plaintext
    OPENAI_API_KEY=your_openai_api_key
    GROQ_API_KEY=your_groq_api_key
    BRAVE_SEARCH_API_KEY=your_brave_search_api_key
    SERPER_API=your_serper_api_key

    # Optional — enables @searchSong tool
    SPOTIFY_CLIENT_ID=your_spotify_client_id
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

    # Optional — enables rate limiting and semantic cache
    UPSTASH_REDIS_REST_URL=your_upstash_redis_url
    UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
    ```

### Feature Flags (`app/config.tsx`)

```typescript
useOllamaInference: false,     // use local Ollama instead of Groq
useOllamaEmbeddings: false,    // use local Ollama embeddings
useFunctionCalling: true,      // enable @mention tool routing
useRateLimiting: false,        // requires Upstash Redis env vars
useSemanticCache: false,       // requires Upstash Redis env vars
searchProvider: 'brave',       // 'brave' | 'serper' | 'google'
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## @mention Tool Usage

Type `@` in the chat input to open the tool picker:

| Mention | Example | What it does |
|---|---|---|
| `@searchSong` | `@searchSong bohemian rhapsody` | Embeds the top Spotify track result |
| `@goShopping` | `@goShopping standing desk` | Shows product cards with prices and ratings |
| `@searchPlaces` | `@searchPlaces coffee shops in NYC` | Shows an interactive map with markers |
| `@getTickers` | `@getTickers AAPL` | Shows a live TradingView stock chart |

## File Upload

Click the paperclip icon next to the input to attach a file (`.txt`, `.pdf`, `.js`, `.tsx`). The file content is passed to the LLM as additional context for your question.

## Backend + Express API

A standalone Node.js/Express API is in the `express-api/` directory. See `express-api/README.md` for setup.

## License

MIT

## References

1. Developers Digest — [Build a Next.JS Answer Engine](https://www.youtube.com/watch?v=kFC-OWw7G8k)
2. [developersdigest/llm-answer-engine](https://github.com/developersdigest/llm-answer-engine) — upstream project
