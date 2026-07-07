import { jest } from '@jest/globals';
// __mocks__/expo-secure-store.ts
const mockSecureStore = {
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
};

export default mockSecureStore;
export const { 
  setItemAsync, 
  getItemAsync, 
  deleteItemAsync, 
  isAvailableAsync 
} = mockSecureStore;