import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameLocation, GoogleMapsLink, StreetViewData } from './types';
import { MAX_SPEED, ACCELERATION_RATE, BRAKING_RATE, FRICTION_RATE, HANDBRAKE_RATE } from './constants';
import { MainMenu } from './components/MainMenu';
import { SteeringWheel } from './components/SteeringWheel';
import { Dashboard } from './components/Dashboard';
import { getUserProfile, updateDistance, getApiKey, saveApiKey } from './services/storageService';
import { Key, AlertTriangle } from 'lucide-react';

// Add global declaration for google maps
declare global {
  interface Window {
    google: any;
    gm_authFailure: () => void;
  }
}

const App: React.FC = () => {
  // --- Game State ---
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.LOADING); // Start in loading to check API key
  const [location, setLocation] = useState<GameLocation | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(getApiKey());
  const [tempKeyInput, setTempKeyInput] = useState('');
  
  // Physics State
  const [speed, setSpeed] = useState(0); // km/h
  const [heading, setHeading] = useState(0); // 0-360
  const [steeringAngle, setSteeringAngle] = useState(0); // -120 to 120 relative
  
  // Controls State
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);
  const [handbrakeEngaged, setHandbrakeEngaged] = useState(false);

  // Street View State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const streetViewRef = useRef<any>(null); // google.maps.StreetViewPanorama
  const streetViewServiceRef = useRef<any>(null); // google.maps.StreetViewService
  const currentPanoData = useRef<StreetViewData | null>(null);
  const preloadedPanoDataRef = useRef<any>(null);
  
  // Refs for loop
  const speedRef = useRef(0);
  const headingRef = useRef(0);
  const steeringRef = useRef(0);
  const lastFrameTime = useRef(0);
  const moveProgress = useRef(0); // 0 to 1, progress to next node
  const scriptAddedRef = useRef(false);
  const lastVolumeDownPress = useRef(0);
  const isPreloadingRef = useRef(false);

  // Refs for control state
  const gasPressedRef = useRef(false);
  const brakePressedRef = useRef(false);
  const handbrakeEngagedRef = useRef(false);
  const gameModeRef = useRef(gameMode);

  // User Data
  const [userProfile, setUserProfile] = useState(getUserProfile());

  // --- Sync state with refs for the game loop ---
  useEffect(() => { gasPressedRef.current = gasPressed; }, [gasPressed]);
  useEffect(() => { brakePressedRef.current = brakePressed; }, [brakePressed]);
  useEffect(() => { handbrakeEngagedRef.current = handbrakeEngaged; }, [handbrakeEngaged]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);


  // --- Initialization & Dynamic Script Loading ---

  useEffect(() => {
    // 1. If no API key, go to Setup
    if (!apiKey) {
      setGameMode(GameMode.SETUP);
      return;
    }

    // 2. If Google Maps is already on window, we are ready
    if (window.google && window.google.maps) {
      setMapsLoaded(true);
      if (gameMode === GameMode.LOADING || gameMode === GameMode.SETUP) {
        setGameMode(GameMode.MENU);
      }
      return;
    }

    // 3. Define Auth Failure Handler (Global)
    window.gm_authFailure = () => {
      console.error("Google Maps Auth Failure");
      alert("Authentication Failed: The API Key provided is invalid or not enabled for Maps JavaScript API.");
      saveApiKey('');
      setApiKey(null);
      setGameMode(GameMode.SETUP);
      window.location.reload(); // Reload to clear the bad script state
    };

    // 4. Inject Script if not present
    if (!scriptAddedRef.current) {
      scriptAddedRef.current = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapsLoaded(true);
        setGameMode(GameMode.MENU);
      };
      script.onerror = () => {
        setLoadingError("Network Error: Could not load Maps API.");
        setGameMode(GameMode.SETUP);
        scriptAddedRef.current = false;
      };
      document.head.appendChild(script);
    }
  }, [apiKey, gameMode]);

  const handleSaveKey = () => {
    if (tempKeyInput.trim().length > 10) {
      saveApiKey(tempKeyInput.trim());
      setApiKey(tempKeyInput.trim());
      // Reloading is safer to ensure clean script injection
      window.location.reload();
    } else {
      alert("Please enter a valid API Key");
    }
  };

  const startGame = (loc: GameLocation) => {
    setLocation(loc);
    setLoadingError(null);
    setGameMode(GameMode.LOADING);
  };

  // --- Robust Street View Loading Strategy ---

  const loadStreetViewLocation = useCallback(() => {
    if (!window.google || !window.google.maps || !location) return;

    if (!streetViewServiceRef.current) {
      streetViewServiceRef.current = new window.google.maps.StreetViewService();
    }
    const service = streetViewServiceRef.current;

    const safetyTimeout = setTimeout(() => {
      if (gameMode === GameMode.LOADING) {
        setLoadingError("Connection timed out. Check API Key or Network.");
      }
    }, 10000);
    
    const request = {
      location: location.coords,
      preference: window.google.maps.StreetViewPreference.NEAREST,
      radius: 100,
      source: window.google.maps.StreetViewSource.OUTDOOR
    };

    service.getPanorama(request, (data: any, status: any) => {
      clearTimeout(safetyTimeout);
      if (status === 'OK' && data) {
        initPanoramaPlayer(data);
      } else {
        console.error("Street View Service Error:", status);
        let msg = "Could not find a road here.";
        if (status === 'ZERO_RESULTS') msg = "No Street View coverage at this location.";
        if (status === 'REQUEST_DENIED' || status === 'UNKNOWN_ERROR') msg = "Map Error: Check API Key.";
        setLoadingError(msg);
      }
    });
  }, [location, gameMode]);

  const initPanoramaPlayer = (initialData: any) => {
    if (!mapContainerRef.current) return;

    const sv = new window.google.maps.StreetViewPanorama(mapContainerRef.current, {
      pano: initialData.location.pano,
      pov: { heading: initialData.location.heading || 0, pitch: 0 },
      zoom: 0,
      disableDefaultUI: true,
      showRoadLabels: false,
      motionTracking: false,
      motionTrackingControl: false,
      linksControl: false,
      panControl: false,
      enableCloseButton: false,
      clickToGo: false, 
    });

    streetViewRef.current = sv;

    sv.addListener('links_changed', () => {
      const links = sv.getLinks();
      const panoId = sv.getPano();
      const pov = sv.getPov();
      
      currentPanoData.current = {
        panoId,
        links: links || [],
        heading: pov.heading,
        pitch: pov.pitch
      };
      
      if (gameMode === GameMode.LOADING) {
        const startHeading = initialData.location.heading || pov.heading;
        setHeading(startHeading);
        headingRef.current = startHeading;
        setGameMode(GameMode.DRIVING);
        lastFrameTime.current = performance.now();
      }
    });
  };

  useEffect(() => {
    if (gameMode === GameMode.LOADING && mapsLoaded && location) {
      loadStreetViewLocation();
    }
  }, [gameMode, mapsLoaded, location, loadStreetViewLocation]);


  // --- Input Handling ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') setGasPressed(true);
      if (e.key === 'ArrowDown' || e.key === 's') setBrakePressed(true);
      if (e.key === 'AudioVolumeUp') {
        e.preventDefault(); setGasPressed(true); setHandbrakeEngaged(false);
      }
      if (e.key === 'AudioVolumeDown') {
        e.preventDefault(); setBrakePressed(true);
        const now = Date.now();
        if (now - lastVolumeDownPress.current < 300) setHandbrakeEngaged(true);
        lastVolumeDownPress.current = now;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') setGasPressed(false);
      if (e.key === 'ArrowDown' || e.key === 's') setBrakePressed(false);
      if (e.key === 'AudioVolumeUp') { e.preventDefault(); setGasPressed(false); }
      if (e.key === 'AudioVolumeDown') { e.preventDefault(); setBrakePressed(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleSteer = (angle: number) => {
    steeringRef.current = angle;
    setSteeringAngle(angle);
  };

  // --- Robust Game Loop ---
  useEffect(() => {
    let animationFrameId: number;

    const findBestLink = (links: GoogleMapsLink[], heading: number): GoogleMapsLink | null => {
        let bestLink: GoogleMapsLink | null = null;
        let minDiff = 360;
        for (const link of links) {
            const diff = Math.abs(link.heading - heading);
            const diffWrapped = Math.min(diff, 360 - diff);
            if (diffWrapped < 60) { // Forward-facing cone of 120 degrees
                if (diffWrapped < minDiff) {
                    minDiff = diffWrapped;
                    bestLink = link;
                }
            }
        }
        return bestLink;
    }

    const gameLoop = (time: number) => {
      animationFrameId = requestAnimationFrame(gameLoop);

      if (gameModeRef.current !== GameMode.DRIVING) {
        lastFrameTime.current = time;
        return;
      }

      const dt = (time - lastFrameTime.current) / 1000;
      lastFrameTime.current = time;
      if (dt > 0.5 || dt <= 0) return;

      // 1. Steering Simulation
      const autoCenterRate = 140;
      if (Math.abs(steeringRef.current) > 0.5) {
          const centeringAmount = autoCenterRate * dt;
          steeringRef.current -= Math.sign(steeringRef.current) * centeringAmount;
          setSteeringAngle(steeringRef.current);
      } else if (steeringRef.current !== 0) {
          steeringRef.current = 0;
          setSteeringAngle(0);
      }
      
      // 2. Physics: Speed
      let currentSpeed = speedRef.current;
      if (handbrakeEngagedRef.current) currentSpeed -= HANDBRAKE_RATE * dt;
      else if (gasPressedRef.current) currentSpeed += ACCELERATION_RATE * dt; 
      else if (brakePressedRef.current) currentSpeed -= BRAKING_RATE * dt;
      else currentSpeed -= FRICTION_RATE * dt;
      currentSpeed = Math.max(0, Math.min(currentSpeed, MAX_SPEED));
      speedRef.current = currentSpeed;
      setSpeed(currentSpeed); 

      // 3. Physics: Heading
      if (Math.abs(steeringRef.current) > 1 && currentSpeed > 1) {
        const turnEffectiveness = 1.0 - (currentSpeed / (MAX_SPEED * 2));
        const turnRate = steeringRef.current * 1.3 * turnEffectiveness;
        let newHeading = headingRef.current + (turnRate * dt);
        newHeading = (newHeading + 360) % 360; 
        headingRef.current = newHeading;
        setHeading(newHeading);
      }

      // 4. Street View Camera Sync
      if (streetViewRef.current) {
        streetViewRef.current.setPov({ heading: headingRef.current, pitch: 0 });
      }

      // 5. Movement & Predictive Pre-loading Logic
      if (currentSpeed > 5 && currentPanoData.current?.links?.length > 0) {
         const mPerSec = currentSpeed / 3.6;
         const metersMoved = mPerSec * dt;
         const NODE_DISTANCE = 20;
         const percentMoved = metersMoved / NODE_DISTANCE;
         moveProgress.current += percentMoved;

         // PRE-LOADING: When halfway to the next node, predict and preload.
         if (moveProgress.current > 0.5 && !isPreloadingRef.current) {
            const bestLink = findBestLink(currentPanoData.current.links, headingRef.current);
            if (bestLink && bestLink.pano !== preloadedPanoDataRef.current?.location?.pano) {
                isPreloadingRef.current = true;
                streetViewServiceRef.current.getPanorama({ pano: bestLink.pano }, (data: any, status: any) => {
                    if (status === 'OK') preloadedPanoDataRef.current = data;
                    else preloadedPanoDataRef.current = null;
                    isPreloadingRef.current = false;
                });
            }
         }

         // TRANSITION: When we reach the next node.
         if (moveProgress.current >= 1.0) {
            const bestLink = findBestLink(currentPanoData.current.links, headingRef.current);
            if (bestLink) {
                if (preloadedPanoDataRef.current && preloadedPanoDataRef.current.location.pano === bestLink.pano) {
                    const preloadedData = preloadedPanoDataRef.current;
                    streetViewRef.current.setPano(preloadedData.location.pano);
                    currentPanoData.current = {
                        panoId: preloadedData.location.pano,
                        links: preloadedData.links || [],
                        heading: preloadedData.location.heading, pitch: 0
                    };
                    preloadedPanoDataRef.current = null;
                } else {
                    streetViewRef.current.setPano(bestLink.pano);
                }
                moveProgress.current = 0;
                const linkHeading = bestLink.heading;
                const diff = linkHeading - headingRef.current;
                let d = ((diff + 180) % 360) - 180;
                headingRef.current += d * 0.1; // Gently snap heading
                updateDistance(NODE_DISTANCE / 1000);
                if (Math.random() > 0.95) setUserProfile(getUserProfile());
            } else {
               moveProgress.current = 1.0; // Stop moving
            }
         }
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []); // Run only once on mount

  // --- Handlers ---

  const handleTogglePark = () => {
    if (gameMode === GameMode.DRIVING) {
        if (speedRef.current > 5) return; 
        setGameMode(GameMode.PARKED);
        setSpeed(0);
        speedRef.current = 0;
        if (streetViewRef.current) {
            streetViewRef.current.setOptions({
                disableDefaultUI: false, clickToGo: true, linksControl: true, addressControl: true
            });
        }
    } else {
        setGameMode(GameMode.DRIVING);
        lastFrameTime.current = performance.now();
        if (streetViewRef.current) {
            streetViewRef.current.setOptions({
                disableDefaultUI: true, clickToGo: false, linksControl: false, addressControl: false
            });
            streetViewRef.current.setPov({ heading: headingRef.current, pitch: 0 });
        }
    }
  };

  const handleShare = async () => {
    if (streetViewRef.current && navigator.share) {
        const shareUrl = window.location.href; 
        try {
            await navigator.share({
                title: 'LoRider', text: `Driving in LoRider.`, url: shareUrl
            });
        } catch (e) { console.log("Share failed"); }
    } else {
        alert("Sharing not supported.");
    }
  };

  // --- Visual Effects ---
  const blurAmount = Math.min(4, speed / 30); 
  const fovEffect = 1 + (speed / 300); 
  
  return (
    <div className="w-full h-screen overflow-hidden bg-black relative font-sans select-none">
      
      {/* 0. Setup Screen */}
      {gameMode === GameMode.SETUP && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1544333323-d34fc1T8224b?auto=format&fit=crop&q=80')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md bg-gray-900/90 border border-gray-700 p-8 rounded-lg shadow-2xl">
                <div className="flex justify-center mb-6"><Key size={48} className="text-yellow-500 animate-pulse" /></div>
                <h2 className="text-2xl font-bold text-white text-center mb-2 tracking-widest">SYSTEM INITIALIZATION</h2>
                <p className="text-gray-400 text-center text-xs mb-8 uppercase">Satellite Uplink Required</p>
                <div className="space-y-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Enter Google Maps API Key</label>
                    <input type="text" value={tempKeyInput} onChange={(e) => setTempKeyInput(e.target.value)} placeholder="AIzaSy..." className="w-full bg-black border border-gray-600 text-white p-3 rounded font-mono focus:border-yellow-500 focus:outline-none"/>
                    <button onClick={handleSaveKey} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded uppercase tracking-wider transition-colors">Initialize Link</button>
                    <p className="text-[10px] text-gray-600 text-center mt-4">Key must have "Maps JavaScript API" and "Street View Static API" enabled. It is stored locally on your device.</p>
                </div>
            </div>
        </div>
      )}

      {/* 1. Main Menu */}
      {gameMode === GameMode.MENU && (
        <MainMenu onStart={startGame} userDistance={userProfile.distanceDriven} />
      )}

      {/* 2. 3D World Layer */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${gameMode === GameMode.MENU ? 'opacity-0' : 'opacity-100'}`}>
         <div ref={mapContainerRef} className="w-full h-full" style={{ transform: `scale(${fovEffect})`, filter: `saturate(${1 + (speed/200)}) contrast(${1.1}) brightness(${0.9})`, transition: 'transform 0.2s ease-out' }} />
         {gameMode === GameMode.DRIVING && speed > 20 && (
             <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.3) 90%)', backdropFilter: `blur(${blurAmount}px)`, maskImage: 'radial-gradient(circle, black 40%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 80%)'}} />
         )}
         <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.6)_100%)] mix-blend-multiply" />
      </div>

      {/* 3. Game HUD Layer */}
      {(gameMode === GameMode.DRIVING || gameMode === GameMode.PARKED) && (
        <>
            <Dashboard 
                speed={speed} 
                locationName={currentPanoData.current?.links[0]?.description || location?.name || ""}
                isParked={gameMode === GameMode.PARKED}
                onParkToggle={handleTogglePark}
                onShare={handleShare}
            />
            {gameMode === GameMode.DRIVING && (
              <>
                <div className="absolute bottom-0 left-0 w-full h-full z-40 flex justify-between items-end pointer-events-none">
                  <div className={`w-1/2 h-1/3 transition-colors duration-100 pointer-events-auto flex items-end justify-start p-6 ${brakePressed ? 'bg-gradient-to-t from-red-600/40 to-transparent' : ''}`} onTouchStart={() => setBrakePressed(true)} onTouchEnd={() => setBrakePressed(false)} onMouseDown={() => setBrakePressed(true)} onMouseUp={() => setBrakePressed(false)} onMouseLeave={() => setBrakePressed(false)}>
                    <span className="text-white font-black text-2xl uppercase opacity-40">Brake</span>
                  </div>
                  <div className={`w-1/2 h-1/3 transition-colors duration-100 pointer-events-auto flex items-end justify-end p-6 ${gasPressed ? 'bg-gradient-to-t from-green-500/40 to-transparent' : ''}`} onTouchStart={() => { setGasPressed(true); setHandbrakeEngaged(false); }} onTouchEnd={() => setGasPressed(false)} onMouseDown={() => { setGasPressed(true); setHandbrakeEngaged(false); }} onMouseUp={() => setGasPressed(false)} onMouseLeave={() => setGasPressed(false)}>
                    <span className="text-white font-black text-2xl uppercase opacity-40">Gas</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-[25vh] z-30 pointer-events-none overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-black via-black/80 to-transparent" />
                    <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] bg-gray-900/95 rounded-t-full border-t-8 border-gray-800 shadow-2xl" style={{boxShadow: '0 -10px 30px rgba(0,0,0,0.5)'}}/>
                    <div className="absolute bottom-[-9rem] md:bottom-[-10rem] left-1/2 -translate-x-1/2">
                        <SteeringWheel onSteer={handleSteer} currentAngle={steeringAngle} />
                    </div>
                    {handbrakeEngaged && (
                        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-red-600/90 text-white font-bold px-3 py-2 rounded-lg border-2 border-red-400 animate-pulse pointer-events-auto">
                            <AlertTriangle size={20} /><span className="text-sm tracking-wider">HANDBRAKE</span>
                        </div>
                    )}
                </div>
              </>
            )}
        </>
      )}

      {/* Loading Overlay */}
      {gameMode === GameMode.LOADING && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-6">
              {loadingError ? (
                  <div className="text-red-500 font-bold text-xl border border-red-500 p-4 rounded bg-red-900/20">
                    {loadingError}
                    <div className="mt-4 text-sm text-gray-400 font-normal">Try selecting a different location or check if your API Key supports Street View.</div>
                    <button onClick={() => setGameMode(GameMode.MENU)} className="mt-6 px-6 py-2 bg-white text-black font-bold rounded uppercase hover:bg-gray-200">Return to Menu</button>
                  </div>
              ) : (
                  <>
                    <div className="text-yellow-500 font-bold animate-pulse tracking-widest text-2xl mb-4">INITIALIZING SYSTEMS...</div>
                    <div className="text-gray-500 text-sm">Connecting to Satellite Feed</div>
                    <button onClick={() => setGameMode(GameMode.MENU)} className="mt-8 px-6 py-2 border border-white/20 text-white/50 hover:text-white hover:border-white rounded text-xs uppercase tracking-widest">Cancel</button>
                  </>
              )}
          </div>
      )}

    </div>
  );
};

export default App;