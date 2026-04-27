import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Cpu,
  Download,
  FileText,
  Mic2,
  Search,
  Sparkles,
  Volume2,
  Wand2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';

function App() {
  const [mode, setMode] = useState('tts');
  const [text, setText] = useState('Hello! I am Kokoro, a high-quality text-to-speech engine. How can I help you today?');
  const [prompt, setPrompt] = useState('');
  const [voice, setVoice] = useState('af_bella');
  const [speed, setSpeed] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [voices] = useState([
    'af_bella',
    'af_sarah',
    'af_nicole',
    'af_sky',
    'af_heart',
    'am_adam',
    'am_michael',
    'bf_emma',
    'bf_isabella',
    'bm_george',
  ]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const estimatedSeconds = useMemo(() => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (!words) return 0;
    const wordsPerMinute = 145 * speed;
    return Math.max(1, Math.round((words / wordsPerMinute) * 60));
  }, [speed, text]);

  const voiceLabel = useMemo(() => {
    return voice
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [voice]);

  const generateScript = async () => {
    if (!prompt.trim()) return;
    setAgentLoading(true);

    try {
      const response = await fetch('/agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate script');
      }

      const data = await response.json();
      if (data.success) {
        setText(data.script);
        setMode('tts');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setAgentLoading(false);
    }
  };

  const generateTTS = async () => {
    if (!text.trim()) return;
    setLoading(true);

    try {
      const response = await fetch('/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();
      if (data.success) {
        const byteCharacters = atob(data.audio_base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i += 1) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        setAudioUrl(url);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error connecting to backend. Make sure the FastAPI server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="ambient" aria-hidden="true">
        <div className="ambient-orb orb-coral"></div>
        <div className="ambient-orb orb-cyan"></div>
        <div className="ambient-orb orb-lime"></div>
      </div>

      <div className="hero-grid">
        <motion.section
          className="hero-panel"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="hero-kicker">
            <Sparkles size={16} />
            Voice Workflow Studio
          </div>
          <h1>
            Make scripts <span className="hero-gradient">sound cinematic.</span>
          </h1>
          <p className="hero-copy">
            Research a topic, turn it into a polished script, and render audio with Kokoro in one sharp workspace.
            The new visual system leans bright and energetic without feeling like a generic SaaS clone.
          </p>

          <div className="hero-stats">
            <div className="stat-card">
              <strong>2 modes</strong>
              <span>Idea-to-script and direct text-to-speech in one flow.</span>
            </div>
            <div className="stat-card">
              <strong>10 voices</strong>
              <span>Quick persona switching for narration, explainers, and demos.</span>
            </div>
            <div className="stat-card">
              <strong>{speed.toFixed(1)}x</strong>
              <span>Live pacing control before you generate the final output.</span>
            </div>
          </div>
        </motion.section>

        <motion.aside
          className="hero-side"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <div className="mini-card primary">
            <div className="mini-card-eyebrow">
              <Wand2 size={16} />
              Current Focus
            </div>
            <h2>Bright accents, layered depth, tighter hierarchy.</h2>
            <p>
              Coral, cyan, and lime give the UI more personality while darker surfaces keep the controls readable and premium.
            </p>
            <div className="chip-list">
              <span className="chip">
                <Cpu size={16} />
                Research Agent
              </span>
              <span className="chip">
                <FileText size={16} />
                Script Editing
              </span>
              <span className="chip">
                <Volume2 size={16} />
                Audio Preview
              </span>
            </div>
          </div>

          <div className="mini-card">
            <div className="mini-card-eyebrow">
              <ChevronRight size={16} />
              Active Voice
            </div>
            <h3>{voiceLabel}</h3>
            <p>Estimated playback for the current script is about {estimatedSeconds} seconds at the selected speed.</p>
          </div>
        </motion.aside>
      </div>

      <motion.section
        className="workspace-panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.12 }}
      >
        <div className="workspace-header">
          <div>
            <h2>Compose and Generate</h2>
            <p>Start with an AI brief or jump straight into voice rendering. The layout stays focused on the core workflow.</p>
          </div>
          <div className="workspace-badge">
            <Mic2 size={16} />
            Kokoro + Gemini Stack
          </div>
        </div>

        <div className="mode-tabs">
          <button className={`tab ${mode === 'agent' ? 'active' : ''}`} onClick={() => setMode('agent')}>
            <Cpu size={18} />
            AI Content Agent
          </button>
          <button className={`tab ${mode === 'tts' ? 'active' : ''}`} onClick={() => setMode('tts')}>
            <Mic2 size={18} />
            Direct TTS
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'agent' ? (
            <motion.div
              key="agent-mode"
              className="mode-content"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
            >
              <div className="prompt-panel">
                <div className="section-topline">
                  <label htmlFor="topic-prompt">What should the agent write about?</label>
                  <span className="eyebrow-note">
                    <Sparkles size={14} />
                    Web research plus script drafting
                  </span>
                </div>

                <div className="prompt-grid">
                  <div className="search-container">
                    <input
                      id="topic-prompt"
                      type="text"
                      placeholder="Write a documentary-style script on Iran vs USA relations..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && generateScript()}
                    />
                    <button className="search-btn" onClick={generateScript} disabled={agentLoading} aria-label="Generate script">
                      {agentLoading ? <div className="spinner-small"></div> : <Search size={20} />}
                    </button>
                  </div>
                  <p className="field-note">Use this when you want the app to gather context first, then drop the finished script into the editor.</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tts-mode"
              className="mode-content"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
            >
              <div className="input-panel">
                <div className="section-topline">
                  <label htmlFor="script-input">Script Content</label>
                  {text.length > 0 && <span className="char-count">{text.length.toLocaleString()} chars</span>}
                </div>
                <textarea
                  id="script-input"
                  placeholder="Paste your script, narration, or explainer here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <p className="field-note">Keep the copy conversational and sentence-shaped for the most natural voice output.</p>
              </div>

              <div className="controls-panel">
                <div className="controls-row">
                  <div className="control-card">
                    <h3>Voice Persona</h3>
                    <p>Pick the character that best matches the pacing and tone of your script.</p>
                    <select value={voice} onChange={(e) => setVoice(e.target.value)}>
                      {voices.map((item) => (
                        <option key={item} value={item}>
                          {item
                            .split('_')
                            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                            .join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="control-card">
                    <div className="speed-card-top">
                      <div>
                        <h3>Speech Speed</h3>
                        <p>Shape the energy of the delivery before rendering audio.</p>
                      </div>
                      <span className="speed-value">{speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    />
                    <div className="range-labels">
                      <span>0.5x</span>
                      <span>Balanced</span>
                      <span>2.0x</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="quick-metrics">
                <div className="metric-tile">
                  <span>Playback</span>
                  <strong>{estimatedSeconds}s</strong>
                </div>
                <div className="metric-tile">
                  <span>Selected Voice</span>
                  <strong>{voiceLabel}</strong>
                </div>
                <div className="metric-tile">
                  <span>Workflow</span>
                  <strong>Ready to render</strong>
                </div>
              </div>

              <button className="generate-btn" onClick={generateTTS} disabled={loading}>
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate Audio
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {audioUrl && (
            <motion.div
              className="audio-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div className="audio-header">
                <div className="status">
                  <div className="pulse-dot"></div>
                  <span>Audio engine ready</span>
                </div>
                <a href={audioUrl} download="ai_speech.wav" className="download-link">
                  <Download size={16} />
                  Download WAV
                </a>
              </div>
              <audio controls key={audioUrl} autoPlay>
                <source src={audioUrl} type="audio/wav" />
              </audio>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <motion.footer
        className="footer-panel"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        <div className="footer-signal">
          <Sparkles size={16} />
          Built for faster script-to-voice iteration
        </div>
        <p>LangChain, Gemini 1.5, and Kokoro TTS in a brighter product shell.</p>
      </motion.footer>
    </div>
  );
}

export default App;
