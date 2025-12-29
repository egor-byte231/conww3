
import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Track, PlaybackState, Playlist, TrackStat, ChatSession } from './types';
import { audioEngine } from './services/audioEngine';
import { searchMusic, getTrendingMusic } from './services/musicService';
import { chatWithAI } from './services/geminiService';

const formatTime = (s: number) => {
  if (!s || isNaN(s)) return "0:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  exit: { opacity: 0, scale: 0.95 }
};

const TrackItem = memo(({ track, isActive, isPlaying, onPlay, onAdd, onFav, isFav }: any) => (
  <motion.div 
    layout
    variants={itemVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    whileTap={{ scale: 0.97 }}
    className={`flex items-center gap-4 p-3 rounded-[24px] transition-all duration-500 ${isActive ? 'bg-[#1DB954]/20 ring-1 ring-[#1DB954]/40 shadow-[0_8px_32px_rgba(29,185,84,0.1)]' : 'bg-white/5 cursor-pointer hover:bg-white/10'}`}
    onClick={() => onPlay(track)}
  >
    <div className="relative w-14 h-14 shrink-0 rounded-[18px] overflow-hidden bg-zinc-900 shadow-lg border border-white/5">
      <img src={track.cover} className="w-full h-full object-cover" loading="lazy" />
      {isActive && isPlaying && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="flex gap-1 items-end h-4">
            <div className="w-1 bg-[#1DB954] animate-[play-anim_0.6s_infinite]"></div>
            <div className="w-1 bg-[#1DB954] animate-[play-anim_0.6s_infinite_0.2s]"></div>
            <div className="w-1 bg-[#1DB954] animate-[play-anim_0.6s_infinite_0.4s]"></div>
          </div>
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className={`text-sm font-bold truncate ${isActive ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</h4>
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">{track.artist}</p>
    </div>
    <div className="flex items-center gap-1">
      <button onClick={(e) => { e.stopPropagation(); onFav(track); }} className={`p-2 transition-transform active:scale-150 ${isFav ? 'text-[#1DB954]' : 'text-zinc-800'}`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onAdd(track); }} className="p-2 text-zinc-700 active:scale-125 transition-transform">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  </motion.div>
));

export default function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  
  const [favorites, setFavorites] = useState<Track[]>(() => JSON.parse(localStorage.getItem('nt_favs') || '[]'));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => JSON.parse(localStorage.getItem('nt_playlists') || '[]'));
  const [sessions, setSessions] = useState<ChatSession[]>(() => JSON.parse(localStorage.getItem('nt_chat_sessions') || '[]'));
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [trackStats, setTrackStats] = useState<Record<string, TrackStat>>(() => JSON.parse(localStorage.getItem('nt_track_stats') || '{}'));
  const [totalTime, setTotalTime] = useState<number>(() => Number(localStorage.getItem('nt_total_time') || 0));
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'ai' | 'media' | 'stats'>('home');
  const [trending, setTrending] = useState<Track[]>([]);
  const [searchResults, setSearchResults] = useState<Track[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlayer, setShowPlayer] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [playlistPicker, setPlaylistPicker] = useState<Track | null>(null);
  
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isNightcore, setIsNightcore] = useState(false);
  const [is8D, setIs8D] = useState(false);

  const [playback, setPlayback] = useState<PlaybackState>({
    currentTrack: null, isPlaying: false, progress: 0, currentTime: 0, duration: 0, volume: 0.8,
    repeatMode: 'none', isShuffle: false, queue: [], history: []
  });

  useEffect(() => {
    localStorage.setItem('nt_favs', JSON.stringify(favorites));
    localStorage.setItem('nt_playlists', JSON.stringify(playlists));
    localStorage.setItem('nt_track_stats', JSON.stringify(trackStats));
    localStorage.setItem('nt_total_time', String(totalTime));
    localStorage.setItem('nt_chat_sessions', JSON.stringify(sessions));
  }, [favorites, playlists, trackStats, totalTime, sessions]);

  useEffect(() => {
    if (activeTab === 'home') getTrendingMusic().then(setTrending);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'search' && searchQuery.trim().length > 1) {
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = window.setTimeout(async () => {
        const results = await searchMusic(searchQuery);
        setSearchResults(results);
      }, 500);
    } else if (searchQuery.trim().length <= 1) {
      setSearchResults(null);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (playback.isPlaying) {
      audioEngine.resume();
      audioRef.current.play().catch(() => setPlayback(p => ({ ...p, isPlaying: false })));
    } else {
      audioRef.current.pause();
    }
  }, [playback.isPlaying, playback.currentTrack]);

  useEffect(() => {
    let interval: number;
    if (playback.isPlaying) interval = window.setInterval(() => setTotalTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [playback.isPlaying]);

  const onPlay = useCallback((track: Track, queue?: Track[]) => {
    if (audioRef.current) audioEngine.init(audioRef.current);
    setPlayback(prev => ({ ...prev, currentTrack: track, isPlaying: true, queue: queue || trending }));
    setTrackStats(prev => {
      const existing = prev[track.id] || { count: 0, lastPlayed: 0, title: track.title, artist: track.artist, cover: track.cover };
      return { ...prev, [track.id]: { ...existing, count: existing.count + 1, lastPlayed: Date.now() } };
    });
  }, [trending]);

  const toggleFavorite = (track: Track) => {
    setFavorites(prev => prev.some(f => f.id === track.id) ? prev.filter(f => f.id !== track.id) : [track, ...prev]);
  };

  const addTrackToPlaylist = (track: Track, playlistId: string) => {
    const updated = playlists.map(p => p.id === playlistId ? { ...p, tracks: [track, ...p.tracks.filter(t => t.id !== track.id)] } : p);
    setPlaylists(updated);
    if (selectedPlaylist?.id === playlistId) setSelectedPlaylist(updated.find(x => x.id === playlistId) || null);
    setPlaylistPicker(null);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isChatLoading || !activeSessionId) return;
    const msg = chatInput.trim(); setChatInput(''); setIsChatLoading(true);
    const userMsg = { role: 'user' as const, text: msg };
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s));
    try {
      const s = sessions.find(x => x.id === activeSessionId);
      if (!s) return;
      const history = [...s.messages, userMsg].map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const resp = await chatWithAI(msg, history, Object.values(trackStats));
      setSessions(prev => prev.map(x => x.id === activeSessionId ? { ...x, messages: [...x.messages, { role: 'model', text: resp }] } : x));
    } catch (e) { console.error(e); } finally { setIsChatLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white overflow-hidden relative pt-[var(--safe-top)]">
      <audio 
        ref={audioRef} src={playback.currentTrack?.url} crossOrigin="anonymous"
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          const cur = audioRef.current.currentTime;
          const dur = audioRef.current.duration || 0;
          setPlayback(p => ({ ...p, currentTime: cur, duration: dur, progress: (cur/(dur||1))*100 }));
        }}
        onEnded={() => {
          const idx = playback.queue.findIndex(t => t.id === playback.currentTrack?.id);
          if (idx !== -1 && idx < playback.queue.length - 1) onPlay(playback.queue[idx + 1], playback.queue);
        }}
      />

      <header className="px-6 py-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-lg shrink-0 border-b border-white/5">
        <h1 className="text-2xl font-black italic tracking-tighter text-[#1DB954]">NOVATONEX</h1>
        <div className="flex gap-2">
           {activeTab === 'ai' && activeSessionId && (
             <button onClick={() => setActiveSessionId(null)} className="p-2 text-zinc-500"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7" /></svg></button>
           )}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto no-scrollbar px-6 pb-48 pt-4 space-y-10">
               <h3 className="text-xl font-black italic uppercase tracking-tight text-[#1DB954]">Pulse of the World</h3>
               <div className="space-y-4">
                 {trending.map((t) => (
                   <TrackItem key={t.id} track={t} isActive={playback.currentTrack?.id === t.id} isPlaying={playback.isPlaying} onPlay={onPlay} onFav={toggleFavorite} isFav={favorites.some(f => f.id === t.id)} onAdd={() => setPlaylistPicker(t)} />
                 ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto no-scrollbar px-6 pb-48 pt-4 space-y-8">
              <div className="relative">
                <input type="text" placeholder="Search vibes..." className="w-full bg-zinc-900 border border-white/5 py-5 px-14 rounded-[28px] font-bold focus:border-[#1DB954]/50 outline-none text-sm transition-all shadow-lg" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <svg viewBox="0 0 24 24" className="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="3.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              </div>
              <div className="space-y-4">
                {searchResults?.map((t) => <TrackItem key={t.id} track={t} isActive={playback.currentTrack?.id === t.id} isPlaying={playback.isPlaying} onPlay={onPlay} onFav={toggleFavorite} isFav={favorites.some(f => f.id === t.id)} onAdd={() => setPlaylistPicker(t)} />)}
              </div>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full overflow-hidden">
              {!activeSessionId ? (
                <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 space-y-6 pb-48">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-black italic uppercase">Nova AI</h2>
                    <button onClick={() => {
                      const id = Date.now().toString();
                      setSessions([{ id, title: `SESSION ${sessions.length+1}`, messages: [{ role: 'model', text: 'Привіт! Чим можу допомогти?' }], createdAt: Date.now() }, ...sessions]);
                      setActiveSessionId(id);
                    }} className="p-3 bg-[#1DB954] text-black rounded-2xl"><svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14" /></svg></button>
                  </div>
                  {sessions.map(s => (
                    <div key={s.id} onClick={() => setActiveSessionId(s.id)} className="p-5 bg-zinc-900/50 rounded-3xl flex justify-between items-center border border-white/5 cursor-pointer">
                      <p className="font-bold text-sm uppercase">{s.title}</p>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1DB954]" fill="none" stroke="currentColor" strokeWidth="4"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                  <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 space-y-6 pb-20">
                    {sessions.find(s=>s.id===activeSessionId)?.messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-[24px] text-sm font-bold ${m.role === 'user' ? 'bg-[#1DB954] text-black' : 'bg-zinc-900 text-white'}`}>{m.text}</div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-6 bg-black/80 backdrop-blur-md pb-48">
                    <div className="relative">
                      <input type="text" placeholder="Speak to Nova..." className="w-full bg-[#121212] border border-white/10 py-4 px-6 rounded-full pr-16 outline-none focus:border-[#1DB954]/50 font-bold text-sm" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                      <button onClick={sendMessage} className="absolute right-1 top-1/2 -translate-y-1/2 p-3 bg-[#1DB954] text-black rounded-full" disabled={isChatLoading}><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="4.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg></button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'media' && (
            <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto no-scrollbar px-6 pb-48 pt-4 space-y-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic uppercase">Library</h2>
                <div className="flex gap-2">
                  <input type="text" placeholder="Playlist..." className="bg-zinc-900 border border-white/5 py-2 px-4 rounded-xl text-xs font-bold w-24" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} />
                  <button onClick={() => { if(!newPlaylistName.trim()) return; setPlaylists([{id: Date.now().toString(), name: newPlaylistName, tracks: [], createdAt: Date.now()}, ...playlists]); setNewPlaylistName(''); }} className="p-2 bg-[#1DB954] text-black rounded-xl"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14" /></svg></button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-8 bg-gradient-to-br from-[#1DB954] to-emerald-900 rounded-[40px] shadow-2xl cursor-pointer" onClick={() => setSelectedPlaylist({ id: 'favs', name: 'Liked Tracks', tracks: favorites, createdAt: 0 })}>
                  <h4 className="text-black font-black italic text-2xl uppercase">Liked</h4>
                  <p className="text-black/60 font-black uppercase text-[10px]">{favorites.length} TUNES</p>
                </div>
                {playlists.map(pl => (
                  <div key={pl.id} className="p-6 bg-zinc-900/50 rounded-[32px] flex justify-between items-center border border-white/5 cursor-pointer" onClick={() => setSelectedPlaylist(pl)}>
                    <p className="font-black italic text-lg uppercase">{pl.name}</p>
                    <button onClick={e => { e.stopPropagation(); setPlaylists(p => p.filter(x => x.id !== pl.id)); }} className="text-red-500/40 p-2"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto no-scrollbar px-6 pb-48 pt-4 space-y-10">
              <h2 className="text-2xl font-black italic uppercase text-[#1DB954]">Signal Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-zinc-900/50 rounded-[32px] border border-white/5">
                  <p className="text-[10px] font-black text-zinc-600 mb-1 uppercase tracking-widest">Airtime</p>
                  <p className="text-xl font-black italic">{Math.floor(totalTime/60)}m {totalTime%60}s</p>
                </div>
                <div className="p-6 bg-zinc-900/50 rounded-[32px] border border-white/5">
                  <p className="text-[10px] font-black text-zinc-600 mb-1 uppercase tracking-widest">Streams</p>
                  <p className="text-xl font-black italic">{Object.values(trackStats).reduce((a,b)=>a+b.count,0)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* PLAYLIST PICKER */}
      <AnimatePresence>
        {playlistPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1500] bg-black/80 backdrop-blur-md flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="w-full bg-zinc-900 rounded-t-[40px] p-8 space-y-4 pb-20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black italic uppercase">Add to...</h3>
                <button onClick={() => setPlaylistPicker(null)} className="p-2 text-zinc-500"><svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              {playlists.map(pl => (
                <button key={pl.id} onClick={() => addTrackToPlaylist(playlistPicker, pl.id)} className="w-full p-5 bg-white/5 rounded-2xl flex justify-between font-bold uppercase text-sm">
                  {pl.name} <span>{pl.tracks.length} tracks</span>
                </button>
              ))}
              {playlists.length === 0 && <p className="text-zinc-600 text-center py-4 font-bold uppercase text-[10px]">No playlists yet</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SELECTED PLAYLIST VIEW */}
      <AnimatePresence>
        {selectedPlaylist && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-[1200] bg-black pt-12 px-6 pb-20 overflow-y-auto no-scrollbar">
            <header className="flex justify-between items-center mb-8">
              <button onClick={() => setSelectedPlaylist(null)} className="p-4 bg-zinc-900 rounded-2xl"><svg viewBox="0 0 24 24" className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" strokeWidth="4"><path d="M9 18l6-6-6-6" /></svg></button>
              <h3 className="text-xl font-black italic uppercase">{selectedPlaylist.name}</h3>
              <div className="w-10" />
            </header>
            <div className="space-y-4 mb-48">
              {selectedPlaylist.tracks.map(t => (
                <TrackItem key={t.id} track={t} isActive={playback.currentTrack?.id === t.id} isPlaying={playback.isPlaying} onPlay={onPlay} onFav={toggleFavorite} isFav={favorites.some(f=>f.id===t.id)} onAdd={()=>setPlaylistPicker(t)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAV BAR */}
      <nav className="h-[96px] bg-black/95 backdrop-blur-3xl border-t border-white/5 grid grid-cols-5 items-center px-4 z-[1100] pb-[calc(var(--safe-bottom)+8px)] fixed bottom-0 left-0 right-0">
        {[
          { id: 'home', icon: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7h-4v7H4a1 1 0 01-1-1V9.5z" />, label: 'RADIO' },
          { id: 'search', icon: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>, label: 'SEARCH', stroke: 3.5 },
          { id: 'ai', icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />, label: 'NOVA AI', stroke: 3.5 },
          { id: 'media', icon: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />, label: 'MEDIA' },
          { id: 'stats', icon: <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />, label: 'DATA', stroke: 3.5 }
        ].map((item) => (
          <button key={item.id} onClick={() => { setActiveTab(item.id as any); setSelectedPlaylist(null); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-[#1DB954]' : 'text-zinc-600'}`}>
            <div className={`p-2.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-[#1DB954]/15' : ''}`}>
              <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" fill={item.stroke ? "none" : "currentColor"} stroke={item.stroke ? "currentColor" : "none"} strokeWidth={item.stroke || 0}>{item.icon}</svg>
            </div>
            <span className="text-[8px] font-black tracking-widest uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* THE MASTER PLAYER (MINI + FULL MERGED) */}
      <AnimatePresence>
        {playback.currentTrack && (
          <motion.div 
            layout
            key="master-player"
            initial={{ y: 200 }}
            animate={{ 
              y: 0,
              height: showPlayer ? '100%' : '84px',
              bottom: showPlayer ? 0 : 110,
              left: showPlayer ? 0 : 16,
              right: showPlayer ? 0 : 16,
              borderRadius: showPlayer ? 0 : 24,
              paddingTop: showPlayer ? 'env(safe-area-inset-top)' : '0px'
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed z-[2000] bg-[#121212] overflow-hidden border border-white/5 shadow-2xl ${showPlayer ? 'spotify-gradient' : 'backdrop-blur-xl bg-opacity-90'}`}
          >
            {/* MINI PLAYER CONTENT */}
            {!showPlayer && (
              <div className="h-full flex items-center px-4 gap-4" onClick={() => setShowPlayer(true)}>
                <img src={playback.currentTrack.cover} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate uppercase">{playback.currentTrack.title}</p>
                  <p className="text-[9px] font-bold text-[#1DB954] uppercase">{playback.currentTrack.artist}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setPlayback(p => ({...p, isPlaying: !p.isPlaying})) }} className="p-4 bg-white text-black rounded-full">
                  {playback.isPlaying ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z" /></svg>}
                </button>
              </div>
            )}

            {/* FULL PLAYER CONTENT */}
            {showPlayer && (
              <div className="h-full flex flex-col overflow-y-auto no-scrollbar">
                <div className="shrink-0 p-8 flex justify-between items-center">
                  <button onClick={() => setShowPlayer(false)} className="p-4 bg-white/5 rounded-2xl"><svg viewBox="0 0 24 24" className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" strokeWidth="4"><path d="M9 18l6-6-6-6" /></svg></button>
                  <p className="text-[10px] font-black italic tracking-widest text-[#1DB954] uppercase">Playing Now</p>
                  <button onClick={() => toggleFavorite(playback.currentTrack!)} className={`p-4 bg-white/5 rounded-2xl ${favorites.some(f=>f.id===playback.currentTrack?.id) ? 'text-[#1DB954]' : ''}`}><svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg></button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
                  <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} src={playback.currentTrack.cover} className="w-72 h-72 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10" />
                  
                  <div className="text-center w-full px-4">
                    <h2 className="text-2xl font-black italic uppercase truncate">{playback.currentTrack.title}</h2>
                    <p className="text-[#1DB954] font-black uppercase tracking-widest text-xs mt-2">{playback.currentTrack.artist}</p>
                  </div>

                  <div className="w-full space-y-4 px-4">
                    <input type="range" min="0" max={playback.duration || 100} value={playback.currentTime} onChange={e => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none accent-[#1DB954]" />
                    <div className="flex justify-between text-[10px] font-black text-zinc-600">
                      <span>{formatTime(playback.currentTime)}</span>
                      <span>{formatTime(playback.duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full px-4">
                    <button onClick={() => { const idx = playback.queue.findIndex(t=>t.id===playback.currentTrack?.id); onPlay(playback.queue[(idx-1+playback.queue.length)%playback.queue.length], playback.queue); }} className="p-6 bg-white/5 rounded-full"><svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg></button>
                    <button onClick={() => setPlayback(p => ({...p, isPlaying: !p.isPlaying}))} className="p-10 bg-white text-black rounded-[40px]">
                      {playback.isPlaying ? <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z" /></svg>}
                    </button>
                    <button onClick={() => { const idx = playback.queue.findIndex(t=>t.id===playback.currentTrack?.id); onPlay(playback.queue[(idx+1)%playback.queue.length], playback.queue); }} className="p-6 bg-white/5 rounded-full"><svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z" /></svg></button>
                  </div>

                  {/* EFFECTS SECTION - ДОДАНО СКРОЛ І ВИРІВНЯНО */}
                  <div className="w-full bg-zinc-900/50 p-6 rounded-[32px] border border-white/5 space-y-6 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Signal Processing</span>
                      <span className="text-[10px] font-bold text-[#1DB954]">{playbackSpeed.toFixed(1)}x Speed</span>
                    </div>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={playbackSpeed} onChange={e => { const v = Number(e.target.value); setPlaybackSpeed(v); audioEngine.setSpeed(v); }} className="w-full h-1 bg-zinc-800 rounded-full accent-[#1DB954]" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => { setIsNightcore(!isNightcore); audioEngine.setNightcore(!isNightcore); if(!isNightcore) setPlaybackSpeed(1.3); else setPlaybackSpeed(1.0); }} className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${isNightcore ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20' : 'bg-zinc-800 text-zinc-600'}`}>Nightcore</button>
                      <button onClick={() => { setIs8D(!is8D); audioEngine.toggle8D(!is8D); }} className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${is8D ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20' : 'bg-zinc-800 text-zinc-600'}`}>8D Spatial</button>
                    </div>

                    {is8D && (
                      <div className="flex items-center gap-2 justify-center text-[8px] font-black text-[#1DB954] animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                        SPATIAL AUDIO ACTIVE: PANNING ENABLED
                      </div>
                    )}
                  </div>
                </div>
                {/* Spacer for bottom of scroll */}
                <div className="h-20 shrink-0" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
