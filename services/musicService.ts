
import { Track } from '../types';

const JAMENDO_CLIENT_ID = '56d30c95';
let AUDIUS_BASE_URL = 'https://api.audius.co';

const selectAudiusHost = async () => {
  try {
    const res = await fetch('https://api.audius.co');
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      AUDIUS_BASE_URL = data.data[Math.floor(Math.random() * data.data.length)];
    }
  } catch (e) {
    console.warn("Audius hosts fetch failed");
  }
};

selectAudiusHost();

const safeJson = async (url: string) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

const mapJamendoTrack = (r: any): Track => ({
  id: 'jam-' + r.id,
  title: r.name || 'Untitled',
  artist: r.artist_name || 'Unknown Artist',
  album: r.album_name || 'Jamendo Mix',
  cover: (r.album_image || r.image || `https://picsum.photos/seed/${r.id}/400/400`).replace('http://', 'https://'),
  url: r.audio.replace('http://', 'https://'),
  duration: parseInt(r.duration) || 0,
  source: 'jamendo'
});

const mapAudiusTrack = (r: any): Track => ({
  id: 'aud-' + r.id,
  title: r.title || 'Untitled',
  artist: r.user?.name || 'Unknown Artist',
  album: 'Audius Wave',
  cover: r.artwork?.['480x480'] || `https://picsum.photos/seed/${r.id}/400/400`,
  url: `${AUDIUS_BASE_URL}/v1/tracks/${r.id}/stream?app_name=NOVATONEX`,
  duration: r.duration || 0,
  source: 'audius'
});

export const searchMusic = async (query: string): Promise<Track[]> => {
  if (!query || query.trim().length < 2) return [];
  const limit = 200; 
  const q = encodeURIComponent(query.trim());

  const data = await Promise.all([
    safeJson(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&search=${q}&order=popularity_total`),
    safeJson(`${AUDIUS_BASE_URL}/v1/tracks/search?query=${q}&app_name=NOVATONEX&limit=${limit}`)
  ]);

  const tracks: Track[] = [];
  if (data[0]?.results) tracks.push(...data[0].results.map(mapJamendoTrack));
  if (data[1]?.data) tracks.push(...data[1].data.map(mapAudiusTrack));

  return tracks.sort(() => Math.random() - 0.5);
};

export const getTrendingMusic = async (): Promise<Track[]> => {
  const calls = [
    safeJson(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=200&order=popularity_total&offset=0`),
    safeJson(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=200&order=popularity_total&offset=200`),
    safeJson(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=200&order=popularity_total&offset=400`),
    safeJson(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=200&order=popularity_total&offset=600`),
    safeJson(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=200&order=popularity_total&offset=800`),
    safeJson(`${AUDIUS_BASE_URL}/v1/tracks/trending?app_name=NOVATONEX&limit=100`),
  ];

  const results = await Promise.all(calls);
  const tracks: Track[] = [];

  results.forEach((data, idx) => {
    if (idx < 5 && data?.results) {
      tracks.push(...data.results.map(mapJamendoTrack));
    } else if (idx === 5 && data?.data) {
      tracks.push(...data.data.map(mapAudiusTrack));
    }
  });

  return Array.from(new Map(tracks.map(t => [t.id, t])).values());
};