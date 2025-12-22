
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  url: string;
  duration: number;
  source: 'local' | 'jamendo' | 'audius' | 'hearthis' | 'archive' | 'musopen';
  mood?: string;
  genre?: string;
  file?: File;
  timestamp?: number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  repeatMode: 'none' | 'one' | 'all';
  isShuffle: boolean;
  queue: Track[];
  history: Track[];
}

export interface AudioSettings {
  bassBoost: number;
  surround3D: number;
  equalizer: number[]; // 5-10 bands
  isHiRes: boolean;
  replayGain: boolean;
}
