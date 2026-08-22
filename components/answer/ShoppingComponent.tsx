'use client';
import { useState } from 'react';

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

interface ShoppingComponentProps {
    shopping: ShoppingProduct[];
}

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <svg key={star} xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
        {rating && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{rating.toFixed(1)}</span>}
    </div>
);

const ShoppingComponent = ({ shopping }: ShoppingComponentProps) => {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? shopping : shopping.slice(0, 3);

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4">
            <div className="flex items-center mb-3">
                <h2 className="text-lg font-semibold flex-grow text-black dark:text-white">Shopping</h2>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
            </div>
            <div className="space-y-3">
                {visible.map((product, index) => (
                    <a
                        key={index}
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.title} className="w-16 h-16 object-contain rounded flex-shrink-0 bg-gray-100 dark:bg-gray-700" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{product.title}</p>
                            {product.price && <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-0.5">{product.price}</p>}
                            {product.rating != null && <StarRating rating={product.rating} />}
                            <div className="flex items-center gap-2 mt-0.5">
                                {product.source && <span className="text-xs text-gray-500 dark:text-gray-400">{product.source}</span>}
                                {product.delivery && <span className="text-xs text-blue-500">{product.delivery}</span>}
                            </div>
                        </div>
                    </a>
                ))}
            </div>
            {shopping.length > 3 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="mt-3 w-full text-sm text-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    {showAll ? 'Show less' : `Show ${shopping.length - 3} more`}
                </button>
            )}
        </div>
    );
};

export default ShoppingComponent;
