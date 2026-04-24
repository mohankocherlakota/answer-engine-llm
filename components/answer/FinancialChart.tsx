'use client';
import { useEffect, useRef } from 'react';

interface FinancialChartProps {
    ticker: string;
}

const FinancialChart = ({ ticker }: FinancialChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !ticker) return;
        containerRef.current.innerHTML = '';

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: ticker.toUpperCase(),
            interval: 'D',
            timezone: 'UTC',
            theme: 'dark',
            style: '2',
            locale: 'en',
            allow_symbol_change: true,
            calendar: false,
            support_host: 'https://www.tradingview.com',
        });

        containerRef.current.appendChild(script);
    }, [ticker]);

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4">
            <div className="flex items-center mb-3">
                <h2 className="text-lg font-semibold flex-grow text-black dark:text-white">{ticker.toUpperCase()} Chart</h2>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
            </div>
            <div className="tradingview-widget-container w-full h-64 md:h-96">
                <div ref={containerRef} className="tradingview-widget-container__widget w-full h-full" />
            </div>
        </div>
    );
};

export default FinancialChart;
