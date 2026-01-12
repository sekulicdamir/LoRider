import React from 'react';
import { Share2, MapPin, Navigation } from 'lucide-react';

interface DashboardProps {
  speed: number;
  locationName: string;
  isParked: boolean;
  onParkToggle: () => void;
  onShare: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  speed, 
  locationName, 
  isParked, 
  onParkToggle,
  onShare 
}) => {
  const speedInt = Math.floor(speed);
  
  // Calculate RPM based on speed (simulated)
  const rpm = Math.min(8000, 1000 + (speedInt * 60));
  const rpmPercent = (rpm / 8000) * 100;
  
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-4 z-20">
      
      {/* Top Bar: Location & Social */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/10 text-white max-w-[70%]">
          <div className="flex items-center gap-2 text-xs text-yellow-500 uppercase font-bold tracking-wider">
            <MapPin size={12} />
            <span>Current Location</span>
          </div>
          <div className="text-sm font-medium truncate">{locationName || "Unknown Road"}</div>
        </div>

        <button 
          onClick={onShare}
          className="bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Center: Parking Overlay Indicator */}
      {isParked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
           <button 
            onClick={onParkToggle}
            className="bg-yellow-500 text-black px-8 py-3 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-pulse hover:scale-105 transition-transform"
          >
            RETURN TO CAR
          </button>
          <p className="mt-4 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
            Walk Mode Active
          </p>
        </div>
      )}

      {/* Bottom: Speedometer & Controls */}
      <div className="flex flex-col gap-4 mt-auto">
        
        {/* Speedometer Cluster */}
        <div className="self-end md:self-center flex items-end gap-2 text-white drop-shadow-lg">
          <div className="text-6xl font-black italic tracking-tighter">
            {speedInt}
          </div>
          <div className="text-xl font-bold text-white/70 mb-2">KM/H</div>
        </div>

        {/* RPM Bar */}
        <div className="w-full h-2 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full transition-all duration-100 ease-out"
            style={{ 
              width: `${rpmPercent}%`,
              backgroundColor: rpmPercent > 80 ? '#ef4444' : '#eab308' 
            }}
          />
        </div>

        {/* Action Button: Park */}
        {!isParked && speedInt === 0 && (
          <div className="flex justify-center pointer-events-auto">
            <button 
              onClick={onParkToggle}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-2 rounded-full border border-white/20 font-bold tracking-widest text-sm transition-all"
            >
              PARK & WALK
            </button>
          </div>
        )}
      </div>
    </div>
  );
};