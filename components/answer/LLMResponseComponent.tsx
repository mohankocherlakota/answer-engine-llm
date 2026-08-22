'use client';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { useToast } from '@/components/ui/use-toast';

interface LLMResponseComponentProps {
    llmResponse: string;
    currentLlmResponse: string;
    index: number;
}

const markdownComponents = {
    code({ className, children, ...props }: any) {
        const isBlock = !props.inline;
        if (isBlock) {
            return (
                <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto my-3 text-sm">
                    <code className={className}>{children}</code>
                </pre>
            );
        }
        return (
            <code className="bg-zinc-800 text-green-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
            </code>
        );
    },
    a({ href, children, ...props }: any) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" {...props}>
                {children}
            </a>
        );
    },
};

const StreamingComponent = ({ currentLlmResponse }: { currentLlmResponse: string }) => {
    return (
        <>
            {currentLlmResponse && (
                <div className="dark:bg-slate-800 bg-white shadow-lg rounded-lg p-4 mt-4">
                    <div className="flex items-center">
                        <h2 className="text-lg font-semibold flex-grow dark:text-white text-black">Answer</h2>
                        <img src="./groq.png" alt="groq logo" className='w-6 h-6' />
                    </div>
                    <div className="dark:text-gray-300 text-gray-800">{currentLlmResponse}</div>
                </div>
            )}
        </>
    );
};

const LLMResponseComponent = ({ llmResponse, currentLlmResponse, index }: LLMResponseComponentProps) => {
    const hasLlmResponse = llmResponse && llmResponse.trim().length > 0;
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(llmResponse);
            setCopied(true);
            toast({ description: 'Copied to clipboard!' });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({ description: 'Failed to copy', variant: 'destructive' });
        }
    };

    return (
        <>
            {hasLlmResponse ? (
                <div className="dark:bg-slate-800 bg-white shadow-lg rounded-lg p-4 mt-4">
                    <div className="flex items-center mb-1">
                        <h2 className="text-lg font-semibold flex-grow dark:text-white text-black">Answer</h2>
                        <button
                            onClick={handleCopy}
                            aria-label="Copy answer"
                            className="mr-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600"
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <img src="./mistral.png" alt="mistral logo" className='w-6 h-6 mr-2' />
                        <img src="./groq.png" alt="groq logo" className='w-6 h-6' />
                    </div>
                    <div className="dark:text-gray-300 text-gray-800 prose dark:prose-invert max-w-none">
                        <Markdown components={markdownComponents}>{llmResponse}</Markdown>
                    </div>
                </div>
            ) : (
                <StreamingComponent currentLlmResponse={currentLlmResponse} />
            )}
        </>
    );
};

export default LLMResponseComponent;
