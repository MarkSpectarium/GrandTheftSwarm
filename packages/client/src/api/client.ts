import type { SaveRequest, SaveResponse, LoadResponse, SyncRequest, SyncResponse } from 'shared';

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('gts_auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

export const api = {
  // Save game to cloud
  async saveGame(save: SaveRequest): Promise<SaveResponse> {
    const response = await fetchWithAuth('/api/saves', {
      method: 'POST',
      body: JSON.stringify(save),
    });

    if (!response.ok) {
      throw new Error('Failed to save game');
    }

    return response.json();
  },

  // Load game from cloud
  async loadGame(): Promise<LoadResponse> {
    const response = await fetchWithAuth('/api/saves/current');

    if (!response.ok) {
      throw new Error('Failed to load game');
    }

    return response.json();
  },

  // Sync with server (handles offline progress)
  async syncGame(request: SyncRequest): Promise<SyncResponse> {
    const response = await fetchWithAuth('/api/saves/sync', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to sync game');
    }

    return response.json();
  },
};
