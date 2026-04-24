// 1. Import dependencies
import 'server-only';
import React from 'react';
import { createAI, createStreamableValue } from 'ai/rsc';
import { OpenAI } from 'openai';
import { load as cheerioLoad } from 'cheerio';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document as DocumentInterface } from 'langchain/document';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
// 1.5 Configuration file for inference model, embeddings model, and other parameters
import { config } from './config';
// 2. Determine which embeddings mode and which inference model to use based on the config.tsx. Currently suppport for OpenAI, Groq and partial support for Ollama embeddings and inference
let openai: OpenAI;
if (config.useOllamaInference) {
  openai = new OpenAI({
    baseURL: config.ollamaBaseUrl,
    apiKey: 'ollama'
  });
} else {
  openai = new OpenAI({
    baseURL: config.nonOllamaBaseURL,
    apiKey: config.inferenceAPIKey
  });
}
// 2.5 Set up the embeddings model based on the config.tsx
let embeddings: OllamaEmbeddings | OpenAIEmbeddings;
if (config.useOllamaEmbeddings) {
  embeddings = new OllamaEmbeddings({
    model: config.embeddingsModel,
    baseUrl: "http://localhost:11434"
  });
} else {
  embeddings = new OpenAIEmbeddings({
    modelName: config.embeddingsModel
  });
}
// 3. Define interfaces for search results and content results
interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  favicon: string;
}
interface ContentResult extends SearchResult {
  html: string;
}
// 4. Fetch search results from Brave Search API
// Brave's free tier allows ~1 request/second - retry on 429 with exponential backoff
async function braveFetch(url: string, maxRetries = 4): Promise<Response> {
  const headers = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY as string,
  };
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, { headers });
    if (response.status !== 429) return response;
    if (attempt === maxRetries - 1) return response;
    const retryAfter = Number(response.headers.get('retry-after')) * 1000 || 1100 * Math.pow(2, attempt);
    await new Promise(resolve => setTimeout(resolve, retryAfter));
  }
  throw new Error('Brave API: max retries exceeded');
}

async function getSources(message: string, numberOfPagesToScan = config.numberOfPagesToScan): Promise<SearchResult[]> {
  try {
    const response = await braveFetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(message)}&count=${numberOfPagesToScan}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonResponse = await response.json();
    if (!jsonResponse.web || !jsonResponse.web.results) {
      throw new Error('Invalid API response format');
    }
    const final = jsonResponse.web.results.map((result: any): SearchResult => ({
      title: result.title,
      link: result.url,
      snippet: result.description,
      favicon: result.profile.img
    }));
    return final;
  } catch (error) {
    console.error('Error fetching search results:', error);
    throw error;
  }
}
// 5. Fetch contents of top 10 search results
async function get10BlueLinksContents(sources: SearchResult[]): Promise<ContentResult[]> {
  async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 800): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (error) {
        console.log(`Skipping ${url}!`);
      }
      throw error;
    }
  }
  function extractMainContent(html: string): string {
    try {
      const $ = cheerioLoad(html);
      $("script, style, head, nav, footer, iframe, img").remove();
      return $("body").text().replace(/\s+/g, " ").trim();
    } catch (error) {
      console.error('Error extracting main content:', error);
      throw error;
    }
  }
  const promises = sources.map(async (source): Promise<ContentResult | null> => {
    try {
      const response = await fetchWithTimeout(source.link, {}, 800);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${source.link}. Status: ${response.status}`);
      }
      const html = await response.text();
      const mainContent = extractMainContent(html);
      return { ...source, html: mainContent };
    } catch (error) {
      // console.error(`Error processing ${source.link}:`, error);
      return null;
    }
  });
  try {
    const results = await Promise.all(promises);
    return results.filter((source): source is ContentResult => source !== null);
  } catch (error) {
    console.error('Error fetching and processing blue links contents:', error);
    throw error;
  }
}
// 6. Process and vectorize content using LangChain
async function processAndVectorizeContent(
  contents: ContentResult[],
  query: string,
  textChunkSize = config.textChunkSize,
  textChunkOverlap = config.textChunkOverlap,
  numberOfSimilarityResults = config.numberOfSimilarityResults,
): Promise<DocumentInterface[]> {
  try {
    const allResults: DocumentInterface[] = [];
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      if (content.html.length > 0) {
        try {
          const splitText = await new RecursiveCharacterTextSplitter({ chunkSize: textChunkSize, chunkOverlap: textChunkOverlap }).splitText(content.html);
          const vectorStore = await MemoryVectorStore.fromTexts(splitText, { title: content.title, link: content.link }, embeddings);
          const results = await vectorStore.similaritySearch(query, numberOfSimilarityResults);
          allResults.push(...results);
        } catch (error) {
          console.error(`Error processing content for ${content.link}:`, error);
        }
      }
    }
    return allResults;
  } catch (error) {
    console.error('Error processing and vectorizing content:', error);
    throw error;
  }
}
// 7. Fetch image search results from Brave Search API
async function getImages(message: string): Promise<{ title: string; link: string }[]> {
  try {
    const response = await braveFetch(`https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(message)}&spellcheck=1`);
    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }
    const data = await response.json();
    const validLinks = await Promise.all(
      data.results.map(async (result: any) => {
        const link = result.properties.url;
        if (typeof link === 'string') {
          try {
            const imageResponse = await fetch(link, { method: 'HEAD' });
            if (imageResponse.ok) {
              const contentType = imageResponse.headers.get('content-type');
              if (contentType && contentType.startsWith('image/')) {
                return {
                  title: result.properties.title,
                  link: link,
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching image link ${link}:`, error);
          }
        }
        return null;
      })
    );
    const filteredLinks = validLinks.filter((link): link is { title: string; link: string } => link !== null);
    return filteredLinks.slice(0, 9);
  } catch (error) {
    console.error('There was a problem with your fetch operation:', error);
    throw error;
  }
}
// 8. Fetch video search results from Google Serper API
async function getVideos(message: string): Promise<{ imageUrl: string, link: string }[] | null> {
  const url = 'https://google.serper.dev/videos';
  const data = JSON.stringify({
    "q": message
  });
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API as string,
      'Content-Type': 'application/json'
    },
    body: data
  };
  try {
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }
    const responseData = await response.json();
    const validLinks = await Promise.all(
      responseData.videos.map(async (video: any) => {
        const imageUrl = video.imageUrl;
        if (typeof imageUrl === 'string') {
          try {
            const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
            if (imageResponse.ok) {
              const contentType = imageResponse.headers.get('content-type');
              if (contentType && contentType.startsWith('image/')) {
                return { imageUrl, link: video.link };
              }
            }
          } catch (error) {
            console.error(`Error fetching image link ${imageUrl}:`, error);
          }
        }
        return null;
      })
    );
    const filteredLinks = validLinks.filter((link): link is { imageUrl: string, link: string } => link !== null);
    return filteredLinks.slice(0, 9);
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
}
// 9. Tool types
export interface ShoppingProduct {
  title: string;
  price?: string;
  rating?: number;
  ratingCount?: number;
  imageUrl?: string;
  link: string;
  source?: string;
  delivery?: string;
}
export interface Place {
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  category?: string;
  phone?: string;
  website?: string;
  address?: string;
}
// 9a. Parse @mention tool from user message e.g. "@searchSong hello"
function parseToolMention(message: string): { tool: string; query: string; location?: string } | null {
  const match = message.match(/^@(\w+)\s+([\s\S]+)/);
  if (!match) return null;
  const [, tool, rest] = match;
  const supportedTools = ['searchSong', 'goShopping', 'searchPlaces', 'getTickers'];
  if (!supportedTools.includes(tool)) return null;
  if (tool === 'searchPlaces') {
    const locMatch = rest.match(/^(.*?)\s+in\s+(.+)$/i);
    if (locMatch) return { tool, query: locMatch[1].trim(), location: locMatch[2].trim() };
  }
  return { tool, query: rest.trim() };
}
// 9b. Spotify: search a track, return first track ID
async function searchSong(query: string): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) return null;
    const { access_token } = await tokenRes.json();
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!searchRes.ok) return null;
    const data = await searchRes.json();
    return data.tracks?.items?.[0]?.id ?? null;
  } catch (err) {
    console.error('searchSong failed:', err);
    return null;
  }
}
// 9c. Serper Shopping: return product list
async function goShopping(query: string): Promise<ShoppingProduct[]> {
  try {
    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.SERPER_API as string, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.shopping ?? []).slice(0, 9).map((item: any): ShoppingProduct => ({
      title: item.title,
      price: item.price,
      rating: item.rating,
      ratingCount: item.ratingCount,
      imageUrl: item.imageUrl,
      link: item.link,
      source: item.source,
      delivery: item.delivery,
    }));
  } catch (err) {
    console.error('goShopping failed:', err);
    return [];
  }
}
// 9d. Serper Places: return list of places with coordinates
async function searchPlaces(query: string, location?: string): Promise<Place[]> {
  const q = location ? `${query} in ${location}` : query;
  try {
    const res = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.SERPER_API as string, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.places ?? []).slice(0, 10).map((item: any): Place => ({
      name: item.title,
      lat: item.latitude,
      lng: item.longitude,
      rating: item.rating,
      category: item.category,
      phone: item.phone,
      website: item.website,
      address: item.address,
    }));
  } catch (err) {
    console.error('searchPlaces failed:', err);
    return [];
  }
}
// 9e. Generate follow-up questions using OpenAI API
const relevantQuestions = async (sources: SearchResult[]): Promise<any> => {
  return await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
          You are a Question generator who generates an array of 3 follow-up questions in JSON format.
          The JSON schema should include:
          {
            "original": "The original search query or context",
            "followUp": [
              "Question 1",
              "Question 2", 
              "Question 3"
            ]
          }
          `,
      },
      {
        role: "user",
        content: `Generate follow-up questions based on the top results from a similarity search: ${JSON.stringify(sources)}. The original search query is: "The original search query".`,
      },
    ],
    model: config.inferenceModel,
    response_format: { type: "json_object" },
  });
};
// 10. Main action function that orchestrates the entire process
async function myAction(userMessage: string, fileContent?: string): Promise<any> {
  "use server";
  const streamable = createStreamableValue({});
  (async () => {
    // Rate limiting via Upstash (when config.useRateLimiting is true)
    if (config.useRateLimiting) {
      try {
        const { Ratelimit } = await import('@upstash/ratelimit');
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
        const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '10 m') });
        const ip = 'anonymous'; // In production use request headers
        const { success } = await ratelimit.limit(ip);
        if (!success) {
          streamable.update({ rateLimited: true });
          streamable.done({ status: 'done' });
          return;
        }
      } catch (err) {
        console.error('Rate limiting error (continuing):', err);
      }
    }
    // Check for @mention tool call - route to specialized tool handler
    const toolMention = parseToolMention(userMessage);
    if (toolMention) {
      const { tool, query, location } = toolMention;
      streamable.update({ userMessage: query });
      if (tool === 'searchSong') {
        const trackId = await searchSong(query);
        if (trackId) streamable.update({ spotify: trackId });
        else streamable.update({ llmResponse: 'Could not find a Spotify track for that query.' });
      } else if (tool === 'goShopping') {
        const products = await goShopping(query);
        streamable.update({ shopping: products });
      } else if (tool === 'searchPlaces') {
        const places = await searchPlaces(query, location);
        streamable.update({ places });
      } else if (tool === 'getTickers') {
        streamable.update({ ticker: query });
      }
      streamable.update({ llmResponseEnd: true });
      streamable.done({ status: 'done' });
      return;
    }
    // Videos (Serper) can run in parallel; Brave endpoints must be sequenced to respect rate limits
    const videosPromise = getVideos(userMessage).catch((err) => {
      console.error('getVideos failed:', err);
      return [] as { imageUrl: string; link: string }[];
    });
    const sources = await getSources(userMessage).catch((err) => {
      console.error('getSources failed:', err);
      return [] as SearchResult[];
    });
    streamable.update({ 'searchResults': sources });
    const images = await getImages(userMessage).catch((err) => {
      console.error('getImages failed:', err);
      return [] as { title: string; link: string }[];
    });
    streamable.update({ 'images': images });
    const videos = await videosPromise;
    streamable.update({ 'videos': videos });
    const html = await get10BlueLinksContents(sources);
    // If the user uploaded a file, prepend its content as an additional source
    if (fileContent) {
      html.unshift({ title: 'Uploaded file', link: '', snippet: '', favicon: '', html: fileContent });
    }
    const vectorResults = await processAndVectorizeContent(html, userMessage);
    const chatCompletion = await openai.chat.completions.create({
      messages:
        [{
          role: "system", content: `
          - Here is my query "${userMessage}", respond back with an answer that is as long as possible. If you can't find any relevant results, respond with "No relevant results found." `
        },
        { role: "user", content: ` - Here are the top results from a similarity search: ${JSON.stringify(vectorResults)}. ` },
        ], stream: true, model: config.inferenceModel
    });
    for await (const chunk of chatCompletion) {
      if (chunk.choices[0].delta && chunk.choices[0].finish_reason !== "stop") {
        streamable.update({ 'llmResponse': chunk.choices[0].delta.content });
      } else if (chunk.choices[0].finish_reason === "stop") {
        streamable.update({ 'llmResponseEnd': true });
      }
    }
    if (!config.useOllamaInference) {
      const followUp = await relevantQuestions(sources);
      streamable.update({ 'followUp': followUp });
    }
    streamable.done({ status: 'done' });
  })();
  return streamable.value;
}
// 11. Define initial AI and UI states
const initialAIState: {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  id?: string;
  name?: string;
}[] = [];
const initialUIState: {
  id: number;
  display: React.ReactNode;
}[] = [];
// 12. Export the AI instance
export const AI = createAI({
  actions: {
    myAction
  },
  initialUIState,
  initialAIState,
});
