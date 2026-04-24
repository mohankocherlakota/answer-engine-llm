'use client';
import { useEffect, useRef } from 'react';

interface FinancialChartProps {
    ticker: string;
}

let tvScriptLoaded = false;

const FinancialChart = ({ ticker }: FinancialChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetId = `tv-widget-${ticker.replace(/[^a-z0-9]/gi, '')}`;

    useEffect(() => {
        if (!containerRef.current) return;

        const initWidget = () => {
            if (!(window as any).TradingView) return;
            new (window as any).TradingView.widget({
                autosize: true,
                symbol: ticker.toUpperCase(),
                interval: 'D',
                timezone: 'UTC',
                theme: 'dark',
                style: '2',
                locale: 'en',
                toolbar_bg: '#1e293b',
                enable_publishing: false,
                allow_symbol_change: true,
                container_id: widgetId,
            });
        };

        if (tvScriptLoaded) {
            initWidget();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => { tvScriptLoaded = true; initWidget(); };
        document.head.appendChild(script);
    }, [ticker, widgetId]);

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4">
            <div className="flex items-center mb-3">
                <h2 className="text-lg font-semibold flex-grow text-black dark:text-white">{ticker.toUpperCase()} Chart</h2>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
            </div>
            <div id={widgetId} ref={containerRef} className="w-full h-64 md:h-96" />
        </div>
    );
};

export default FinancialChart;
