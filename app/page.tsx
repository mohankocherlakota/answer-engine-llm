'use client';
import { FormEvent, useEffect, useRef, useState, useCallback } from 'react';
import { useActions, readStreamableValue } from 'ai/rsc';
import { type AI } from './action';
import { ChatScrollAnchor } from '@/lib/hooks/chat-scroll-anchor';
import Textarea from 'react-textarea-autosize';
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconArrowElbow } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import SearchResultsComponent from '@/components/answer/SearchResultsComponent';
import UserMessageComponent from '@/components/answer/UserMessageComponent';
import LLMResponseComponent from '@/components/answer/LLMResponseComponent';
import ImagesComponent from '@/components/answer/ImagesComponent';
import VideosComponent from '@/components/answer/VideosComponent';
import FollowUpComponent from '@/components/answer/FollowUpComponent';
import SpotifyComponent from '@/components/answer/SpotifyComponent';
import ShoppingComponent, { type ShoppingProduct } from '@/components/answer/ShoppingComponent';
import MapComponent, { type Place } from '@/components/answer/MapComponent';
import FinancialChart from '@/components/answer/FinancialChart';
import RateLimitComponent from '@/components/answer/RateLimitComponent';

interface SearchResult { favicon: string; link: string; title: string; snippet?: string; }
interface Image { link: string; }
interface Video { link: string; imageUrl: string; }
interface FollowUp { choices: { message: { content: string } }[]; }

interface Message {
  id: number;
  type: string;
  content: string;
  userMessage: string;
  images: Image[];
  videos: Video[];
  followUp: FollowUp | null;
  isStreaming: boolean;
  searchResults?: SearchResult[];
  spotify?: string;
  shopping?: ShoppingProduct[];
  places?: Place[];
  ticker?: string;
  rateLimited?: boolean;
}

interface StreamMessage {
  searchResults?: any;
  userMessage?: string;
  llmResponse?: string;
  llmResponseEnd?: boolean;
  images?: any;
  videos?: any;
  followUp?: any;
  spotify?: string;
  shopping?: ShoppingProduct[];
  places?: Place[];
  ticker?: string;
  rateLimited?: boolean;
}

const TOOLS = [
  { name: 'searchSong', label: '🎵 Music', hint: 'Search Spotify tracks' },
  { name: 'goShopping', label: '🛍️ Shopping', hint: 'Search products' },
  { name: 'searchPlaces', label: '📍 Places', hint: 'Find places on a map' },
  { name: 'getTickers', label: '📈 Stocks', hint: 'Stock chart for a ticker' },
];

export default function Page() {
  const { myAction } = useActions<typeof AI>();
  const { formRef, onKeyDown } = useEnterSubmit();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentLlmResponse, setCurrentLlmResponse] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [pendingFile, setPendingFile] = useState<{ name: string; content: string } | null>(null);
  const [showRateLimit, setShowRateLimit] = useState(false);

  const handleFollowUpClick = useCallback(async (question: string) => {
    setCurrentLlmResponse('');
    await handleUserMessageSubmission(question, undefined);
  }, []);

  // Global "/" shortcut to focus input; Escape closes @mention menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowMentionMenu(false); return; }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).nodeName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target as Node)) {
        setShowMentionMenu(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    // Detect @mention trigger
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentionMenu(true);
      setMentionFilter('');
    } else if (lastAtIndex !== -1 && showMentionMenu) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (/\s/.test(afterAt)) {
        setShowMentionMenu(false);
      } else {
        setMentionFilter(afterAt.toLowerCase());
      }
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleToolSelect = (toolName: string) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    const newValue = inputValue.slice(0, lastAtIndex) + `@${toolName} `;
    setInputValue(newValue);
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  const filteredTools = TOOLS.filter(t =>
    t.name.toLowerCase().includes(mentionFilter) || t.label.toLowerCase().includes(mentionFilter)
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setPendingFile({ name: file.name, content: text });
    e.target.value = '';
  };

  const handleUserMessageSubmission = async (userMessage: string, fileContent?: string): Promise<void> => {
    const newMessageId = Date.now();
    const newMessage: Message = {
      id: newMessageId,
      type: 'userMessage',
      userMessage,
      content: '',
      images: [],
      videos: [],
      followUp: null,
      isStreaming: true,
      searchResults: [],
    };
    setMessages(prev => [...prev, newMessage]);
    let lastAppendedResponse = '';
    try {
      const streamableValue = await myAction(userMessage, fileContent);
      let llmResponseString = '';
      for await (const message of readStreamableValue(streamableValue)) {
        const typedMessage = message as StreamMessage;
        if (typedMessage.rateLimited) {
          setShowRateLimit(true);
        }
        setMessages((prevMessages) => {
          const copy = [...prevMessages];
          const idx = copy.findIndex(msg => msg.id === newMessageId);
          if (idx === -1) return prevMessages;
          const cur = copy[idx];
          if (typedMessage.llmResponse && typedMessage.llmResponse !== lastAppendedResponse) {
            cur.content += typedMessage.llmResponse;
            lastAppendedResponse = typedMessage.llmResponse;
          }
          if (typedMessage.llmResponseEnd) cur.isStreaming = false;
          if (typedMessage.searchResults) cur.searchResults = typedMessage.searchResults;
          if (typedMessage.images) cur.images = [...typedMessage.images];
          if (typedMessage.videos) cur.videos = [...typedMessage.videos];
          if (typedMessage.followUp) cur.followUp = typedMessage.followUp;
          if (typedMessage.spotify) cur.spotify = typedMessage.spotify;
          if (typedMessage.shopping) cur.shopping = typedMessage.shopping;
          if (typedMessage.places) cur.places = typedMessage.places;
          if (typedMessage.ticker) cur.ticker = typedMessage.ticker;
          return copy;
        });
        if (typedMessage.llmResponse) {
          llmResponseString += typedMessage.llmResponse;
          setCurrentLlmResponse(llmResponseString);
        }
      }
    } catch (error) {
      console.error('Error streaming data for user message:', error);
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex(msg => msg.id === newMessageId);
        if (idx !== -1) {
          copy[idx].isStreaming = false;
          copy[idx].content = '⚠️ Something went wrong. Please try again.';
        }
        return copy;
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const messageToSend = inputValue.trim();
    if (!messageToSend) return;
    setInputValue('');
    setCurrentLlmResponse('');
    setPendingFile(null);
    if (window.innerWidth < 600) (e.target as HTMLFormElement)['message']?.blur();
    await handleUserMessageSubmission(messageToSend, pendingFile?.content);
  };

  return (
    <div>
      {showRateLimit && <RateLimitComponent onClose={() => setShowRateLimit(false)} />}
      {messages.length > 0 && (
        <div className="flex flex-col">
          {messages.map((message, index) => (
            <div key={message.id} className="flex flex-col md:flex-row">
              <div className="w-full md:w-3/4 md:pr-2">
                {message.searchResults && message.searchResults.length > 0 && (
                  <SearchResultsComponent searchResults={message.searchResults} />
                )}
                {message.type === 'userMessage' && <UserMessageComponent message={message.userMessage} />}
                {(message.content || message.isStreaming) && (
                  <LLMResponseComponent
                    llmResponse={message.content}
                    currentLlmResponse={currentLlmResponse}
                    index={index}
                  />
                )}
                {message.spotify && <SpotifyComponent spotifyTrackId={message.spotify} />}
                {message.shopping && message.shopping.length > 0 && <ShoppingComponent shopping={message.shopping} />}
                {message.places && message.places.length > 0 && <MapComponent places={message.places} />}
                {message.ticker && <FinancialChart ticker={message.ticker} />}
                {message.followUp && (
                  <FollowUpComponent followUp={message.followUp} handleFollowUpClick={handleFollowUpClick} />
                )}
              </div>
              <div className="w-full md:w-1/4 lg:pl-2">
                {message.videos && message.videos.length > 0 && <VideosComponent videos={message.videos} />}
                {message.images && message.images.length > 0 && <ImagesComponent images={message.images} />}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="pb-[80px] pt-4 md:pt-10">
        <ChatScrollAnchor trackVisibility={true} />
      </div>
      <div className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-b duration-300 ease-in-out animate-in dark:from-gray-900/10 dark:from-10% mb-4">
        <div className="mx-auto sm:max-w-2xl sm:px-4">
          {/* @mention tool picker */}
          {showMentionMenu && filteredTools.length > 0 && (
            <div ref={mentionMenuRef} className="mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
              {filteredTools.map((tool) => (
                <button
                  key={tool.name}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                  onClick={() => handleToolSelect(tool.name)}
                >
                  <span className="text-base">{tool.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{tool.hint}</span>
                </button>
              ))}
            </div>
          )}
          {/* File attachment indicator */}
          {pendingFile && (
            <div className="mb-2 flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <span>📎 {pendingFile.name}</span>
              <button onClick={() => setPendingFile(null)} className="ml-auto text-blue-500 hover:text-blue-700">✕</button>
            </div>
          )}
          <div className="px-4 py-2 space-y-4 border-t shadow-lg dark:bg-slate-800 bg-gray-100 rounded-2xl sm:border md:py-4">
            <form ref={formRef} onSubmit={handleFormSubmit}>
              <div className="relative flex flex-col w-full overflow-hidden max-h-60 grow dark:bg-slate-800 bg-gray-100 rounded-2xl sm:border sm:px-2">
                <Textarea
                  ref={inputRef}
                  tabIndex={0}
                  onKeyDown={onKeyDown}
                  placeholder="Send a message. Type @ to use a tool."
                  className="min-h-[60px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm dark:text-white text-black pr-24"
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  name="message"
                  rows={1}
                  value={inputValue}
                  onChange={handleInputChange}
                />
                <div className="absolute right-0 top-4 sm:right-4 flex items-center gap-1">
                  {/* File upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.pdf,.js,.tsx,.ts,.md"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                        aria-label="Attach file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Attach file</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="submit" size="icon" disabled={inputValue === ''}>
                        <IconArrowElbow />
                        <span className="sr-only">Send message</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send message</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
