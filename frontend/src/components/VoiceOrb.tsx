import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, X } from 'lucide-react';

type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED';

interface VoiceOrbProps {
  accountId: string | undefined;
  onCommandExecuted: (result: any) => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ accountId, onCommandExecuted }) => {
  const [state, setState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isHandsFree, setIsHandsFree] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isInterruptedRef = useRef(false);

  // Helper flags for UI
  const isListening = state === 'LISTENING' || state === 'INTERRUPTED';
  const isProcessing = state === 'THINKING' || state === 'SPEAKING';

  // Core Interruption Logic (Barge-in)
  const interruptAssistant = () => {
    if (state === 'SPEAKING' || state === 'THINKING' || window.speechSynthesis.speaking) {
      console.log("!!! BARGE-IN: Interrupting Assistant !!!");
      
      // 1. Stop Audio immediately
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      // 2. Abort current LLM request if pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 3. Clear queues and update state
      speechQueueRef.current = [];
      isInterruptedRef.current = true;
      setState('INTERRUPTED');
    }
  };

  const startMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (state === 'IDLE' || state === 'INTERRUPTED') setState('LISTENING');
    };

    recognition.onspeechstart = () => {
      // Triggered the moment user voice activity is detected
      interruptAssistant();
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const resultTranscript = event.results[current][0].transcript;
      
      if (!resultTranscript.trim()) return;
      setTranscript(resultTranscript);

      // Ensure interruption triggers even if onspeechstart was missed
      interruptAssistant();

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (event.results[current].isFinal) {
          handleVoiceSubmit(resultTranscript);
        }
      }, 1000);
    };

    recognition.onend = () => {
      // Auto-restart in Hands-Free mode unless we are busy thinking
      if (isHandsFree && state !== 'THINKING') {
        setTimeout(startMic, 100);
      } else if (!isHandsFree) {
        setState('IDLE');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      if (isHandsFree) setTimeout(startMic, 500);
    }
  };

  const toggleListening = () => {
    if (isHandsFree) {
      setIsHandsFree(false);
      interruptAssistant();
      if (recognitionRef.current) recognitionRef.current.abort();
      setState('IDLE');
    } else {
      setIsHandsFree(true);
      setTranscript('');
      isInterruptedRef.current = false;
      startMic();
    }
  };

  const speakInChunks = (text: string) => {
    if (!text || isInterruptedRef.current) return;
    
    // Split into short sentences/chunks for better interruptibility
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    speechQueueRef.current = sentences;
    
    setState('SPEAKING');

    const speakNext = () => {
      if (speechQueueRef.current.length === 0 || isInterruptedRef.current) {
        if (!isInterruptedRef.current) setState('IDLE');
        return;
      }

      const chunk = speechQueueRef.current.shift();
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.onend = speakNext;
      utterance.onerror = () => setState('IDLE');
      
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  const handleVoiceSubmit = async (textToSubmit: string) => {
    if (!textToSubmit || textToSubmit.trim().length < 2) return;
    
    isInterruptedRef.current = false;
    abortControllerRef.current = new AbortController();
    setState('THINKING');

    const userMessage = { role: 'user', content: [{ text: textToSubmit }] };
    setChatHistory(prev => [...prev, userMessage].slice(-20));

    try {
      const response = await fetch('http://localhost:3000/api/orbit/voice-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ transcript: textToSubmit, accountId, history: chatHistory })
      });
      
      const res = await response.json();
      if (res.status === 'success' && !isInterruptedRef.current) {
        const resultData = res.data;
        onCommandExecuted(resultData);

        const assistantMessage = { role: 'assistant', content: [{ text: resultData.message }] };
        setChatHistory(prev => [...prev, assistantMessage].slice(-20));
        
        if (resultData.message) {
          speakInChunks(resultData.message);
        } else {
          setState('IDLE');
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("!!! Request aborted due to barge-in interruption.");
      } else {
        console.error('Submit error:', err);
        setState('IDLE');
      }
    }
  };

  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end z-50">
      <AnimatePresence>
        {(chatHistory.length > 0 || isProcessing) && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-6 flex flex-col gap-3 items-end max-w-sm"
          >
            {chatHistory.slice(-3).map((chat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-3xl text-sm backdrop-blur-xl border shadow-2xl transition-all duration-500 ${
                  chat.role === 'user' 
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-white/20 rounded-br-none' 
                    : 'bg-white/10 text-gray-100 border-white/10 rounded-bl-none glass-morphism'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest opacity-50 ${chat.role === 'user' ? 'text-indigo-200' : 'text-violet-300'}`}>
                    {chat.role === 'user' ? 'Founder' : 'Orbit AI'}
                  </span>
                  <p className="leading-relaxed font-medium">
                    {chat.content[0].text}
                  </p>
                </div>
              </motion.div>
            ))}
            
            {state === 'THINKING' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 backdrop-blur-md text-gray-400 p-4 rounded-3xl text-sm italic border border-white/10 rounded-bl-none flex items-center gap-3 animate-pulse"
              >
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
                Processing financial insights...
              </motion.div>
            )}
          </motion.div>
        )}

        {isListening && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-8 p-1 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-2xl border border-white/10 shadow-3xl max-w-sm overflow-hidden"
          >
            <div className="bg-slate-900/40 p-6 rounded-[2.3rem]">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${state === 'INTERRUPTED' ? 'bg-red-500' : 'bg-indigo-400'} animate-ping`} />
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Orbit Live Session</span>
              </div>
              
              <p className="text-xl font-semibold text-white leading-tight tracking-tight">
                {isListening ? (transcript || "I'm listening...") : transcript}
              </p>

              {isListening && (
                <div className="mt-6 flex gap-1.5 h-8 items-center justify-start">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: [8, Math.random() * 32 + 8, 8],
                        backgroundColor: ['#6366f1', '#a855f7', '#6366f1']
                      }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                      className="w-1.5 rounded-full opacity-80"
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="relative group animate-float">
        {/* Liquid Aura Background (Rainbow-ified) */}
        <div className={`absolute inset-0 -m-12 blur-[100px] opacity-40 transition-all duration-1000 animate-liquid ${
          state === 'LISTENING' ? 'bg-red-500' :
          state === 'THINKING' ? 'bg-gradient-to-r from-[#FF5E5E] via-[#FFD25E] to-[#5EFF8B] scale-125' :
          state === 'SPEAKING' ? 'bg-gradient-to-r from-[#5E7BFF] via-[#A85EFF] to-[#FF5E5E] scale-150' :
          'bg-indigo-500/10 opacity-0'
        }`} />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-700 relative overflow-hidden group border-4 ${
            isHandsFree ? 'bg-red-600 border-red-400/50 animate-glow' :
            isListening ? 'bg-red-500 border-red-300/50' : 
            state === 'THINKING' ? 'bg-indigo-700 border-indigo-400/50' : 
            'bg-slate-900/80 border-white/10 backdrop-blur-md'
          }`}
        >
          {/* Internal Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {isHandsFree && (
            <div className="absolute top-3 inset-x-0 flex justify-center">
              <span className="bg-white/20 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/20">
                Live
              </span>
            </div>
          )}

          {state === 'THINKING' ? (
            <div className="relative">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
              <div className="absolute inset-0 blur-md bg-indigo-400/50 animate-pulse" />
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center">
              <Mic className={`w-10 h-10 transition-all duration-500 ${isListening || isHandsFree ? 'text-white scale-110' : 'text-indigo-400 group-hover:text-white'}`} />
            </div>
          )}
          
          {/* Animated Gradient Background for Button */}
          {isListening && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 -z-10"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>
        
        {state === 'IDLE' && chatHistory.length > 0 && (
          <button 
            onClick={() => setChatHistory([])}
            className="absolute -left-16 bottom-8 p-3 bg-slate-800/80 hover:bg-red-500/20 border border-white/10 rounded-full text-gray-500 hover:text-red-400 transition-all shadow-xl backdrop-blur-md group"
            title="Clear Chat History"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}
      </div>
    </div>
  );
};
