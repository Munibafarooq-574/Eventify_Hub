import { jest } from '@jest/globals';
jest.mock("react-native-toast-message", () => ({
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  }
}));