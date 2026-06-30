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
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col relative overflow-x-hidden pb-12">
      {/* Hidden fallback HTML5 audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Modern High-Contrast Store Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-700">
              <ShoppingBag className="w-5 h-5 text-zinc-100" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tighter text-white">Duka Letu</span>
              <span className="text-[10px] uppercase font-mono tracking-[0.5px] text-zinc-500">Authentic Storefront</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search coffee, handwoven crafts, exotic spices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 outline-none transition-all"
            />
          </div>

          {/* Interactive Right utility menu */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Inquiry Guest Role
            </span>

            <div className="relative">
              <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-300">
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-zinc-100 text-zinc-950 text-[10px] font-mono w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors px-4 py-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-10 relative overflow-hidden">
          <div className="max-w-xl relative z-10">
            <span className="text-xs font-mono tracking-widest text-zinc-500 uppercase mb-3 inline-block">
              Multilingual Widget Sandbox
            </span>
            <h1 className="text-3xl font-semibold tracking-tighter text-white mb-4">
              Duka Letu Finest Crafts & Aromas
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Explore our boutique products. In the bottom right corner, you will find the <b>Duka Letu Floating Help Assistant</b>—the exact live widget integrated for website visitors! Click it to inquire about shipping, coffee origins, and return policies in English or Kiswahili.
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsWidgetOpen(true)}
                className="bg-white hover:bg-zinc-100 text-zinc-950 text-sm font-medium px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Test Live Widget Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter categories tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-6 mb-8 border-b border-zinc-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-white text-zinc-950 border-white'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:border-zinc-700'
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
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group hover:border-zinc-700 transition-all"
            >
              {/* Product Image Frame */}
              <div className="relative h-52 bg-zinc-950 overflow-hidden">
                <img 
                  src={prod.image} 
                  alt={prod.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                />
                <span className="absolute top-4 left-4 bg-zinc-950/90 text-zinc-400 text-xs font-mono tracking-widest px-3 py-1 rounded border border-zinc-700">
                  {prod.badge}
                </span>
              </div>

              {/* Product details */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-2">
                    {prod.category}
                  </span>
                  <h3 className="font-semibold text-lg text-white group-hover:text-white transition-colors line-clamp-2">
                    {prod.name}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-snug mt-3 line-clamp-3">
                    {prod.description}
                  </p>
                </div>

                <div className="mt-8 flex items-end justify-between">
                  <div>
                    <span className="text-xs text-zinc-500">Unit price</span>
                    <div className="text-2xl font-semibold text-white mt-0.5">${prod.price.toFixed(2)}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-medium text-white">{prod.rating}</span>
                    <span className="text-xs text-zinc-500">({prod.reviews})</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={handleAddToCart}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-600"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950">
              <p className="text-sm text-zinc-500">No boutique products match your active criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Widget Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setIsWidgetOpen(!isWidgetOpen)}
          className={`w-14 h-14 bg-white text-zinc-950 rounded-2xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer relative group border border-zinc-200 ${
            isWidgetOpen ? 'rotate-90' : ''
          }`}
          id="floating-widget-toggle"
        >
          {isWidgetOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-mono w-4 h-4 rounded-full flex items-center justify-center">
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
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-28 right-8 w-[380px] h-[560px] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50"
            id="duka-letu-chat-widget"
          >
            {/* Widget Header */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                    <Sparkles className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-[2.5px] border-zinc-950"></span>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-white">Duka Letu Assistant</h4>
                  <p className="text-xs text-zinc-500 -mt-0.5">Multilingual Chat & Voice Helper</p>
                </div>
              </div>

              {/* Actions & Tab Switcher */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWidgetTab(widgetTab === 'chat' ? 'voice' : 'chat')}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                  title={widgetTab === 'chat' ? 'Switch to Voice Assistant' : 'Switch to Chat Assistant'}
                >
                  {widgetTab === 'chat' ? <Mic className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleResetWidget}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                  title="Reset conversation session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsWidgetOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Widget Sub Header with Controls (Language settings, actions) */}
            <div className="px-5 py-2.5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
              {widgetTab === 'chat' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Language Detector:</span>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-1 text-xs font-medium outline-none cursor-pointer"
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="en">English (EN)</option>
                    <option value="sw">Kiswahili (SW)</option>
                  </select>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Speech Language:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setVoiceLang('en')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${voiceLang === 'en' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setVoiceLang('sw')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${voiceLang === 'sw' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                    >
                      SW
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Widget Main Pane */}
            <div className="flex-1 overflow-y-auto p-5 bg-zinc-950 relative">
              
              {/* CSAT Overlay directly in widget */}
              <AnimatePresence>
                {showCsat && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 p-6 flex flex-col justify-center text-center"
                  >
                    {csatSuccess ? (
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className="space-y-3 text-center"
                      >
                        <div className="w-12 h-12 bg-emerald-900/50 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-800 mx-auto">
                          <Check className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-medium text-white">Thank you for your rating!</h4>
                        <p className="text-xs text-zinc-400">Feedback successfully logged to Supabase.</p>
                      </motion.div>
                    ) : (
                      <div className="space-y-5">
                        <h4 className="text-sm font-medium text-white">Rate Duka Letu Support</h4>
                        <p className="text-xs text-zinc-400">
                          Your conversation will be closed. Please rate your experience to help us improve.
                        </p>
                        
                        <div className="flex items-center justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setCsatRating(star)}
                              className="p-1 transition-all hover:scale-110 cursor-pointer"
                            >
                              <Star className={`w-7 h-7 ${star <= csatRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                            </button>
                          ))}
                        </div>

                        <textarea
                          placeholder="Tell us what we did well or how we can improve..."
                          value={csatFeedback}
                          onChange={(e) => setCsatFeedback(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-zinc-600 rounded-2xl p-4 text-sm text-zinc-200 outline-none min-h-[88px] resize-y"
                        />

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => setShowCsat(false)}
                            className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-2xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCsatSubmit}
                            className="flex-1 py-2.5 bg-white text-zinc-950 text-sm font-medium rounded-2xl transition-all hover:bg-zinc-100"
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
                <div className="space-y-6 h-full flex flex-col">
                  <div className="space-y-6 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                    
                    {/* Welcome message */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center text-xs font-medium border border-zinc-700 flex-shrink-0">
                        AI
                      </div>
                      <div className="bg-zinc-800 border border-zinc-700 rounded-3xl px-4 py-3 text-sm text-zinc-200">
                        Habari! Hello! Welcome to <b>Duka Letu</b>. I can assist you with orders, shipping info, or products. How can I help today?
                      </div>
                    </div>

                    {messages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-medium border flex-shrink-0 ${
                            isUser 
                              ? 'bg-zinc-700 text-zinc-300 border-zinc-600' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {isUser ? 'ME' : 'AI'}
                          </div>
                          <div className={`px-4 py-3 rounded-3xl text-sm max-w-[80%] leading-relaxed border ${
                            isUser
                              ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}

                    {loading && (
                      <div className="flex items-center gap-2.5 text-sm text-zinc-500 pl-11">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Duka Letu Assistant is processing...</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestion Chips */}
                  {messages.length === 0 && !loading && (
                    <div className="pt-2">
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-3 pl-1">
                        Frequently Asked Questions:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_INQUIRIES.map((chip, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(chip.text)}
                            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-sm text-zinc-300 px-4 py-2 rounded-2xl transition-all text-left flex items-center gap-2"
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
                  <div className="text-center space-y-6 pt-6">
                    <span className="text-xs font-mono uppercase tracking-[1px] text-zinc-400 block">
                      Interactive Voice Mode
                    </span>
                    
                    {/* Pulsing micro voice module */}
                    <div className="flex items-center justify-center py-8">
                      <div className="relative">
                        <AnimatePresence>
                          {voiceStatus === 'recording' && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: [0.6, 0.2, 0.6], scale: [1, 1.8, 1] }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ repeat: Infinity, duration: 1.4 }}
                              className="absolute inset-0 bg-rose-500/30 rounded-full"
                            />
                          )}
                          {(voiceStatus === 'processing' || voiceStatus === 'speaking') && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: [0.5, 0.15, 0.5], scale: [1, 1.8, 1] }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ repeat: Infinity, duration: 1.6 }}
                              className="absolute inset-0 bg-zinc-400/30 rounded-full"
                            />
                          )}
                        </AnimatePresence>

                        <button
                          onClick={handleVoiceButtonClick}
                          className={`w-24 h-24 rounded-full border flex items-center justify-center relative z-10 transition-all duration-200 cursor-pointer shadow-xl ${
                            voiceStatus === 'recording'
                              ? 'bg-rose-950 border-rose-600 text-rose-400'
                              : voiceStatus === 'processing'
                              ? 'bg-zinc-800 border-zinc-600 text-zinc-400 animate-pulse'
                              : voiceStatus === 'speaking'
                              ? 'bg-zinc-800 border-zinc-600 text-zinc-400'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {voiceStatus === 'recording' ? (
                            <MicOff className="w-9 h-9" />
                          ) : (
                            <Mic className="w-9 h-9" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Status feedback label */}
                    <div className="text-sm font-medium text-zinc-300 min-h-[1.5em]">
                      {voiceStatus === 'idle' && 'Tap microphone to start speaking'}
                      {voiceStatus === 'recording' && 'Listening... Tap again to send inquiry'}
                      {voiceStatus === 'processing' && 'Synthesizing voice transcription...'}
                      {voiceStatus === 'speaking' && 'Speaking audio reply...'}
                    </div>

                    {/* Transcripts container */}
                    <div className="space-y-4 text-left">
                      {voiceTranscript && (
                        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-2xl">
                          <span className="text-xs font-mono tracking-widest text-zinc-500 block mb-2">You said:</span>
                          <p className="text-sm text-zinc-300">"{voiceTranscript}"</p>
                        </div>
                      )}

                      {voiceResponseText && (
                        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-2xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono tracking-widest text-zinc-400">Assistant Response:</span>
                            {voiceLatency && <span className="font-mono text-[10px] text-zinc-500">{voiceLatency}ms</span>}
                          </div>
                          <p className="text-sm text-zinc-200 leading-relaxed">{voiceResponseText}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* suggested voice helper scripts */}
                  <div className="mt-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm">
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-3">
                      Say or type standard questions:
                    </span>
                    <div className="space-y-2 text-sm">
                      {voiceLang === 'en' ? (
                        <>
                          <button 
                            onClick={() => { setVoiceTranscript('Do you ship standard standard shipping?'); runVoiceAI('Do you ship standard standard shipping?', 'en'); }}
                            className="w-full text-left text-zinc-300 hover:text-white transition-colors py-1 cursor-pointer"
                          >
                            1. "Do you ship standard standard shipping?"
                          </button>
                          <button 
                            onClick={() => { setVoiceTranscript('What is your return policy?'); runVoiceAI('What is your return policy?', 'en'); }}
                            className="w-full text-left text-zinc-300 hover:text-white transition-colors py-1 cursor-pointer"
                          >
                            2. "What is your return policy?"
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setVoiceTranscript('Hali ya oda yangu ikoje?'); runVoiceAI('Hali ya oda yangu ikoje?', 'sw'); }}
                            className="w-full text-left text-zinc-300 hover:text-white transition-colors py-1 cursor-pointer"
                          >
                            1. "Hali ya oda yangu ikoje?"
                          </button>
                          <button 
                            onClick={() => { setVoiceTranscript('Mna kahawa gani?'); runVoiceAI('Mna kahawa gani?', 'sw'); }}
                            className="w-full text-left text-zinc-300 hover:text-white transition-colors py-1 cursor-pointer"
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
              <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                {activeConv && activeConv.status !== 'resolved' && (
                  <button
                    onClick={handleResolveSession}
                    className="text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-300 font-medium mb-3"
                  >
                    Resolve
                  </button>
                )}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center bg-zinc-900 border border-zinc-700 focus-within:border-zinc-600 rounded-2xl px-4 py-1.5 transition-all"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask standard questions..."
                    className="flex-1 bg-transparent text-sm text-zinc-200 outline-none py-3"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputText.trim()}
                    className="text-zinc-400 hover:text-white disabled:opacity-40 p-2 transition-colors"
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