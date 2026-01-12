import { GameLocation } from './types';

export const MAX_SPEED = 120; // km/h

// Physics constants are now per-second for frame-rate independence
export const ACCELERATION_RATE = 12; // km/h per second
export const BRAKING_RATE = 25;    // km/h per second
export const FRICTION_RATE = 3;      // km/h per second, natural deceleration
export const STEERING_SENSITIVITY = 1.5;
export const HANDBRAKE_RATE = 80;    // km/h per second, for sharp stops


// Locations to choose from
export const PRESET_LOCATIONS: GameLocation[] = [
  {
    id: 'tokyo-shibuya',
    name: 'Shibuya Crossing, Tokyo',
    coords: { lat: 35.6595, lng: 139.7004 }
  },
  {
    id: 'sf-lombard',
    name: 'Lombard St, San Francisco',
    coords: { lat: 37.8021, lng: -122.4187 }
  },
  {
    id: 'ocean-drive',
    name: 'Ocean Drive, Miami',
    coords: { lat: 25.7796, lng: -80.1320 }
  },
  {
    id: 'paris-champs',
    name: 'Champs-Élysées, Paris',
    coords: { lat: 48.8698, lng: 2.3075 }
  },
  {
    id: 'monaco-tunnel',
    name: 'Fairmont Hairpin, Monaco',
    coords: { lat: 43.7402, lng: 7.4296 }
  }
];

export const INITIAL_USER_STATE = {
  username: 'Guest Driver',
  distanceDriven: 0,
  favorites: []
};