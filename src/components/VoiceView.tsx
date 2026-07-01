import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Activity, 
  Clock, 
  AlertCircle,
  Play,
  Languages,
  ChevronRight,
  Compass
} from 'lucide-react';

export default function VoiceView() {
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'sw'>('en');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiResponseText, setAiResponseText] = useState<string>('');
  const [latency, setLatency] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  // Audio Playback
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const userTranscriptRef = useRef<string>('');

  // Dynamically initialize a unique conversation ID for this user session to handle concurrent multi-user execution
  useEffect(() => {
    const initVoiceConversation = async () => {
      try {
        let visitorId = sessionStorage.getItem('duka_letu_voice_visitor_id');
        if (!visitorId) {
          visitorId = 'voice-' + Math.floor(10000 + Math.random() * 90000);
          sessionStorage.setItem('duka_letu_voice_visitor_id', visitorId);
        }

        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: visitorId,
            customerName: `Voice Session ${visitorId.split('-')[1]}`,
            language: selectedLanguage
          })
        });

        if (res.ok) {
          const data = await res.json();
          setActiveConversationId(data.id);
        } else {
          setActiveConversationId('conv-101');
        }
      } catch (e) {
        console.error('[VoiceView] Failed to initialize voice conversation, using conv-101 fallback:', e);
        setActiveConversationId('conv-101');
      }
    };

    initVoiceConversation();
  }, []);

  useEffect(() => {
    userTranscriptRef.current = userTranscript;
  }, [userTranscript]);

  // Stop all active voice emissions on tab switch / unmount
  useEffect(() => {
    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      } catch (e: any) {
        console.warn('[VoiceView] Cleanup pause fail:', e?.message || String(e));
      }
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch (e: any) {
        console.warn('[VoiceView] Cleanup synthesis fail:', e?.message || String(e));
      }
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e: any) {
        console.warn('[VoiceView] Cleanup recognition fail:', e);
      }
    };
  }, []);

  // Stop active playback immediately when language or voice options are toggled
  useEffect(() => {
    stopAllAudio();
    setVoiceStatus('idle');
  }, [selectedLanguage, selectedVoice]);

  // Suggested Voice Commands
  const voicePrompts: { text: string; lang: 'en' | 'sw'; icon: string }[] = [
    { text: 'Where is my order #OMNI-99321?', lang: 'en', icon: '📦' },
    { text: 'What is your refund policy?', lang: 'en', icon: '💸' },
    { text: 'Nataka kujua hali ya oda yangu.', lang: 'sw', icon: '🇹🇿' },
    { text: 'Naweza kurudisha bidhaa ndani ya siku ngapi?', lang: 'sw', icon: '🔄' }
  ];

  // Helper: converts a base64 string back into audio for browser playback
  const stopAllAudio = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      }
    } catch (e: any) {
      console.warn('[VoiceView] Error pausing HTML5 audio element:', e?.message || String(e));
    }
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e: any) {
      console.warn('[VoiceView] Error canceling speechSynthesis:', e?.message || String(e));
    }
  };

  const playBase64Audio = async (base64Data: string, fallbackText?: string, mimeType: string = 'audio/wav') => {
    try {
      stopAllAudio();

      if (!base64Data) {
        console.warn('No base64 audio data provided for playback.');
        setVoiceStatus('idle');
        return;
      }

      // Check for standard dummy/empty WAV returned on TTS API outage or rate limit
      const dummyWavBase64 = 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA==';
      if (base64Data === dummyWavBase64 && fallbackText) {
        if (selectedLanguage === 'sw') {
          console.log('[VoiceView] Dummy WAV received for Swahili. Fetching dedicated server-side fallback synthesis...');
          setVoiceStatus('processing');
          try {
            const synthRes = await fetch('/api/voice/synthesize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: fallbackText,
                language: 'sw',
                voiceName: selectedVoice
              })
            });
            if (synthRes.ok) {
              const synthData = await synthRes.json();
              if (synthData.audioResponse && synthData.audioResponse !== dummyWavBase64) {
                console.log(`[VoiceView] Server-side Swahili synthesis fallback succeeded using: ${synthData.provider}`);
                playBase64Audio(synthData.audioResponse, undefined, synthData.audioMimeType || 'audio/mpeg');
                return;
              }
            }
          } catch (fetchErr: any) {
            console.error('[VoiceView] Server-side Swahili synthesis fallback failed:', fetchErr?.message || String(fetchErr));
          }

          // If server-side fallback fails, check if browser has optional native Swahili voices
          console.log('[VoiceView] Server-side fallback failed or returned dummy. Checking browser optional speech synthesis...');
          if ('speechSynthesis' in window) {
            const voices = window.speechSynthesis.getVoices();
            const swahiliVoice = voices.find(v => {
              const lang = v.lang.toLowerCase();
              const name = v.name.toLowerCase();
              return lang.startsWith('sw') || name.includes('swahili') || name.includes('kiswahili');
            });

            if (swahiliVoice) {
              console.log(`[VoiceView] Utilizing optional native browser Swahili voice: ${swahiliVoice.name}`);
              const utterance = new SpeechSynthesisUtterance(fallbackText);
              utterance.voice = swahiliVoice;
              utterance.lang = swahiliVoice.lang;
              utterance.onstart = () => setVoiceStatus('speaking');
              utterance.onend = () => setVoiceStatus('idle');
              utterance.onerror = () => setVoiceStatus('idle');
              window.speechSynthesis.speak(utterance);
              return;
            } else {
              console.warn('[VoiceView] Diagnostic: Device browser has zero installed Swahili speech voices. Skipping browser TTS fallback to prevent unnatural pronunciation.');
            }
          }
          
          setVoiceStatus('idle');
          return;
        } else {
          // English Response Workflow
          console.log('[VoiceView] Backend TTS used mock wave. Initiating high-fidelity browser SpeechSynthesis fallback for English...');
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(fallbackText);
            utterance.lang = 'en-US';
            utterance.onstart = () => {
              setVoiceStatus('speaking');
            };
            utterance.onend = () => {
              setVoiceStatus('idle');
            };
            utterance.onerror = (e) => {
              console.warn('[VoiceView] SpeechSynthesis error:', e?.error || 'unknown speech synthesis error');
              setVoiceStatus('idle');
            };

            window.speechSynthesis.speak(utterance);
            return;
          }
        }
      }

      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const audioMimeType = mimeType || (base64Data.startsWith('SUQz') || base64Data.startsWith('//O') ? 'audio/mpeg' : 'audio/wav');
      const blob = new Blob([bytes], { type: audioMimeType });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().then(() => {
          setVoiceStatus('speaking');
        }).catch(playErr => {
          console.warn('[VoiceView] Audio play request was prevented or failed:', playErr?.message || String(playErr));
          // If auto-play was prevented or the format is unparseable, reset to idle safely
          setVoiceStatus('idle');
        });
      }
    } catch (e: any) {
      console.error('[VoiceView] Playback conversion fail:', e?.message || String(e));
      setVoiceStatus('idle');
    }
  };

  // Simulate/Execute Real Recording and Trigger process API
  const handleMicrophoneClick = async () => {
    if (voiceStatus === 'speaking' || voiceStatus === 'processing') {
      stopAllAudio();
      setVoiceStatus('idle');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      return;
    }

    if (voiceStatus === 'recording') {
      setVoiceStatus('processing');
      setErrorMsg(null);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('[VoiceView] Error stopping recognition:', e);
        }
      } else {
        const queryText = selectedLanguage === 'en' 
          ? 'Where is my order #OMNI-99321? Standard shipping.'
          : 'Nataka kujua hali ya oda yangu.';
        await runVoiceAI(queryText);
      }
      return;
    }

    // START recording - make sure any existing audio is fully silenced first
    stopAllAudio();
    setUserTranscript('');
    setAiResponseText('');
    setVoiceStatus('recording');
    setErrorMsg(null);

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage === 'sw' ? 'sw-KE' : 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          const currentText = finalTranscript || interimTranscript;
          if (currentText) {
            setUserTranscript(currentText);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('[VoiceView] Speech recognition error:', e);
        };

        recognition.onend = () => {
          console.log('[VoiceView] Speech recognition ended.');
          setVoiceStatus(prev => {
            if (prev === 'recording') {
              const textToSubmit = userTranscriptRef.current || (selectedLanguage === 'en' 
                ? 'Where is my order #OMNI-99321? Standard shipping.'
                : 'Nataka kujua hali ya oda yangu.');
              runVoiceAI(textToSubmit);
              return 'processing';
            }
            return prev;
          });
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('[VoiceView] Failed to start speech recognition:', err);
      }
    } else {
      console.log('[VoiceView] Web Speech API not supported. Falling back to simulation.');
    }
  };

  // Run Voice Processing Pipeline
  const runVoiceAI = async (queryText: string, forcedLang?: 'en' | 'sw') => {
    stopAllAudio();
    setVoiceStatus('processing');
    const start = Date.now();
    try {
      // We send a dummy wav base64 string to simulate standard speech stream
      const dummyWavBase64 = 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA==';

      // Ensure we have a valid unique conversation ID before processing
      let convId = activeConversationId;
      if (!convId) {
        let visitorId = sessionStorage.getItem('duka_letu_voice_visitor_id');
        if (!visitorId) {
          visitorId = 'voice-' + Math.floor(10000 + Math.random() * 90000);
          sessionStorage.setItem('duka_letu_voice_visitor_id', visitorId);
        }

        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: visitorId,
            customerName: `Voice Session ${visitorId.split('-')[1]}`,
            language: forcedLang || selectedLanguage
          })
        });

        if (createRes.ok) {
          const data = await createRes.json();
          convId = data.id;
          setActiveConversationId(convId);
        } else {
          convId = 'conv-101';
        }
      }

      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          audio: dummyWavBase64,
          language: forcedLang || selectedLanguage,
          voiceName: selectedVoice,
          text: queryText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUserTranscript(data.transcription || queryText);
        setAiResponseText(data.assistantMessage.content);
        setLatency(Date.now() - start);

        if (data.audioResponse) {
          playBase64Audio(data.audioResponse, data.assistantMessage?.content, data.audioMimeType);
        } else {
          setVoiceStatus('idle');
        }
      } else {
        throw new Error('Server returned an error');
      }
    } catch (e: any) {
      console.error('[VoiceView] runVoiceAI error:', e?.message || String(e));
      setErrorMsg('Voice AI service is busy. Please try clicking a pre-configured scenario below!');
      setVoiceStatus('idle');
    }
  };

  const selectSuggestedPrompt = async (prompt: { text: string; lang: 'en' | 'sw' }) => {
    setSelectedLanguage(prompt.lang);
    setUserTranscript(prompt.text);
    setAiResponseText('');
    await runVoiceAI(prompt.text, prompt.lang);
  };

  return (
    <div className="flex-1 bg-zinc-950 p-8 overflow-y-auto flex flex-col md:flex-row gap-8" id="voice-view">
      {/* LEFT: Central Voice Console */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-10 flex flex-col items-center justify-center relative min-h-[520px]">
        {/* Dynamic status tag */}
        <span className={`absolute top-8 px-4 py-1 rounded-full text-xs font-mono uppercase tracking-[0.5px] flex items-center gap-1.5 border ${
          voiceStatus === 'recording' 
            ? 'bg-rose-950 text-rose-400 border-rose-900/50'
            : voiceStatus === 'speaking' 
              ? 'bg-emerald-950 text-emerald-400 border-emerald-900/50'
              : voiceStatus === 'processing'
                ? 'bg-amber-950 text-amber-400 border-amber-900/50'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
        }`}>
          <Activity className="w-3.5 h-3.5" />
          {voiceStatus.toUpperCase()}
        </span>

        {/* Beautiful Pulsing Waveform Ring */}
        <div className="my-12 relative flex items-center justify-center">
          {voiceStatus === 'recording' && (
            <>
              <div className="absolute w-52 h-52 bg-rose-500/10 rounded-full animate-ping" />
              <div className="absolute w-40 h-40 bg-rose-500/20 rounded-full animate-ping" style={{ animationDelay: '280ms' }} />
            </>
          )}
          {voiceStatus === 'speaking' && (
            <>
              <div className="absolute w-52 h-52 bg-emerald-500/10 rounded-full animate-pulse" />
              <div className="absolute w-40 h-40 bg-emerald-500/20 rounded-full animate-pulse" style={{ animationDelay: '280ms' }} />
            </>
          )}
          {voiceStatus === 'processing' && (
            <div className="absolute w-48 h-48 border-4 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          )}

          <button
            onClick={handleMicrophoneClick}
            className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-4 border-zinc-800 ${
              voiceStatus === 'recording'
                ? 'bg-rose-600 hover:bg-rose-500'
                : voiceStatus === 'speaking'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-white text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            {voiceStatus === 'recording' ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
          </button>
        </div>

        {/* Quick Instructions / Guidance */}
        <div className="text-center max-w-sm">
          <p className="text-zinc-200 font-medium">
            {voiceStatus === 'idle' && 'Click the microphone to begin conversation'}
            {voiceStatus === 'recording' && 'Listening — click again to send'}
            {voiceStatus === 'processing' && 'Processing your request...'}
            {voiceStatus === 'speaking' && 'Agent is speaking...'}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Supports real-time English and Kiswahili voice interaction.
          </p>
        </div>

        {/* Language & Voice Selector */}
        <div className="w-full max-w-md mt-10 bg-zinc-950 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Language</label>
              <div className="flex bg-zinc-900 rounded-2xl p-1 border border-zinc-800">
                <button
                  onClick={() => setSelectedLanguage('en')}
                  className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all ${selectedLanguage === 'en' ? 'bg-white text-zinc-950 shadow' : 'text-zinc-400'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setSelectedLanguage('sw')}
                  className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all ${selectedLanguage === 'sw' ? 'bg-white text-zinc-950 shadow' : 'text-zinc-400'}`}
                >
                  Kiswahili
                </button>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Voice</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white px-4 py-3 rounded-2xl outline-none"
              >
                <option value="Zephyr">Zephyr (Mellow Male)</option>
                <option value="Kore">Kore (Polite Female)</option>
                <option value="Puck">Puck (Cheerful Pitch)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Real hidden audio component */}
        <audio 
          ref={audioRef} 
          className="hidden" 
          onEnded={() => setVoiceStatus('idle')}
          onError={() => setVoiceStatus('idle')}
        />
      </div>

      {/* RIGHT: Real-time Transcript & Suggested Scenarios */}
      <div className="w-full md:w-96 flex flex-col gap-6 shrink-0">
        {/* Real-time Transcription Log */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-7 flex-1 flex flex-col">
          <h4 className="font-semibold text-white flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-cyan-400" />
            Live Dialogue Console
          </h4>

          {errorMsg && (
            <div className="mb-6 bg-rose-950/30 border border-rose-900/50 text-rose-400 p-4 rounded-2xl flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}

          <div className="flex-1 space-y-6 overflow-y-auto pr-1">
            {userTranscript && (
              <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
                <div className="text-cyan-400 text-xs font-mono tracking-widest mb-2">YOU</div>
                <p className="text-zinc-100 text-sm leading-relaxed">{userTranscript}</p>
              </div>
            )}

            {aiResponseText && (
              <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
                <div className="text-emerald-400 text-xs font-mono tracking-widest mb-2">DUKA LETU AGENT</div>
                <p className="text-zinc-200 text-sm leading-relaxed">{aiResponseText}</p>
              </div>
            )}

            {!userTranscript && !aiResponseText && (
              <div className="h-full flex items-center justify-center text-center text-zinc-500 text-sm py-10">
                Your conversation will appear here
              </div>
            )}
          </div>
        </div>

        {/* Suggested Scenarios */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-7">
          <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            Quick Scenarios
          </h4>
          <p className="text-xs text-zinc-500 mb-6">Click any example to instantly run a full voice interaction flow.</p>
          
          <div className="space-y-3">
            {voicePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => selectSuggestedPrompt(prompt)}
                className="group w-full flex items-center gap-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 rounded-2xl transition-all text-left"
              >
                <div className="text-2xl bg-zinc-900 px-3 py-2 rounded-2xl border border-zinc-800">{prompt.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 line-clamp-1 group-hover:text-white">{prompt.text}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-1">{prompt.lang.toUpperCase()}</p>
                </div>
                <Play className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}