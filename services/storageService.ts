import { UserProfile } from '../types';
import { INITIAL_USER_STATE } from '../constants';

const STORAGE_KEY = 'lorider_user_data';
const API_KEY_STORAGE = 'lorider_api_key';

export const getUserProfile = (): UserProfile => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : INITIAL_USER_STATE;
  } catch (error) {
    console.error("Error loading user profile", error);
    return INITIAL_USER_STATE;
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Error saving user profile", error);
  }
};

export const updateDistance = (kmToAdd: number): UserProfile => {
  const profile = getUserProfile();
  const newProfile = {
    ...profile,
    distanceDriven: profile.distanceDriven + kmToAdd
  };
  saveUserProfile(newProfile);
  return newProfile;
};

export const getApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE);
};

export const saveApiKey = (key: string): void => {
  localStorage.setItem(API_KEY_STORAGE, key);
};