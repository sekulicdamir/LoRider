import React, { useState } from 'react';
import { PRESET_LOCATIONS } from '../constants';
import { GameLocation } from '../types';
import { Car, MapPin, Search, Navigation } from 'lucide-react';

interface MainMenuProps {
  onStart: (location: GameLocation) => void;
  userDistance: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, userDistance }) => {
  const [customAddress, setCustomAddress] = useState('');
  const [loadingGeo, setLoadingGeo] = useState(false);

  const handleGeoLocation = () => {
    setLoadingGeo(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onStart({
            id: 'current-loc',
            name: 'Your Location',
            coords: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
        },
        (err) => {
          alert("Could not get location. Please select a preset.");
          setLoadingGeo(false);
        }
      );
    }
  };

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAddress) return;
    // In a real app, use Geocoding API. Here we mock or just rely on the Game Engine to try finding it later.
    // For this demo, let's just stick to presets or fallback.
    alert("Address search requires a server-side Geocoding key. Please select a preset for this demo.");
  };

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      <div className="relative z-10 w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Car size={40} className="text-black" />
            </div>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter italic">
            LO<span className="text-yellow-500">RIDER</span>
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">
            Infinite Street View Driving
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex justify-between items-center border border-white/10">
            <div>
              <div className="text-xs text-gray-400 uppercase">Total Distance</div>
              <div className="text-xl font-bold text-white">{userDistance.toFixed(1)} km</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase">Rank</div>
              <div className="text-xl font-bold text-yellow-500">ROOKIE</div>
            </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button 
            onClick={handleGeoLocation}
            disabled={loadingGeo}
            className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            {loadingGeo ? 'Locating...' : (
              <>
                <Navigation size={20} />
                DRIVE NEAR ME
              </>
            )}
          </button>

          <div className="text-center text-xs text-gray-500 my-2">- OR CHOOSE LOCATION -</div>

          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {PRESET_LOCATIONS.map((loc) => (
              <button
                key={loc.id}
                onClick={() => onStart(loc)}
                className="group flex items-center gap-3 bg-gray-900/80 p-3 rounded-lg border border-gray-800 hover:border-yellow-500/50 transition-all text-left"
              >
                 <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                    <MapPin size={18} />
                 </div>
                 <div>
                   <div className="font-bold text-white">{loc.name}</div>
                   <div className="text-xs text-gray-500">Popular Route</div>
                 </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};