
import { Track } from '../types';

const JAMENDO_CLIENT_ID = '56d30c95';
let AUDIUS_BASE_URL = 'https://api.audius.co';
const HEARTHIS_BASE_URL = 'https://api-v2.hearthis.at';

const selectAudiusHost = async () => {
  try {
    const res = await fetch('https://api.audius.co');
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      AUDIUS_BASE_URL = data.data[Math.floor(Math.random() * data.data.length)];
    }
  } catch (e) {
    console.error("Failed to fetch Audius hosts, using fallback");
  }
};

selectAudiusHost();

const mapJamendoTrack = (r: any): Track => ({
  id: 'jam-' + r.id,
  title: r.name,
  artist: r.artist_name,
  album: r.album_name || 'Jamendo Mix',
  cover: (r.album_image || r.image || `https://picsum.photos/seed/${r.id}/600/600`).replace('http://', 'https://'),
  url: r.audio.replace('http://', 'https://'),
  duration: parseInt(r.duration),
  source: 'jamendo'
});

const mapAudiusTrack = (r: any): Track => ({
  id: 'aud-' + r.id,
  title: r.title,
  artist: r.user.name,
  album: r.description?.slice(0, 30) || 'Audius Wave',
  cover: r.artwork?.['480x480'] || r.artwork?.['1000x1000'] || `https://picsum.photos/seed/${r.id}/600/600`,
  url: `${AUDIUS_BASE_URL}/v1/tracks/${r.id}/stream?app_name=NOVATUNE`,
  duration: r.duration,
  source: 'audius'
});

const mapHearThisTrack = (r: any): Track => ({
  id: 'ht-' + r.id,
  title: r.title,
  artist: r.user.username,
  album: r.genre || 'HearThis.at',
  cover: r.thumb || `https://picsum.photos/seed/ht${r.id}/600/600`,
  url: r.stream_url,
  duration: parseInt(r.duration),
  source: 'hearthis'
});

const mapArchiveTrack = (r: any): Track => ({
  id: 'arc-' + r.identifier,
  title: r.title || 'Unknown Archive Work',
  artist: r.creator?.[0] || r.creator || 'Archive Contributor',
  album: 'Internet Archive',
  cover: `https://archive.org/services/img/${r.identifier}`,
  url: `https://archive.org/download/${r.identifier}/${r.identifier}_vbr.m3u`,
  duration: 300,
  source: 'archive'
});

export const searchMusic = async (query: string, offset: number = 0): Promise<Track[]> => {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const limit = 40;

  try {
    const [jamendoRes, audiusRes, hearThisRes, archiveRes] = await Promise.all([
      fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&offset=${offset}&search=${encodeURIComponent(q)}&order=popularity_total`),
      fetch(`${AUDIUS_BASE_URL}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=NOVATUNE&offset=${offset}&limit=${limit}`),
      fetch(`${HEARTHIS_BASE_URL}/search?t=${encodeURIComponent(q)}&count=${limit}&page=${Math.floor(offset/limit) + 1}`),
      fetch(`https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(q)})+AND+mediatype:audio&output=json&rows=${limit}&start=${offset}`)
    ]);

    const jamendoData = await jamendoRes.json();
    const audiusData = await audiusRes.json();
    const hearThisData = await hearThisRes.json();
    const archiveData = await archiveRes.json();

    const jamTracks = (jamendoData.results || []).map(mapJamendoTrack);
    const audTracks = (audiusData.data || []).map(mapAudiusTrack);
    const htTracks = Array.isArray(hearThisData) ? hearThisData.map(mapHearThisTrack) : [];
    const arcTracks = (archiveData.response?.docs || []).map(mapArchiveTrack);

    const combined = [];
    const maxLen = Math.max(jamTracks.length, audTracks.length, htTracks.length, arcTracks.length);
    for (let i = 0; i < maxLen; i++) {
      if (jamTracks[i]) combined.push(jamTracks[i]);
      if (audTracks[i]) combined.push(audTracks[i]);
      if (htTracks[i]) combined.push(htTracks[i]);
      if (arcTracks[i]) combined.push(arcTracks[i]);
    }

    return combined;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

export const getTrendingMusic = async (offset: number = 0): Promise<Track[]> => {
  const limit = 50;
  try {
    const [jamendoRes, audiusRes, hearThisRes] = await Promise.all([
      fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&offset=${offset}&order=popularity_month`),
      fetch(`${AUDIUS_BASE_URL}/v1/tracks/trending?app_name=NOVATUNE&limit=${limit}&offset=${offset}`),
      fetch(`${HEARTHIS_BASE_URL}/feed/?type=trending&count=${limit}&page=${Math.floor(offset/limit) + 1}`)
    ]);

    const jamendoData = await jamendoRes.json();
    const audiusData = await audiusRes.json();
    const hearThisData = await hearThisRes.json();

    const jamTracks = (jamendoData.results || []).map(mapJamendoTrack);
    const audTracks = (audiusData.data || []).map(mapAudiusTrack);
    const htTracks = Array.isArray(hearThisData) ? hearThisData.map(mapHearThisTrack) : [];

    return [...jamTracks, ...audTracks, ...htTracks].sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error("Trending error:", error);
    return [];
  }
};
