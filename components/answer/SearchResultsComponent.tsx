import { useState, useEffect } from 'react';

export interface SearchResult {
    favicon: string;
    link: string;
    title: string;
    snippet?: string;
}

export interface SearchResultsComponentProps {
    searchResults: SearchResult[];
}

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
);

const SearchResultsComponent = ({ searchResults }: { searchResults: SearchResult[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loadedFavicons, setLoadedFavicons] = useState<boolean[]>([]);
    const [faviconErrors, setFaviconErrors] = useState<boolean[]>([]);

    useEffect(() => {
        setLoadedFavicons(Array(searchResults.length).fill(false));
        setFaviconErrors(Array(searchResults.length).fill(false));
    }, [searchResults]);

    const toggleExpansion = () => setIsExpanded(!isExpanded);
    const visibleResults = isExpanded ? searchResults : searchResults.slice(0, 3);

    const handleFaviconLoad = (index: number) => {
        setLoadedFavicons(prev => { const u = [...prev]; u[index] = true; return u; });
    };
    const handleFaviconError = (index: number) => {
        setFaviconErrors(prev => { const u = [...prev]; u[index] = true; return u; });
    };

    const SearchResultsSkeleton = () => (
        <>
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="p-2 w-full sm:w-1/2 md:w-1/4">
                    <div className="flex items-center space-x-2 dark:bg-slate-700 bg-gray-100 p-3 rounded-lg h-full">
                        <div className="w-5 h-5 dark:bg-slate-600 bg-gray-400 rounded animate-pulse flex-shrink-0"></div>
                        <div className="w-full h-4 dark:bg-slate-600 bg-gray-400 rounded animate-pulse"></div>
                    </div>
                </div>
            ))}
        </>
    );

    return (
        <div className="dark:bg-slate-800 bg-white shadow-lg rounded-lg p-4 mt-4">
            <div className="flex items-center">
                <h2 className="text-lg font-semibold flex-grow dark:text-white text-black">Sources</h2>
                <img src="./brave.png" alt="brave logo" className="w-6 h-6" />
            </div>
            <div className="flex flex-wrap my-2">
                {searchResults.length === 0 ? (
                    <SearchResultsSkeleton />
                ) : (
                    visibleResults.map((result, index) => (
                        <div key={index} className="p-2 w-full sm:w-1/2 md:w-1/4">
                            <div className="flex items-start space-x-2 dark:bg-slate-700 bg-gray-100 p-3 rounded-lg h-full">
                                <div className="flex-shrink-0 mt-0.5">
                                    {faviconErrors[index] ? (
                                        <GlobeIcon />
                                    ) : (
                                        <>
                                            {!loadedFavicons[index] && (
                                                <div className="w-5 h-5 dark:bg-slate-600 bg-gray-400 rounded animate-pulse"></div>
                                            )}
                                            <img
                                                src={result.favicon}
                                                alt="favicon"
                                                className={`w-5 h-5 ${loadedFavicons[index] ? 'block' : 'hidden'}`}
                                                onLoad={() => handleFaviconLoad(index)}
                                                onError={() => handleFaviconError(index)}
                                            />
                                        </>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold truncate block dark:text-gray-200 dark:hover:text-white text-gray-700 hover:text-black">
                                        {result.title}
                                    </a>
                                    {result.snippet && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{result.snippet}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div className="w-full sm:w-full md:w-1/4 p-2">
                    <div
                        onClick={toggleExpansion}
                        className="flex items-center space-x-2 dark:bg-slate-700 bg-gray-100 p-3 rounded-lg cursor-pointer h-12 justify-center transition-all duration-200 hover:bg-gray-200 dark:hover:bg-slate-600"
                    >
                        {!isExpanded ? (
                            <>
                                {searchResults.slice(0, 3).map((result, index) => (
                                    faviconErrors[index]
                                        ? <GlobeIcon key={index} />
                                        : <img key={index} src={result.favicon} alt="favicon" className="w-4 h-4" onError={() => handleFaviconError(index)} />
                                ))}
                                <span className="text-sm font-semibold dark:text-gray-200 text-gray-700">View more</span>
                            </>
                        ) : (
                            <span className="text-sm font-semibold dark:text-gray-200 text-gray-700">Show Less</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResultsComponent;
