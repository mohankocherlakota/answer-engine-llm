'use client';
import { useEffect, useRef } from 'react';

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

interface MapComponentProps {
    places: Place[];
}

const MapComponent = ({ places }: MapComponentProps) => {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapRef.current || places.length === 0) return;

        let map: any;
        let L: any;

        const initMap = async () => {
            L = (await import('leaflet')).default;
            await import('leaflet/dist/leaflet.css' as any);

            // Fix leaflet default marker icon paths
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            const avgLat = places.reduce((s, p) => s + p.lat, 0) / places.length;
            const avgLng = places.reduce((s, p) => s + p.lng, 0) / places.length;

            map = L.map(mapRef.current!).setView([avgLat, avgLng], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(map);

            places.forEach((place) => {
                const popup = `
                    <strong>${place.name}</strong><br/>
                    ${place.category ? `<span>${place.category}</span><br/>` : ''}
                    ${place.rating != null ? `⭐ ${place.rating}` : ''}
                `;
                L.marker([place.lat, place.lng]).addTo(map).bindPopup(popup);
            });
        };

        initMap();
        return () => { if (map) map.remove(); };
    }, [places]);

    return (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 mt-4">
            <div className="flex items-center mb-3">
                <h2 className="text-lg font-semibold flex-grow text-black dark:text-white">Places</h2>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
            </div>
            <div ref={mapRef} className="w-full h-64 rounded-lg z-0" />
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {places.map((place, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{place.name}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                {place.category && <span className="text-xs text-gray-500 dark:text-gray-400">{place.category}</span>}
                                {place.rating != null && <span className="text-xs text-yellow-500">⭐ {place.rating}</span>}
                                {place.phone && <span className="text-xs text-gray-500 dark:text-gray-400">{place.phone}</span>}
                            </div>
                            {place.website && (
                                <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{place.website}</a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MapComponent;
