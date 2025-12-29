import { API_TOKEN_CONFIG } from '@radio-inventar/shared';

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(API_TOKEN_CONFIG.STORAGE_KEY);
  },

  set(token: string): void {
    localStorage.setItem(API_TOKEN_CONFIG.STORAGE_KEY, token);
  },

  remove(): void {
    localStorage.removeItem(API_TOKEN_CONFIG.STORAGE_KEY);
  },

  exists(): boolean {
    return this.get() !== null;
  },
};
