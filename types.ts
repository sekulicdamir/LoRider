export enum GameMode {
  SETUP = 'SETUP',
  MENU = 'MENU',
  DRIVING = 'DRIVING',
  PARKED = 'PARKED',
  LOADING = 'LOADING',
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GameLocation {
  id: string;
  name: string;
  coords: Coordinates;
  panoId?: string; // Optional specific pano ID
}

export interface UserProfile {
  username: string;
  distanceDriven: number; // in km
  favorites: GameLocation[];
}

// Minimal definition for Google Maps types to avoid full @types/google.maps dependency in this environment
export interface GoogleMapsLink {
  description: string;
  heading: number;
  pano: string;
}

export interface StreetViewData {
  panoId: string;
  links: GoogleMapsLink[];
  heading: number;
  pitch: number;
}