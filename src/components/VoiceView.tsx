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
  
  // Audio Playback
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Suggested Voice Commands
  const voicePrompts: { text: string; lang: 'en' | 'sw'; icon: string }[] = [
    { text: 'Where is my order #OMNI-99321?', lang: 'en', icon: '📦' },
    { text: 'What is your refund policy?', lang: 'en', icon: '💸' },
    { text: 'Nataka kujua hali ya oda yangu.', lang: 'sw', icon: '🇹🇿' },
    { text: 'Naweza kurudisha bidhaa ndani ya siku ngapi?', lang: 'sw', icon: '🔄' }
  ];

  // Helper: converts a base64 string back into audio for browser playback
  const playBase64Audio = (base64Data: string) => {
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setVoiceStatus('speaking');
      }
    } catch (e) {
      console.error('Playback fail', e);
    }
  };

  // Simulate Recording and Trigger process API
  const handleMicrophoneClick = async () => {
    if (voiceStatus === 'speaking' || voiceStatus === 'processing') {
      // stop audio playback or stop loading
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setVoiceStatus('idle');
      return;
    }

    if (voiceStatus === 'recording') {
      // STOP recording & submit mock sound bytes
      setVoiceStatus('processing');
      setErrorMsg(null);
      
      const queryText = selectedLanguage === 'en' 
        ? 'Where is my order #OMNI-99321? Standard shipping.'
        : 'Nataka kujua hali ya oda yangu.';
        
      await runVoiceAI(queryText);
      return;
    }

    // START recording
    setUserTranscript('');
    setAiResponseText('');
    setVoiceStatus('recording');
  };

  // Run Voice Processing Pipeline
  const runVoiceAI = async (queryText: string) => {
    setVoiceStatus('processing');
    const start = Date.now();
    try {
      // We send a dummy wav base64 string to simulate standard speech stream
      const dummyWavBase64 = 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA==';

      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'conv-101',
          audio: dummyWavBase64,
          language: selectedLanguage,
          voiceName: selectedVoice
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUserTranscript(data.transcription || queryText);
        setAiResponseText(data.assistantMessage.content);
        setLatency(Date.now() - start);

        if (data.audioResponse) {
          playBase64Audio(data.audioResponse);
        } else {
          setVoiceStatus('idle');
        }
      } else {
        throw new Error('Server returned an error');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Voice AI service is busy. Please try clicking a pre-configured scenario below!');
      setVoiceStatus('idle');
    }
  };

  const selectSuggestedPrompt = async (prompt: { text: string; lang: 'en' | 'sw' }) => {
    setSelectedLanguage(prompt.lang);
    setUserTranscript(prompt.text);
    setAiResponseText('');
    await runVoiceAI(prompt.text);
  };

  return (
    <div className="flex-1 bg-[#090D16] p-8 overflow-y-auto flex flex-col md:flex-row gap-8" id="voice-view">
      {/* LEFT: Central Voice Console */}
      <div className="flex-1 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-8 flex flex-col items-center justify-center relative min-h-[500px]">
        {/* Dynamic status tag */}
        <span className={`absolute top-6 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
          voiceStatus === 'recording' 
            ? 'bg-rose-950/60 text-rose-400 animate-pulse border border-rose-800/30'
            : voiceStatus === 'speaking' 
              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/30'
              : voiceStatus === 'processing'
                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/30'
                : 'bg-[#1E293B] text-gray-400'
        }`}>
          <Activity className="w-3.5 h-3.5" />
          Status: {voiceStatus === 'idle' ? 'Idle' : voiceStatus}
        </span>

        {/* Beautiful Pulsing Waveform Ring */}
        <div className="my-12 relative flex items-center justify-center">
          {voiceStatus === 'recording' && (
            <>
              <div className="absolute w-44 h-44 bg-rose-500/10 rounded-full animate-ping"></div>
              <div className="absolute w-36 h-36 bg-rose-500/20 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
            </>
          )}
          {voiceStatus === 'speaking' && (
            <>
              <div className="absolute w-44 h-44 bg-emerald-500/10 rounded-full animate-pulse"></div>
              <div className="absolute w-36 h-36 bg-emerald-500/20 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </>
          )}
          {voiceStatus === 'processing' && (
            <div className="absolute w-40 h-40 border-4 border-dashed border-cyan-500/30 rounded-full animate-spin"></div>
          )}

          <button
            onClick={handleMicrophoneClick}
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl relative z-10 transition-all duration-300 ${
              voiceStatus === 'recording'
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : voiceStatus === 'speaking'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white'
            }`}
          >
            {voiceStatus === 'recording' ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
          </button>
        </div>

        {/* Quick Instructions / Guidance */}
        <div className="text-center max-w-sm mb-6">
          <p className="text-white font-bold text-sm">
            {voiceStatus === 'idle' && 'Click the microphone to start speaking'}
            {voiceStatus === 'recording' && 'Listening... Click again when finished'}
            {voiceStatus === 'processing' && 'Synthesizing voice transcription...'}
            {voiceStatus === 'speaking' && 'Gemini is reading response audio...'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Toggle English or Swahili support below. Responses will be synthesized in your selected dialect instantly.
          </p>
        </div>

        {/* Language & Voice Selector */}
        <div className="w-full max-w-md bg-[#090D16] border border-[#1E293B] p-4 rounded-xl flex gap-4">
          <div className="flex-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Select Language</label>
            <div className="flex bg-[#0F172A] p-1 rounded-lg border border-[#1E293B]">
              <button
                onClick={() => setSelectedLanguage('en')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded transition-all duration-150 ${
                  selectedLanguage === 'en' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setSelectedLanguage('sw')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded transition-all duration-150 ${
                  selectedLanguage === 'sw' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Kiswahili
              </button>
            </div>
          </div>

          <div className="flex-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Prebuilt Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-[#0F172A] text-xs font-semibold text-white px-3 py-2 rounded-lg border border-[#1E293B] outline-none"
            >
              <option value="Zephyr">Zephyr (Mellow Male)</option>
              <option value="Kore">Kore (Polite Female)</option>
              <option value="Puck">Puck (Cheerful Pitch)</option>
            </select>
          </div>
        </div>

        {/* Real hidden audio component */}
        <audio 
          ref={audioRef} 
          className="hidden" 
          onEnded={() => setVoiceStatus('idle')}
        />
      </div>

      {/* RIGHT: Real-time Transcript & Suggested Scenarios */}
      <div className="w-full md:w-96 flex flex-col gap-6 shrink-0">
        {/* Real-time Transcription Log */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 flex-1 flex flex-col min-h-[250px]">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            Live Dialogue Console
          </h4>

          {errorMsg && (
            <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4 flex-1 overflow-y-auto">
            {userTranscript && (
              <div className="bg-[#090D16] border border-[#1E293B] p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Customer Speech Transcript</span>
                <p className="text-xs text-white leading-relaxed font-medium">{userTranscript}</p>
              </div>
            )}

            {aiResponseText && (
              <div className="bg-[#090D16] border border-[#1E293B] p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Gemini Support Agent Answer
                </span>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">{aiResponseText}</p>
              </div>
            )}

            {!userTranscript && !aiResponseText && (
              <div className="text-center text-gray-500 py-12 italic text-xs">
                No active dialogue streams. Turn on the mic or trigger a suggested scenario below to test voice conversion logs.
              </div>
            )}
          </div>

          {latency && (
            <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-gray-400 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Network Roundtrip (RTT)
              </span>
              <span className="text-white font-mono font-bold">{latency} ms</span>
            </div>
          )}
        </div>

        {/* Suggested Scenarios */}
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-cyan-400" />
            Click-to-Speak Scenarios
          </h4>
          <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">Don't want to use your mic? Click any query below to run the Gemini Multilingual TTS & RAG loop instantly.</p>
          
          <div className="space-y-2.5">
            {voicePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => selectSuggestedPrompt(prompt)}
                className="w-full text-left bg-[#090D16] hover:bg-[#111A2D] border border-[#1E293B] p-3 rounded-xl transition-all duration-150 flex items-center gap-3 group"
              >
                <span className="text-lg bg-[#0F172A] p-1.5 rounded border border-[#1E293B] leading-none shrink-0">{prompt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate leading-tight">{prompt.text}</p>
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider mt-1 block">Language: {prompt.lang}</span>
                </div>
                <Play className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-150 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
