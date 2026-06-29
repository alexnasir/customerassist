import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  MessageSquare, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  Trash2, 
  Check, 
  LogOut, 
  Star,
  RefreshCw,
  Clock,
  ArrowRight,
  Globe,
  CornerDownLeft,
  VolumeX,
  Plus
} from 'lucide-react';
import { Conversation, Message } from '../types.js';

const PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Organic Swahili Arabica Blend',
    category: 'Coffee & Beverages',
    description: 'Single-origin premium arabica coffee beans handpicked from volcanic highlands. Features a medium body with deep notes of dark cocoa and sweet citrus.',
    price: 18.50,
    rating: 4.9,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1559056131-054941be9052?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    badge: 'Best Seller'
  },
  {
    id: 'prod-2',
    name: 'Masai Handwoven Beaded Basket',
    category: 'Crafts & Decor',
    description: 'Woven entirely from sustainably sourced sisal fibers and decorated with fine, vibrant glass beads by Masai women artisans in the Rift Valley.',
    price: 34.00,
    rating: 4.8,
    reviews: 86,
    image: 'https://images.unsplash.com/photo-1531835551805-16d864c8d311?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    badge: 'Artisanal'
  },
  {
    id: 'prod-3',
    name: 'Zanzibar Exotic Spice Infusion',
    category: 'Gourmet Food',
    description: 'An authentic culinary bundle featuring whole cloves, cardamom pods, organic cinnamon bark, and fresh nutmeg pods straight from Zanzibar\'s historic spice gardens.',
    price: 22.00,
    rating: 5.0,
    reviews: 93,
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    badge: 'Spice Island'
  },
  {
    id: 'prod-4',
    name: 'Serengeti Breathable Safari Hat',
    category: 'Apparel & Gear',
    description: 'Heavy-duty washed cotton safari hat. Features built-in UPF 50+ sun protection, dual mesh side vents, and an adjustable brass-fitted leather chin strap.',
    price: 29.50,
    rating: 4.7,
    reviews: 158,
    image: 'https://images.unsplash.com/photo-1533055640609-24b498dfd74c?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    badge: 'Adventure'
  },
  {
    id: 'prod-5',
    name: 'Handwoven Swahili Kikoy Wrap',
    category: 'Apparel & Gear',
    description: 'Traditional combed-cotton wrap adorned with hand-tied tassels. Extremely versatile - functions perfectly as a beach sarong, scarf, throw blanket, or towel.',
    price: 25.00,
    rating: 4.9,
    reviews: 112,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    badge: 'Traditional'
  }
];

const SUGGESTED_INQUIRIES = [
  { text: 'Do you ship standard standard shipping?', icon: '📦' },
  { text: 'Naweza kurudisha bidhaa baada ya siku ngapi?', icon: '🔄' },
  { text: 'Are Masai baskets handmade?', icon: '✨' },
  { text: 'Swahili Coffee blend origin details', icon: '☕' }
];

interface StorefrontViewProps {
  onLogout: () => void;
}

export default function StorefrontView({ onLogout }: StorefrontViewProps) {
  // Storefront state
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Widget State
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [widgetTab, setWidgetTab] = useState<'chat' | 'voice'>('chat');
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState<'en' | 'sw' | 'auto'>('auto');
  const [loading, setLoading] = useState(false);
  
  // Voice state
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'processing' | 'speaking'>('idle');
  const [voiceLang, setVoiceLang] = useState<'en' | 'sw'>('en');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponseText, setVoiceResponseText] = useState('');
  const [voiceLatency, setVoiceLatency] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>('');

  useEffect(() => {
    voiceTranscriptRef.current = voiceTranscript;
  }, [voiceTranscript]);
  
  // Rating/CSAT in Widget
  const [showCsat, setShowCsat] = useState(false);
  const [csatRating, setCsatRating] = useState(5);
  const [csatFeedback, setCsatFeedback] = useState('');
  const [csatSuccess, setCsatSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter products
  const filteredProducts = PRODUCTS.filter(prod => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || prod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Unique categories
  const categories = ['All', 'Coffee & Beverages', 'Crafts & Decor', 'Gourmet Food', 'Apparel & Gear'];

  // Handle adding items to cart
  const handleAddToCart = () => {
    setCartCount(prev => prev + 1);
  };

  // Audio helpers
  const stopAllAudio = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      }
    } catch (e) {
      console.warn('[Storefront] Audio stop failed:', e);
    }
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.warn('[Storefront] Speech synthesis stop failed:', e);
    }
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e) {
        console.warn('[Storefront] Recognition cleanup failed:', e);
      }
    };
  }, []);

  const playBase64Audio = async (base64Data: string, fallbackText?: string, mimeType: string = 'audio/wav') => {
    try {
      stopAllAudio();

      if (!base64Data) {
        setVoiceStatus('idle');
        return;
      }

      const dummyWavBase64 = 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA==';
      if (base64Data === dummyWavBase64 && fallbackText) {
        if (voiceLang === 'sw') {
          console.log('[Storefront] Dummy WAV received for Swahili. Fetching dedicated server-side fallback synthesis...');
          setVoiceStatus('processing');
          try {
            const synthRes = await fetch('/api/voice/synthesize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: fallbackText,
                language: 'sw',
                voiceName: 'Zephyr'
              })
            });
            if (synthRes.ok) {
              const synthData = await synthRes.json();
              if (synthData.audioResponse && synthData.audioResponse !== dummyWavBase64) {
                console.log(`[Storefront] Server-side Swahili synthesis fallback succeeded using: ${synthData.provider}`);
                playBase64Audio(synthData.audioResponse, undefined, synthData.audioMimeType || 'audio/mpeg');
                return;
              }
            }
          } catch (fetchErr: any) {
            console.error('[Storefront] Server-side Swahili synthesis fallback failed:', fetchErr?.message || String(fetchErr));
          }

          // If server-side fallback fails, check if browser has optional native Swahili voices
          console.log('[Storefront] Server-side fallback failed or returned dummy. Checking browser optional speech synthesis...');
          if ('speechSynthesis' in window) {
            const voices = window.speechSynthesis.getVoices();
            const swahiliVoice = voices.find(v => {
              const lang = v.lang.toLowerCase();
              const name = v.name.toLowerCase();
              return lang.startsWith('sw') || name.includes('swahili') || name.includes('kiswahili');
            });

            if (swahiliVoice) {
              console.log(`[Storefront] Utilizing optional native browser Swahili voice: ${swahiliVoice.name}`);
              const utterance = new SpeechSynthesisUtterance(fallbackText);
              utterance.voice = swahiliVoice;
              utterance.lang = swahiliVoice.lang;
              utterance.onstart = () => setVoiceStatus('speaking');
              utterance.onend = () => setVoiceStatus('idle');
              utterance.onerror = () => setVoiceStatus('idle');
              window.speechSynthesis.speak(utterance);
              return;
            } else {
              console.warn('[Storefront] Diagnostic: Device browser has zero installed Swahili speech voices. Skipping browser TTS fallback.');
            }
          }

          setVoiceStatus('idle');
          return;
        } else {
          // English Response Workflow
          console.log('[Storefront] Backend TTS used mock wave. Initiating high-fidelity browser SpeechSynthesis fallback for English...');
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
              console.warn('[Storefront] SpeechSynthesis error:', e?.error || 'unknown speech synthesis error');
              setVoiceStatus('idle');
            };

            window.speechSynthesis.speak(utterance);
            return;
          }
        }

        setVoiceStatus('idle');
        return;
      }

      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const audioMimeType = mimeType || (base64Data.startsWith('SUQz') || base64Data.startsWith('//O') ? 'audio/mpeg' : 'audio/wav');
      const blob = new Blob([bytes], { type: audioMimeType });
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().then(() => {
          setVoiceStatus('speaking');
        }).catch((err) => {
          console.warn('[Storefront] Play trigger failed/blocked:', err);
          // If browser blocked audio playback (e.g. need user interaction first / iframe restriction)
          // We can fall back to speechSynthesis if possible to ensure the response is read
          if (fallbackText && 'speechSynthesis' in window) {
            console.log('[Storefront] Browser blocked audio element play. Falling back to speechSynthesis...');
            const utterance = new SpeechSynthesisUtterance(fallbackText);
            utterance.lang = voiceLang === 'sw' ? 'sw-TZ' : 'en-US';
            utterance.onstart = () => setVoiceStatus('speaking');
            utterance.onend = () => setVoiceStatus('idle');
            utterance.onerror = () => setVoiceStatus('idle');
            window.speechSynthesis.speak(utterance);
          } else {
            setVoiceStatus('idle');
          }
        });
      }
    } catch (e) {
      console.error('[Storefront] Audio playback failed:', e);
      setVoiceStatus('idle');
    }
  };

  // Scroll to bottom of widget chat
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Widget initialization or check
  const ensureConversation = async (): Promise<Conversation | null> => {
    if (activeConv) return activeConv;

    try {
      // Look for any active conversations on the server
      const getRes = await fetch('/api/conversations');
      if (getRes.ok) {
        const convs = await getRes.json();
        const existingGuestConv = convs.find((c: any) => c.customerId === 'usr-4' && c.status === 'active');
        if (existingGuestConv) {
          setActiveConv(existingGuestConv);
          // Load messages
          const msgRes = await fetch(`/api/conversations/${existingGuestConv.id}/messages`);
          if (msgRes.ok) {
            const msgs = await msgRes.json();
            setMessages(msgs);
          }
          return existingGuestConv;
        }
      }

      // Create new conversation
      const postRes = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'usr-4',
          customerName: 'Inquiry Guest',
          language: language
        })
      });

      if (postRes.ok) {
        const newConv = await postRes.json();
        setActiveConv(newConv);
        setMessages([]);
        return newConv;
      }
    } catch (e) {
      console.error('[Storefront] Conversation setup failed:', e);
    }
    return null;
  };

  // Widget send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    if (!textToSend) setInputText('');
    setLoading(true);

    const conv = await ensureConversation();
    if (!conv) {
      setLoading(false);
      return;
    }

    // Optimistic user message update
    const tempMsg: Message = {
      id: `msg-temp-${Date.now()}`,
      conversationId: conv.id,
      sender: 'user',
      senderName: 'Inquiry Guest',
      content: text,
      type: 'text',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/conversations/${conv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          senderName: 'Inquiry Guest',
          content: text,
          language: language === 'auto' ? undefined : language
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempMsg.id);
          return [...filtered, data.userMessage, ...(data.assistantMessage ? [data.assistantMessage] : [])];
        });

        if (data.escalated) {
          setActiveConv(prev => prev ? { ...prev, status: 'escalated' } : null);
        }
      }
    } catch (err) {
      console.error('[Storefront] Send message failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Micro voice pipeline
  const handleVoiceButtonClick = async () => {
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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('[Storefront] Error stopping recognition:', e);
        }
      } else {
        const queryText = voiceLang === 'en' 
          ? 'Where is my order? Standard shipping check.'
          : 'Naweza kupata wapi kahawa ya Swahili?';
        await runVoiceAI(queryText, voiceLang);
      }
      return;
    }

    stopAllAudio();
    setVoiceTranscript('');
    setVoiceResponseText('');
    setVoiceStatus('recording');

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = voiceLang === 'sw' ? 'sw-KE' : 'en-US';

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
            setVoiceTranscript(currentText);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('[Storefront] Speech recognition error:', e);
        };

        recognition.onend = () => {
          console.log('[Storefront] Speech recognition ended.');
          setVoiceStatus(prev => {
            if (prev === 'recording') {
              const textToSubmit = voiceTranscriptRef.current || (voiceLang === 'en' 
                ? 'Where is my order? Standard shipping check.'
                : 'Naweza kupata wapi kahawa ya Swahili?');
              runVoiceAI(textToSubmit, voiceLang);
              return 'processing';
            }
            return prev;
          });
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('[Storefront] Failed to start speech recognition:', err);
      }
    } else {
      console.log('[Storefront] Web Speech API not supported in this browser. Falling back to click simulator.');
    }
  };

  // Preset voice/chat simulation query runner
  const runVoiceAI = async (queryText: string, lang: 'en' | 'sw') => {
    stopAllAudio();
    setVoiceTranscript(queryText);
    setVoiceResponseText('');
    setVoiceStatus('processing');

    const conv = await ensureConversation();
    if (!conv) {
      setVoiceStatus('idle');
      return;
    }

    const start = Date.now();
    try {
      const dummyWavBase64 = 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA==';
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conv.id,
          audio: dummyWavBase64,
          language: lang,
          voiceName: lang === 'sw' ? 'Zephyr' : 'Kore',
          text: queryText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVoiceTranscript(data.transcription || queryText);
        setVoiceResponseText(data.assistantMessage?.content || '');
        setVoiceLatency(Date.now() - start);

        const userMsg: Message = data.userMessage || {
          id: `msg-${Date.now()}-v-u`,
          conversationId: conv.id,
          sender: 'user',
          senderName: 'Inquiry Guest',
          content: queryText,
          type: 'text',
          timestamp: new Date().toISOString()
        };
        const aiMsg: Message = data.assistantMessage;

        setMessages(prev => [...prev, userMsg, ...(aiMsg ? [aiMsg] : [])]);

        if (data.audioResponse) {
          playBase64Audio(data.audioResponse, aiMsg?.content, data.audioMimeType);
        } else {
          setVoiceStatus('idle');
        }
      } else {
        setVoiceStatus('idle');
      }
    } catch (e) {
      console.error('[Storefront] Preset voice query failed:', e);
      setVoiceStatus('idle');
    }
  };

  // Submit Feedback / CSAT inside widget
  const handleCsatSubmit = async () => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: csatRating, feedback: csatFeedback })
      });
      if (res.ok) {
        setCsatSuccess(true);
        setTimeout(() => {
          setShowCsat(false);
          setCsatSuccess(false);
          setCsatFeedback('');
        }, 1800);
      }
    } catch (e) {
      console.error('[Storefront] CSAT submit failed:', e);
    }
  };

  // Resolve current chat sessions
  const handleResolveSession = () => {
    setShowCsat(true);
  };

  // Start fresh chat session
  const handleResetWidget = () => {
    setActiveConv(null);
    setMessages([]);
    stopAllAudio();
    setVoiceStatus('idle');
    setShowCsat(false);
  };

  return (
    <div className="min-h-screen bg-[#060813] text-gray-100 font-sans flex flex-col relative overflow-x-hidden pb-12">
      {/* Hidden fallback HTML5 audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Modern High-Contrast Store Header */}
      <header className="sticky top-0 z-40 bg-[#0A0E1A]/90 backdrop-blur-md border-b border-[#1E293B] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-xl flex items-center justify-center border border-cyan-500/30">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">Duka Letu</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Authentic Storefront</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search coffee, handwoven crafts, exotic spices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#05070C] border border-[#1E293B] hover:border-[#334155] focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none transition-all duration-150 shadow-inner"
            />
          </div>

          {/* Interactive Right utility menu */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 bg-cyan-950/20 border border-cyan-900/30 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Inquiry Guest Role
            </span>

            <div className="relative">
              <div className="p-2.5 bg-[#0D1120] border border-[#1E293B] rounded-xl hover:bg-[#151B2F] transition-all duration-150 cursor-pointer text-gray-300 relative">
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                    {cartCount}
                  </span>
                )}
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-rose-900/30 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Back to Panel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Box */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 mt-8 w-full">
        
        {/* Aesthetic Banner */}
        <div className="bg-gradient-to-r from-[#0D1120] via-[#090D18] to-[#121A30] border border-[#1E293B] rounded-2xl p-8 mb-10 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-xl relative z-10">
            <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/30 px-2.5 py-1 rounded border border-cyan-900/30 inline-block mb-3">
              Multilingual Widget Sandbox
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none mb-3">
              East Africa's Finest Crafts & Aromas
            </h1>
            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              Explore our boutique products. In the bottom right corner, you will find the <b>Duka Letu Floating Help Assistant</b>—the exact live widget integrated for website visitors! Click it to inquire about shipping, coffee origins, and return policies in English or Kiswahili.
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsWidgetOpen(true)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Test Live Widget Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter categories tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/50 shadow-inner'
                  : 'bg-[#0D1120] hover:bg-[#151B2F] text-gray-400 border-[#1E293B]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredProducts.map((prod) => (
            <div 
              key={prod.id}
              className="bg-[#0D1120] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-cyan-500/20 transition-all duration-300 flex flex-col group"
            >
              {/* Product Image Frame */}
              <div className="relative h-48 bg-gray-950 overflow-hidden">
                <img 
                  src={prod.image} 
                  alt={prod.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm border border-cyan-500/20 text-cyan-400 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded">
                  {prod.badge}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80"></div>
              </div>

              {/* Product details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block mb-1">
                    {prod.category}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors duration-150 line-clamp-1">
                    {prod.name}
                  </h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-2 line-clamp-3">
                    {prod.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#1E293B]/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Unit price</span>
                    <span className="text-base font-black text-white">${prod.price.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-white">{prod.rating}</span>
                    <span className="text-[10px] text-gray-500 font-medium">({prod.reviews})</span>
                  </div>
                </div>

                <div className="mt-4">
                  <button 
                    onClick={handleAddToCart}
                    className="w-full bg-[#151B30] hover:bg-cyan-950/30 text-gray-300 hover:text-cyan-400 border border-[#1E293B] hover:border-cyan-900/40 text-xs font-bold py-2.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center border border-[#1E293B] border-dashed rounded-2xl bg-[#090D15]/40">
              <p className="text-xs text-gray-500 italic">No boutique products match your active criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsWidgetOpen(!isWidgetOpen)}
          className={`w-14 h-14 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl border border-cyan-400/20 cursor-pointer relative group transition-transform duration-150 hover:scale-105 active:scale-95 ${
            isWidgetOpen ? 'rotate-90' : ''
          }`}
          id="floating-widget-toggle"
        >
          {isWidgetOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                1
              </span>
            </>
          )}
        </button>
      </div>

      {/* Embedded Floating Chat/Voice Support Widget */}
      <AnimatePresence>
        {isWidgetOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-22 right-6 w-96 h-[520px] bg-[#0C101E] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
            id="duka-letu-chat-widget"
          >
            {/* Widget Header */}
            <div className="bg-gradient-to-r from-[#0C101E] to-[#12182E] px-4 py-4 border-b border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 bg-cyan-950/60 rounded-lg border border-cyan-800/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0C101E]"></span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Duka Letu Assistant
                  </h4>
                  <p className="text-[9px] text-gray-500">Multilingual Chat & Voice Helper</p>
                </div>
              </div>

              {/* Actions & Tab Switcher */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWidgetTab(widgetTab === 'chat' ? 'voice' : 'chat')}
                  className="p-1.5 text-gray-400 hover:text-cyan-400 bg-[#070913] rounded-lg border border-[#1E293B] hover:border-cyan-900/30 transition-all duration-150 cursor-pointer"
                  title={widgetTab === 'chat' ? 'Switch to Voice Assistant' : 'Switch to Chat Assistant'}
                >
                  {widgetTab === 'chat' ? <Mic className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={handleResetWidget}
                  className="p-1.5 text-gray-400 hover:text-cyan-400 bg-[#070913] rounded-lg border border-[#1E293B] hover:border-cyan-900/30 transition-all duration-150 cursor-pointer"
                  title="Reset conversation session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsWidgetOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white bg-[#070913] rounded-lg border border-[#1E293B] transition-all duration-150 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Widget Sub Header with Controls (Language settings, actions) */}
            <div className="bg-[#070913] px-4 py-2 border-b border-[#1E293B]/60 flex items-center justify-between text-[10px] text-gray-400">
              {widgetTab === 'chat' ? (
                <>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-cyan-400" />
                    <span>Language Detector:</span>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-[#0C101E] border border-[#1E293B] rounded px-1.5 py-0.5 outline-none font-semibold text-white cursor-pointer"
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="en">English (EN)</option>
                    <option value="sw">Kiswahili (SW)</option>
                  </select>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-cyan-400" />
                    <span>Speech Language:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setVoiceLang('en')}
                      className={`px-1.5 py-0.5 rounded transition-all duration-150 font-bold ${
                        voiceLang === 'en' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/30' : 'bg-transparent text-gray-500'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setVoiceLang('sw')}
                      className={`px-1.5 py-0.5 rounded transition-all duration-150 font-bold ${
                        voiceLang === 'sw' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/30' : 'bg-transparent text-gray-500'
                      }`}
                    >
                      SW
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Widget Main Pane */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#0A0D18]/40 relative">
              
              {/* CSAT Overlay directly in widget */}
              <AnimatePresence>
                {showCsat && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 p-5 flex flex-col justify-center text-center"
                  >
                    {csatSuccess ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="space-y-2 text-center"
                      >
                        <div className="w-12 h-12 bg-emerald-950/60 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-800/30 mx-auto mb-2">
                          <Check className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-white">Thank you for your rating!</h4>
                        <p className="text-[10px] text-gray-400">Feedback successfully logged to Supabase.</p>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Rate Duka Letu Support</h4>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Your conversation will be closed. Please rate your experience to help us improve.
                        </p>
                        
                        <div className="flex items-center justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setCsatRating(star)}
                              className="p-1 transition-all hover:scale-110 cursor-pointer"
                            >
                              <Star className={`w-6 h-6 ${star <= csatRating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
                            </button>
                          ))}
                        </div>

                        <textarea
                          placeholder="Tell us what we did well or how we can improve..."
                          value={csatFeedback}
                          onChange={(e) => setCsatFeedback(e.target.value)}
                          className="w-full bg-[#05070C] border border-[#1E293B] focus:border-cyan-400 rounded-xl p-3 text-[11px] text-white outline-none min-h-[70px] resize-none"
                        />

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowCsat(false)}
                            className="flex-1 bg-[#1A1E2E] hover:bg-[#252A40] text-gray-400 text-xs py-2 rounded-xl border border-[#334155] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCsatSubmit}
                            className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs py-2 rounded-xl shadow-lg cursor-pointer font-bold"
                          >
                            Submit Rating
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {widgetTab === 'chat' ? (
                /* CHAT WIDGET VIEW */
                <div className="space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-4 overflow-y-auto flex-1 pr-1" style={{ maxHeight: '310px' }}>
                    
                    {/* Welcome message */}
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="w-6 h-6 bg-cyan-950/40 text-cyan-400 rounded-lg border border-cyan-900/30 flex items-center justify-center text-[10px] font-bold">
                        AI
                      </div>
                      <div className="bg-[#151B2F]/60 border border-[#1E293B]/60 rounded-2xl p-3 text-[11px] text-gray-300 leading-relaxed shadow-sm">
                        Habari! Hello! Welcome to <b>Duka Letu</b>. I can assist you with orders, shipping info, or products. How can I help today?
                      </div>
                    </div>

                    {messages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                            isUser 
                              ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' 
                              : 'bg-cyan-950/40 text-cyan-400 border border-cyan-900/30'
                          }`}>
                            {isUser ? 'ME' : 'AI'}
                          </div>
                          <div className={`p-3 rounded-2xl text-[11px] leading-relaxed border ${
                            isUser
                              ? 'bg-indigo-950/20 border-indigo-900/30 text-indigo-200'
                              : 'bg-[#151B2F]/40 border-[#1E293B]/40 text-gray-300'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}

                    {loading && (
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 italic">
                        <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                        <span>Duka Letu Assistant is processing...</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestion Chips */}
                  {messages.length === 0 && !loading && (
                    <div className="space-y-1.5 mt-auto">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Frequently Asked Questions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_INQUIRIES.map((chip, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(chip.text)}
                            className="bg-[#0D1120] hover:bg-[#1A223B] border border-[#1E293B] text-[10px] text-gray-300 px-2.5 py-1.5 rounded-xl transition-all duration-150 text-left flex items-center gap-1 cursor-pointer hover:border-cyan-900/40"
                          >
                            <span>{chip.icon}</span>
                            <span>{chip.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* VOICE WIDGET VIEW */
                <div className="h-full flex flex-col justify-between py-2">
                  <div className="text-center space-y-4">
                    <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold block">
                      Interactive Voice Mode
                    </span>
                    
                    {/* Pulsing micro voice module */}
                    <div className="flex items-center justify-center py-6">
                      <div className="relative">
                        <AnimatePresence>
                          {voiceStatus === 'recording' && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: [0.4, 0.1, 0.4], scale: [1, 2, 1] }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                              className="absolute inset-0 bg-red-500 rounded-full"
                            />
                          )}
                          {(voiceStatus === 'processing' || voiceStatus === 'speaking') && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: [0.4, 0.1, 0.4], scale: [1, 2, 1] }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                              className="absolute inset-0 bg-cyan-500 rounded-full"
                            />
                          )}
                        </AnimatePresence>

                        <button
                          onClick={handleVoiceButtonClick}
                          className={`w-20 h-20 rounded-full border flex items-center justify-center relative z-10 transition-all duration-200 cursor-pointer shadow-xl ${
                            voiceStatus === 'recording'
                              ? 'bg-rose-950 border-rose-500 text-rose-400 shadow-rose-950/50'
                              : voiceStatus === 'processing'
                              ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-cyan-950/50 animate-pulse'
                              : voiceStatus === 'speaking'
                              ? 'bg-indigo-950 border-indigo-500 text-indigo-400 shadow-indigo-950/50'
                              : 'bg-[#151B2F] border-[#1E293B] text-gray-300 hover:border-cyan-500/30'
                          }`}
                        >
                          {voiceStatus === 'recording' ? (
                            <MicOff className="w-8 h-8" />
                          ) : (
                            <Mic className="w-8 h-8" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Status feedback label */}
                    <div className="text-xs font-semibold text-white">
                      {voiceStatus === 'idle' && 'Tap microphone to start speaking'}
                      {voiceStatus === 'recording' && 'Listening... Tap again to send inquiry'}
                      {voiceStatus === 'processing' && 'Synthesizing voice transcription...'}
                      {voiceStatus === 'speaking' && 'Speaking audio reply...'}
                    </div>

                    {/* Transcripts container */}
                    <div className="space-y-3 mt-4 text-left">
                      {voiceTranscript && (
                        <div className="bg-indigo-950/15 border border-indigo-900/20 p-3 rounded-xl">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 block mb-1">You said:</span>
                          <p className="text-[11px] text-indigo-200 italic">"{voiceTranscript}"</p>
                        </div>
                      )}

                      {voiceResponseText && (
                        <div className="bg-[#151B2F]/60 border border-[#1E293B]/60 p-3 rounded-xl relative group">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-cyan-400 block mb-1 flex items-center justify-between">
                            <span>Assistant Response:</span>
                            {voiceLatency && <span className="font-mono text-gray-500 text-[8px]">Processed in {voiceLatency}ms</span>}
                          </span>
                          <p className="text-[11px] text-gray-300 leading-relaxed">{voiceResponseText}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* suggested voice helper scripts */}
                  <div className="bg-[#070913] p-2.5 rounded-xl border border-[#1E293B]/50 mt-4">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Say or type standard questions:
                    </span>
                    <div className="space-y-1">
                      {voiceLang === 'en' ? (
                        <>
                          <button 
                            onClick={() => { setVoiceTranscript('Do you ship standard standard shipping?'); runVoiceAI('Do you ship standard standard shipping?', 'en'); }}
                            className="w-full text-left text-[10px] text-cyan-400 hover:underline block truncate cursor-pointer"
                          >
                            1. "Do you ship standard standard shipping?"
                          </button>
                          <button 
                            onClick={() => { setVoiceTranscript('What is your return policy?'); runVoiceAI('What is your return policy?', 'en'); }}
                            className="w-full text-left text-[10px] text-cyan-400 hover:underline block truncate cursor-pointer"
                          >
                            2. "What is your return policy?"
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setVoiceTranscript('Hali ya oda yangu ikoje?'); runVoiceAI('Hali ya oda yangu ikoje?', 'sw'); }}
                            className="w-full text-left text-[10px] text-cyan-400 hover:underline block truncate cursor-pointer"
                          >
                            1. "Hali ya oda yangu ikoje?"
                          </button>
                          <button 
                            onClick={() => { setVoiceTranscript('Mna kahawa gani?'); runVoiceAI('Mna kahawa gani?', 'sw'); }}
                            className="w-full text-left text-[10px] text-cyan-400 hover:underline block truncate cursor-pointer"
                          >
                            2. "Mna kahawa gani?"
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Widget Footer */}
            {widgetTab === 'chat' && (
              <div className="p-3 bg-[#070913] border-t border-[#1E293B] flex items-center justify-between gap-1">
                {activeConv && activeConv.status !== 'resolved' && (
                  <button
                    onClick={handleResolveSession}
                    className="text-[10px] bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-900/30 font-bold px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1"
                    title="Mark conversation as resolved"
                  >
                    Resolve
                  </button>
                )}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex-1 flex items-center gap-2 relative bg-[#0C101E] border border-[#1E293B] focus-within:border-cyan-400 rounded-xl px-3 py-1.5 transition-all duration-150"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask standard questions..."
                    className="flex-1 bg-transparent text-xs text-white outline-none"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="text-cyan-400 hover:text-cyan-300 disabled:text-gray-600 transition-all duration-150 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
