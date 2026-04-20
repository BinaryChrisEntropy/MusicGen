"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import { Play, Pause, Trash2, Download, Music, Wand2, Activity } from 'lucide-react';

// --- Types ---
type Sample = {
  id: string;
  prompt: string;
  genre: string;
  emotion: string;
  duration: number;
  createdAt: Date;
};

const GENRES = ["Ambient", "Synthwave", "Lo-Fi", "Cinematic", "Electronic", "Jazz", "Cyberpunk", "Classical", "Metal", "Rock", "Techno", "HipHop"];
const EMOTIONS = ["Chill", "Energetic", "Melancholic", "Happy", "Dark", "Ethereal", "Aggressive", "Uplifting"];

// --- Mock Data ---
const MOCK_SAMPLES: Sample[] = [
  {
    id: "1",
    prompt: "A rainy night in neo-tokyo with neon lights flickering",
    genre: "Cyberpunk",
    emotion: "Dark",
    duration: 120, // seconds
    createdAt: new Date(Date.now() - 10000)
  },
  {
    id: "2",
    prompt: "Sitting by the fireplace drinking hot cocoa",
    genre: "Lo-Fi",
    emotion: "Chill",
    duration: 180,
    createdAt: new Date(Date.now() - 500000)
  }
];

export default function MusicGen() {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Synthwave");
  const [emotion, setEmotion] = useState("Energetic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [samples, setSamples] = useState<Sample[]>(MOCK_SAMPLES);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [visualizerType, setVisualizerType] = useState<'waveform' | 'frequency'>('waveform');
  
  const handleGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true);
    
    // Simulate generation delay
    setTimeout(() => {
      const newSample: Sample = {
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        genre,
        emotion,
        duration: Math.floor(Math.random() * 120) + 60,
        createdAt: new Date()
      };
      setSamples([newSample, ...samples]);
      setIsGenerating(false);
      setPrompt("");
    }, 3000);
  };

  const handleDelete = (id: string) => {
    setSamples(samples.filter(s => s.id !== id));
    if (playingId === id) setPlayingId(null);
  };

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
    }
  };

  const currentSample = samples.find(s => s.id === playingId);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Music size={48} color="var(--accent-primary)" />
          <h1 className={styles.title}>AudioX<span className="glow-text">Gen</span></h1>
        </div>
        <p className={styles.subtitle}>
          Create breathtaking, studio-quality music from pure imagination. Choose your style, feeling, and hit generate.
        </p>
      </header>

      <div className={styles.mainGrid}>
        {/* Left Column: Controls */}
        <section className={`glass-panel ${styles.glassCard}`}>
          <h2 className={styles.sectionTitle}><Wand2 size={20} /> Creation Forge</h2>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Prompt</label>
            <textarea 
              className={styles.textarea}
              placeholder="Describe the sound, instruments, or the scene you want to hear..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Genre</label>
            <div className={styles.chipGrid}>
              {GENRES.map(g => (
                <div 
                  key={g} 
                  className={`${styles.chip} ${genre === g ? styles.active : ''}`}
                  onClick={() => setGenre(g)}
                >
                  {g}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Emotion</label>
            <div className={styles.chipGrid}>
              {EMOTIONS.map(e => (
                <div 
                  key={e} 
                  className={`${styles.emotionChip} ${emotion === e ? styles.active : ''}`}
                  onClick={() => setEmotion(e)}
                >
                  {e}
                </div>
              ))}
            </div>
          </div>

          <button 
            className={styles.generateBtn} 
            disabled={!prompt || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <div className="loading-bars" style={{ justifyContent: 'center' }}>
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            ) : (
              <>Generate Track</>
            )}
          </button>
        </section>

        {/* Right Column: Library */}
        <section className={`glass-panel ${styles.glassCard}`}>
          <h2 className={styles.sectionTitle}><Activity size={20} /> Library</h2>
          
          {samples.length === 0 ? (
            <div className={styles.emptyState}>
              <Music size={48} />
              <p>Your library is empty. Generate a track to get started.</p>
            </div>
          ) : (
            <div className={styles.sampleList}>
              {samples.map((sample, idx) => (
                <div key={sample.id} className={`${styles.sampleItem} anim-slide-up`} style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className={styles.sampleInfo}>
                    <button className={styles.playBtn} onClick={() => togglePlay(sample.id)}>
                      {playingId === sample.id ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: "3px" }} />}
                    </button>
                    <div className={styles.sampleText}>
                      <span className={styles.sampleTitle}>{sample.prompt.length > 40 ? sample.prompt.substring(0, 40) + '...' : sample.prompt}</span>
                      <div className={styles.sampleTags}>
                        <span>{sample.genre}</span> • <span>{sample.emotion}</span> • <span>{Math.floor(sample.duration / 60)}:{(sample.duration % 60).toString().padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.sampleActions}>
                    <button className={styles.actionBtn}><Download size={18} /></button>
                    <button className={styles.actionBtn} onClick={() => handleDelete(sample.id)}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Audio Player Bar */}
      <div className={`${styles.playerBar} ${currentSample ? styles.visible : ''}`}>
        <div className={styles.playerInfo}>
          {currentSample && (
            <div className={styles.sampleText}>
              <span className={styles.sampleTitle} style={{ fontSize: '0.9rem' }}>{currentSample.prompt.substring(0, 20)}...</span>
              <span className={styles.sampleTags} style={{ marginTop: '2px' }}>{currentSample.genre}</span>
            </div>
          )}
        </div>
        
        <div className={styles.playerControls}>
          <div className={styles.controlsMain}>
            <button className={styles.mainPlayBtn} onClick={() => currentSample && togglePlay(currentSample.id)}>
              {playingId ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" style={{ marginLeft: "4px" }} />}
            </button>
            <button 
              className={styles.viewToggleBtn} 
              onClick={() => setVisualizerType(prev => prev === 'waveform' ? 'frequency' : 'waveform')}
            >
              Mode: {visualizerType === 'waveform' ? 'Wave' : 'Freq'}
            </button>
          </div>
          <Waveform isPlaying={!!playingId} type={visualizerType} />
        </div>

        <div style={{ width: '250px', textAlign: 'right' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>MOCKED AUDIO</span>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>
          Released under the MIT License. Developed with the assistance of AI.<br />
          <span style={{ opacity: 0.8 }}>Note: All audio tracks are generated dynamically via AI models.</span><br /><br />
          Typography: <a href="https://fonts.google.com/specimen/Outfit" target="_blank" rel="noreferrer">Outfit</a> & <a href="https://fonts.google.com/specimen/Inter" target="_blank" rel="noreferrer">Inter</a> via Google Fonts. 
          Icons provided by <a href="https://lucide.dev" target="_blank" rel="noreferrer">Lucide React</a>.
        </p>
      </footer>
    </div>
  );
}

// Minimal Waveform Visualizer
function Waveform({ isPlaying, type }: { isPlaying: boolean, type: 'waveform' | 'frequency' }) {
  const [bars, setBars] = useState<number[]>([]);
  
  useEffect(() => {
    // Generate 40 static bars first
    const newBars = Array.from({ length: 50 }, () => Math.random() * 60 + 10);
    setBars(newBars);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setBars(prevBars => prevBars.map(b => {
          // gently randomize around current value
          let newVal = b + (Math.random() * 20 - 10);
          if (newVal > 100) newVal = 100;
          if (newVal < 10) newVal = 10;
          return newVal;
        }));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className={`${styles.waveform} ${type === 'frequency' ? styles.frequency : ''}`}>
      {bars.map((bar, i) => (
        <div 
          key={i} 
          className={styles.waveBar} 
          style={{ 
            height: isPlaying ? `${bar}%` : '4px',
            backgroundColor: isPlaying ? 'var(--accent-secondary)' : 'rgba(255, 255, 255, 0.2)'
          }} 
        />
      ))}
    </div>
  );
}
