
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Track, PlaybackState, AudioSettings, Playlist } from './types';
import { audioEngine } from './services/audioEngine';
import { searchMusic, getTrendingMusic } from './services/musicService';
import { getTrackMood } from './services/geminiService';
import { Visualizer } from './components/Visualizer';

// Fix: Define missing GENRES constant for the search category suggestions
const GENRES = ['All', 'Lo-Fi', 'Synthwave', 'Jazz', 'Chill', 'Electronic', 'Rock', 'Classical', 'Hip Hop', 'Ambient'];

// --- Оптимізовані іконки ---
const HomeIcon = memo(({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`w-7 h-7 transition-all duration-500 mx-auto ${active ? 'text-[#1DB954] scale-110' : 'text-zinc-600'}`} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7h-4v7H4a1 1 0 01-1-1V9.5z" />
  </svg>
));
const SearchIcon = memo(({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`w-7 h-7 transition-all duration-500 mx-auto ${active ? 'text-[#1DB954] scale-110' : 'text-zinc-600'}`} fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
));
const LibraryIcon = memo(({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`w-7 h-7 transition-all duration-500 mx-auto ${active ? 'text-[#1DB954] scale-110' : 'text-zinc-600'}`} fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" fill={active ? "currentColor" : "none"} />
  </svg>
));

// --- Ізольований прогрес-бар для уникнення глобальних рендерів ---
const ProgressBar = memo(({ progress }: { progress: number }) => (
  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-zinc-800">
    <div 
      className="h-full bg-[#1DB954] transition-all duration-300 ease-linear shadow-[0_0_8px_#1DB954]" 
      style={{ width: `${progress}%` }}
    ></div>
  </div>
));

// --- Мемоізований елемент списку треків ---
const TrackItem = memo(({ track, isActive, isPlaying, onPlay, onToggleFav, isFav }: { 
  track: Track, isActive: boolean, isPlaying: boolean, onPlay: (t: Track) => void, onToggleFav: (t: Track) => void, isFav: boolean 
}) => {
  return (
    <div 
      onClick={() => onPlay(track)} 
      className="flex items-center gap-4 bg-zinc-900/40 rounded-[24px] p-3.5 cursor-pointer hover:bg-zinc-800/60 active-scale border border-white/5 transition-all duration-200"
      style={{ contentVisibility: 'auto' }}
    >
      <div className="relative shrink-0">
        <img src={track.cover} loading="lazy" className={`w-14 h-14 object-cover rounded-xl shadow-lg transition-transform ${isActive && isPlaying ? 'scale-105' : ''}`} />
        {isActive && isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl backdrop-blur-[1px]">
             <div className="playing-bars"><div className="bar"></div><div className="bar"></div><div className="bar"></div></div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <span className={`text-[14px] font-bold truncate block ${isActive ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</span>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{track.artist}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggleFav(track); }} className="p-2.5">
        <svg viewBox="0 0 24 24" className={`w-5 h-5 transition-all ${isFav ? 'text-[#1DB954]' : 'text-zinc-600'}`} fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </button>
    </div>
  );
});

export default function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [library, setLibrary] = useState<Track[]>(() => JSON.parse(localStorage.getItem('nt_local') || '[]'));
  const [favorites, setFavorites] = useState<Track[]>(() => JSON.parse(localStorage.getItem('nt_favs') || '[]'));
  const [history, setHistory] = useState<Track[]>(() => JSON.parse(localStorage.getItem('nt_history') || '[]'));
  
  const [trending, setTrending] = useState<Track[]>([]);
  const [searchResults, setSearchResults] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library'>('home');
  const [libSection, setLibSection] = useState<'local' | 'favs' | 'history'>('local');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlayer, setShowPlayer] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [playback, setPlayback] = useState<PlaybackState>({
    currentTrack: null, isPlaying: false, progress: 0, volume: 0.8,
    repeatMode: 'none', isShuffle: false, queue: [], history: []
  });

  const [settings, setSettings] = useState<AudioSettings>({
    bassBoost: 0, surround3D: 0, equalizer: [0, 0, 0, 0, 0], isHiRes: true, replayGain: false
  });

  // Автозбереження
  useEffect(() => {
    localStorage.setItem('nt_local', JSON.stringify(library));
    localStorage.setItem('nt_favs', JSON.stringify(favorites));
    localStorage.setItem('nt_history', JSON.stringify(history));
  }, [library, favorites, history]);

  const triggerHaptic = useCallback(() => { if ('vibrate' in navigator) navigator.vibrate(8); }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (playback.isPlaying && playback.currentTrack) {
      audioEngine.resume();
      audio.play().catch(() => setPlayback(p => ({ ...p, isPlaying: false })));
    } else {
      audio.pause();
    }
  }, [playback.isPlaying, playback.currentTrack?.url]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    const tracks = await getTrendingMusic(0);
    setTrending(tracks);
    setLoading(false);
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const onPlay = useCallback((track: Track) => {
    triggerHaptic();
    if (audioRef.current) {
      audioEngine.init(audioRef.current);
      audioEngine.resume();
    }
    setHistory(prev => [{ ...track, timestamp: Date.now() }, ...prev.filter(t => t.id !== track.id)].slice(0, 50));
    setPlayback(prev => ({ ...prev, currentTrack: track, isPlaying: true }));
    getTrackMood(track.title, track.artist).then(mood => {
      setPlayback(prev => prev.currentTrack?.id === track.id ? { ...prev, currentTrack: { ...track, mood } } : prev);
    });
  }, [triggerHaptic]);

  const onToggleFav = useCallback((track: Track) => {
    triggerHaptic();
    setFavorites(prev => {
      const exists = prev.find(t => t.id === track.id);
      return exists ? prev.filter(t => t.id !== track.id) : [track, ...prev];
    });
  }, [triggerHaptic]);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    triggerHaptic();
    setPlayback(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [triggerHaptic]);

  const loadMore = async () => {
    if (loading || isSearching) return;
    setLoading(true);
    const nextOffset = offset + 50;
    setOffset(nextOffset);
    if (activeTab === 'home') {
      const more = await getTrendingMusic(nextOffset);
      setTrending(prev => [...prev, ...more]);
    } else if (activeTab === 'search' && searchQuery) {
      const more = await searchMusic(searchQuery, nextOffset);
      setSearchResults(prev => prev ? [...prev, ...more] : more);
    }
    setLoading(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 500) {
      loadMore();
    }
  };

  const executeSearch = async (q: string) => {
    if (!q.trim()) return;
    triggerHaptic();
    setSearchQuery(q);
    setOffset(0);
    setIsSearching(true);
    const res = await searchMusic(q, 0);
    setSearchResults(res);
    setIsSearching(false);
  };

  const isFavorite = useCallback((id: string) => favorites.some(f => f.id === id), [favorites]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#000000] text-white overflow-hidden select-none font-sans relative">
      <audio 
        ref={audioRef} 
        src={playback.currentTrack?.url} 
        onTimeUpdate={() => {
          // Оновлюємо прогрес рідше для продуктивності
          if (audioRef.current && Math.abs(playback.progress - (audioRef.current.currentTime / audioRef.current.duration) * 100) > 0.5) {
            setPlayback(p => ({ ...p, progress: (audioRef.current!.currentTime / audioRef.current!.duration) * 100 }));
          }
        }}
        onEnded={() => {
          const list = searchResults || trending;
          const idx = list.findIndex(t => t.id === playback.currentTrack?.id);
          if (idx !== -1 && idx < list.length - 1) onPlay(list[idx + 1]);
        }}
        crossOrigin="anonymous"
      />

      <div 
        ref={scrollRef} 
        onScroll={handleScroll} 
        className="flex-1 overflow-y-auto pb-48 px-4 pt-10 no-scrollbar spotify-gradient scroll-smooth will-change-scroll"
      >
        {activeTab === 'home' && (
          <div className="fade-slide-up">
            <header className="flex justify-between items-center mb-8 px-2">
              <h1 className="text-3xl font-black tracking-tighter">NovaTune</h1>
              <div className="w-10 h-10 bg-zinc-900 rounded-full border border-white/5 flex items-center justify-center">
                <div className="w-2 h-2 bg-[#1DB954] rounded-full animate-pulse"></div>
              </div>
            </header>
            <div className="space-y-2.5">
              {trending.map((t, i) => (
                <TrackItem 
                  key={t.id + i} 
                  track={t} 
                  isActive={playback.currentTrack?.id === t.id} 
                  isPlaying={playback.isPlaying}
                  onPlay={onPlay}
                  onToggleFav={onToggleFav}
                  isFav={isFavorite(t.id)}
                />
              ))}
              {loading && <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div></div>}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="fade-slide-up">
            <div className="sticky top-0 z-50 bg-black/60 backdrop-blur-md pt-2 pb-6 px-1">
              <div className="relative flex items-center bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-1 ring-[#1DB954] transition-all">
                <div className="absolute left-4 text-zinc-500"><SearchIcon active={false} /></div>
                <input 
                  type="text" 
                  placeholder="Artists or songs..."
                  className="w-full bg-transparent py-4 pl-12 pr-4 font-bold focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeSearch(searchQuery)}
                />
              </div>
              <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                {GENRES.slice(1).map(g => (
                  <button key={g} onClick={() => executeSearch(g)} className="px-5 py-2 bg-zinc-900 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">{g}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2.5 mt-2">
              {isSearching ? <div className="flex justify-center py-20 animate-pulse text-zinc-600 text-[10px] font-black uppercase tracking-[0.5em]">Syncing...</div> : searchResults?.map((t, i) => (
                <TrackItem 
                  key={t.id + i} 
                  track={t} 
                  isActive={playback.currentTrack?.id === t.id} 
                  isPlaying={playback.isPlaying}
                  onPlay={onPlay}
                  onToggleFav={onToggleFav}
                  isFav={isFavorite(t.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="fade-slide-up">
            <header className="mb-8 px-2">
               <h1 className="text-4xl font-black tracking-tighter">Vault</h1>
            </header>
            <div className="flex gap-2 mb-6 px-2">
              {['local', 'favs', 'history'].map(s => (
                <button key={s} onClick={() => setLibSection(s as any)} className={`px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest ${libSection === s ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}>{s}</button>
              ))}
            </div>
            <div className="space-y-2.5">
               {libSection === 'favs' && favorites.map((t, i) => <TrackItem key={t.id + i} track={t} isActive={playback.currentTrack?.id === t.id} isPlaying={playback.isPlaying} onPlay={onPlay} onToggleFav={onToggleFav} isFav={true} />)}
               {libSection === 'history' && history.map((t, i) => <TrackItem key={t.id + i} track={t} isActive={playback.currentTrack?.id === t.id} isPlaying={playback.isPlaying} onPlay={onPlay} onToggleFav={onToggleFav} isFav={isFavorite(t.id)} />)}
               {libSection === 'local' && library.map((t, i) => <TrackItem key={t.id + i} track={t} isActive={playback.currentTrack?.id === t.id} isPlaying={playback.isPlaying} onPlay={onPlay} onToggleFav={onToggleFav} isFav={isFavorite(t.id)} />)}
            </div>
          </div>
        )}
      </div>

      {/* Mini Player */}
      {playback.currentTrack && (
        <div 
          className="fixed bottom-[110px] left-4 right-4 h-20 bg-[#0c0c0c]/90 rounded-[32px] shadow-2xl flex items-center px-4 z-50 border border-white/10 backdrop-blur-xl cursor-pointer will-change-transform active-scale"
          onClick={() => setShowPlayer(true)}
        >
          <img src={playback.currentTrack.cover} className={`w-12 h-12 rounded-xl transition-all duration-700 ${playback.isPlaying ? 'scale-110' : 'scale-95'}`} />
          <div className="ml-4 flex-1 overflow-hidden">
            <h4 className="text-[13px] font-bold truncate">{playback.currentTrack.title}</h4>
            <p className="text-[10px] text-zinc-500 font-medium truncate uppercase tracking-wider">{playback.currentTrack.artist}</p>
          </div>
          <button onClick={togglePlay} className="bg-white text-black p-3 rounded-full ml-2 shadow-lg">
            {playback.isPlaying ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5.14v14l11-7-11-7z" /></svg>}
          </button>
          <ProgressBar progress={playback.progress} />
        </div>
      )}

      {/* Nav Bar */}
      <nav className="h-[100px] bottom-nav-blur border-t border-white/5 grid grid-cols-3 items-center z-40 relative">
        <button onClick={() => { triggerHaptic(); setActiveTab('home'); }} className="py-4 active-scale">
          <HomeIcon active={activeTab === 'home'} />
          <span className={`text-[9px] font-black uppercase tracking-widest block mt-1 ${activeTab === 'home' ? 'text-[#1DB954]' : 'text-zinc-600'}`}>Home</span>
        </button>
        <button onClick={() => { triggerHaptic(); setActiveTab('search'); }} className="py-4 active-scale">
          <SearchIcon active={activeTab === 'search'} />
          <span className={`text-[9px] font-black uppercase tracking-widest block mt-1 ${activeTab === 'search' ? 'text-[#1DB954]' : 'text-zinc-600'}`}>Radar</span>
        </button>
        <button onClick={() => { triggerHaptic(); setActiveTab('library'); }} className="py-4 active-scale">
          <LibraryIcon active={activeTab === 'library'} />
          <span className={`text-[9px] font-black uppercase tracking-widest block mt-1 ${activeTab === 'library' ? 'text-[#1DB954]' : 'text-zinc-600'}`}>Vault</span>
        </button>
      </nav>

      {/* Full Player Modal */}
      {showPlayer && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center pt-20 pb-12 px-8 overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-500">
           <button onClick={() => setShowPlayer(false)} className="absolute top-12 left-8 p-3 bg-zinc-900 rounded-full active-scale"><svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg></button>
           
           <div className="relative mb-12 group">
             <div className={`absolute inset-0 bg-[#1DB954]/20 blur-[100px] transition-opacity duration-1000 ${playback.isPlaying ? 'opacity-100' : 'opacity-0'}`}></div>
             <img src={playback.currentTrack?.cover} className={`relative w-80 h-80 object-cover rounded-[56px] shadow-2xl transition-all duration-[1.5s] ease-out ${playback.isPlaying ? 'scale-105' : 'scale-90 rotate-2 opacity-80'}`} />
           </div>
           
           <div className="w-full text-center mb-10">
              <h2 className="text-3xl font-black mb-2 tracking-tighter">{playback.currentTrack?.title}</h2>
              <p className="text-[#1DB954] font-black text-sm uppercase tracking-[0.4em]">{playback.currentTrack?.artist}</p>
           </div>

           <div className="w-full max-w-sm mb-10 bg-zinc-900/30 p-8 rounded-[40px] border border-white/5 backdrop-blur-2xl">
              <div className="flex justify-between items-center mb-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>Haptic Drive</span>
                <span className="text-[#1DB954]">{settings.bassBoost}dB</span>
              </div>
              <input type="range" min="0" max="15" className="w-full mb-8" value={settings.bassBoost} onChange={(e) => {
                const v = parseInt(e.target.value);
                setSettings(s => ({...s, bassBoost: v}));
                audioEngine.setBassBoost(v);
                if (v > 10) triggerHaptic();
              }} />
              <Visualizer isPlaying={playback.isPlaying} />
           </div>

           <div className="flex items-center gap-10 mb-12">
              <button onClick={() => setPlayback(p => ({...p, isShuffle: !p.isShuffle}))} className={`p-4 rounded-full transition-all ${playback.isShuffle ? 'bg-[#1DB954] text-black' : 'text-zinc-600'}`}>
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.8 9L21 3M3 21l6.2-6m11.8 6l-6.2-6M3 3l6.2 6" /></svg>
              </button>
              <button onClick={togglePlay} className="p-8 bg-white text-black rounded-full active-scale shadow-xl">
                {playback.isPlaying ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M8 5.14v14l11-7-11-7z" /></svg>}
              </button>
              <button className="p-4 text-zinc-600"><svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg></button>
           </div>
           
           <button onClick={() => setShowPlayer(false)} className="bg-zinc-900/60 text-zinc-500 px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest border border-white/5 active-scale">Close Vault</button>
        </div>
      )}
    </div>
  );
}
