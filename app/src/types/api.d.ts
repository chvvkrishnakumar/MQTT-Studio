import type { StudioApi } from '@shared/api';

declare global {
  interface Window {
    api: StudioApi;
  }
}

export {};
