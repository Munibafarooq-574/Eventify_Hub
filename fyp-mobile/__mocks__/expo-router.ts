import { jest } from '@jest/globals';
const mockRouter = {
  push: jest.fn(),
};

export const useRouter = () => mockRouter;