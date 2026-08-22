'use client';

interface RateLimitComponentProps {
    onClose?: () => void;
}

const RateLimitComponent = ({ onClose }: RateLimitComponentProps) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4 text-center">
                <div className="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Rate Limit Reached</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                    You&apos;ve reached the limit of <strong>10 requests per 10 minutes</strong>.
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-xs mb-6">
                    Please wait a moment before trying again. Rate limiting is powered by{' '}
                    <a href="https://upstash.com" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">Upstash</a>.
                </p>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-full py-2 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        </div>
    );
};

export default RateLimitComponent;
