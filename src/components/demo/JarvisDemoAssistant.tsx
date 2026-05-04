"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DemoSession, DEMO_SCRIPT, DemoSessionManager } from '@/lib/demoSystem';

interface JarvisDemoAssistantProps {
  isVisible: boolean;
  onCommand: (command: any) => void;
  onClose: () => void;
  autoStart?: boolean;
}

interface ChatMessage {
  sender: 'jarvis' | 'user';
  message: string;
  timestamp: Date;
}

export default function JarvisDemoAssistant({ isVisible, onCommand, onClose, autoStart }: JarvisDemoAssistantProps) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Audio
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const sessionRef = useRef<DemoSession | null>(null);

  // Keep sessionRef in sync so callbacks always see latest session
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-start once
  useEffect(() => {
    if (isVisible && autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startDemo();
    }
  }, [isVisible, autoStart]);

  // Auto-speak the latest Jarvis message when audio is on
  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (last?.sender === 'jarvis' && audioEnabled) {
      speakText(last.message);
    }
  }, [chatMessages, audioEnabled]);

  // Stop speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  // ─── TTS ──────────────────────────────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 0.9;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    const assignVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const pick =
        voices.find(v => v.name === 'Google UK English Male') ||
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices[0];
      if (pick) utter.voice = pick;
      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      assignVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = assignVoice;
    }
  }, []);

  // ─── STT ──────────────────────────────────────────────────────────────────
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      addJarvisMessage("Sorry, your browser doesn't support voice input. Please use Chrome or Edge, or type your question below.");
      return;
    }

    // Stop Jarvis speaking before mic activates
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      handleQuestion(transcript);
    };

    rec.start();
  };

  // ─── Chat helpers ─────────────────────────────────────────────────────────
  const addJarvisMessage = (message: string) => {
    setChatMessages(prev => [...prev, { sender: 'jarvis', message, timestamp: new Date() }]);
  };

  // ─── Demo flow ────────────────────────────────────────────────────────────
  const fireStepCommands = (step: typeof DEMO_SCRIPT[0], sess: DemoSession) => {
    step.commands.forEach((command, i) => {
      setTimeout(() => {
        onCommand({ ...command, session_id: sess.id });
      }, i * 600);
    });
  };

  const startDemo = () => {
    const sess = DemoSessionManager.createSession('demo-user', 'demo-account');
    setSession(sess);
    setCurrentStep(1);
    setIsPaused(false);
    setChatMessages([{ sender: 'jarvis', message: DEMO_SCRIPT[0].jarvis_message, timestamp: new Date() }]);
    fireStepCommands(DEMO_SCRIPT[0], sess);
  };

  const goToStep = (stepNumber: number) => {
    const step = DEMO_SCRIPT.find(s => s.id === stepNumber);
    if (!step) return;
    const sess = sessionRef.current;
    setChatMessages(prev => [...prev, { sender: 'jarvis', message: step.jarvis_message, timestamp: new Date() }]);
    if (sess) {
      DemoSessionManager.updateSession(sess.id, { current_step: stepNumber });
      fireStepCommands(step, sess);
    }
  };

  const nextStep = () => {
    if (isPaused) return;
    if (currentStep < DEMO_SCRIPT.length) {
      const next = currentStep + 1;
      if (session) DemoSessionManager.completeStep(session.id, currentStep);
      setCurrentStep(next);
      goToStep(next);
    } else {
      completeDemo();
    }
  };

  const previousStep = () => {
    if (isPaused || currentStep <= 1) return;
    const prev = currentStep - 1;
    setCurrentStep(prev);
    goToStep(prev);
  };

  const pauseDemo = () => {
    setIsPaused(true);
    if (session) DemoSessionManager.updateSession(session.id, { status: 'paused' });
    onCommand({ action: 'clear_guidance', session_id: session?.id });
    addJarvisMessage("Paused. Take your time — click Resume when you're ready.");
  };

  const resumeDemo = () => {
    setIsPaused(false);
    if (session) DemoSessionManager.updateSession(session.id, { status: 'active' });
    goToStep(currentStep);
  };

  const restartDemo = () => {
    window.speechSynthesis?.cancel();
    setCurrentStep(1);
    setIsPaused(false);
    setChatMessages([]);
    autoStartedRef.current = false;
    startDemo();
  };

  const skipDemo = () => {
    window.speechSynthesis?.cancel();
    if (session) DemoSessionManager.updateSession(session.id, { status: 'skipped' });
    onCommand({ action: 'clear_guidance', session_id: session?.id });
    onClose();
  };

  const completeDemo = () => {
    if (session) DemoSessionManager.updateSession(session.id, { status: 'completed', completed_at: new Date() });
    addJarvisMessage("That wraps up the guided tour. Feel free to explore on your own, or ask me anything — by voice or text.");
    onCommand({ action: 'clear_guidance', session_id: session?.id });
  };

  // ─── Q&A ──────────────────────────────────────────────────────────────────
  const handleQuestion = (text: string) => {
    if (!text.trim()) return;
    setChatMessages(prev => [...prev, { sender: 'user', message: text, timestamp: new Date() }]);
    setUserQuestion('');

    setTimeout(() => {
      const { message, highlight } = generateResponse(text);
      addJarvisMessage(message);
      if (highlight) {
        onCommand({
          action: 'spotlight_element',
          target: highlight,
          message,
          duration_ms: 9000,
          session_id: sessionRef.current?.id,
        });
      }
    }, 400);
  };

  const generateResponse = (question: string): { message: string; highlight?: string } => {
    const q = question.toLowerCase();
    if (q.includes('lead') || q.includes('customer') || q.includes('prospect'))
      return { message: "OttoServ captures leads from every channel — calls, forms, social — qualifies them automatically, and moves them through the pipeline without manual follow-up.", highlight: 'sidebar-leads' };
    if (q.includes('automat') || q.includes('workflow') || q.includes('trigger'))
      return { message: "Automations run your business logic 24/7 — follow-up sequences, appointment reminders, invoice reminders, and more.", highlight: 'sidebar-automations' };
    if (q.includes('social') || q.includes('post') || q.includes('instagram') || q.includes('facebook') || q.includes('linkedin'))
      return { message: "I draft and schedule posts across Facebook, Instagram, LinkedIn, and Reddit, routing them for your approval before publishing.", highlight: 'sidebar-social' };
    if (q.includes('report') || q.includes('analytic') || q.includes('revenue') || q.includes('metric'))
      return { message: "Reports give you intelligence on lead conversion, revenue trends, job profitability, and team performance — generated automatically.", highlight: 'sidebar-reports' };
    if (q.includes('voice') || q.includes('app') || q.includes('audio') || q.includes('speak') || q.includes('telegram'))
      return { message: "You can download the Jarvis app to speak with me by voice. I know everything happening in your business in real time. Since voice can't take direct actions yet, anything that needs doing can be handled here in text chat or via Telegram.", highlight: 'sidebar-jarvis' };
    if (q.includes('alert') || q.includes('risk') || q.includes('overdue') || q.includes('budget'))
      return { message: "I flag budget overruns, overdue invoices, stalled leads, and time-sensitive items in the Alerts & Risks section before they become problems.", highlight: 'alerts-section' };
    if (q.includes('project') || q.includes('job') || q.includes('schedule'))
      return { message: "I track project progress, flag delays, and keep clients updated automatically. When a project falls behind I alert you and can draft the client communication.", highlight: 'active-projects' };
    if (q.includes('task') || q.includes('todo') || q.includes('follow'))
      return { message: "I create and assign tasks automatically based on business activity, and escalate anything that goes overdue.", highlight: 'tasks-section' };
    if (q.includes('price') || q.includes('cost') || q.includes('plan') || q.includes('much'))
      return { message: "OttoServ plans start at $300/month. Most clients see the value within the first few weeks through captured leads and automated follow-up alone." };
    if (q.includes('techops') || q.includes('ticket') || q.includes('tech') || q.includes('support'))
      return { message: "TechOps is built for businesses managing technology for clients — ticket submission, remote triage, and high-urgency routing directly to me for immediate response.", highlight: 'sidebar-techops' };
    return { message: "Great question! OttoServ handles that through intelligent automation. Want me to highlight a specific section that addresses it?" };
  };

  const progressPercent = Math.round((currentStep / DEMO_SCRIPT.length) * 100);
  if (!isVisible) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', right: 20, top: 80,
      width: 370, height: isMinimized ? 60 : 620,
      background: '#111827', border: '1px solid #1f2937',
      borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      zIndex: 10001, display: 'flex', flexDirection: 'column',
      transition: 'height 0.3s ease', overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '10px 14px', flexShrink: 0,
        borderBottom: isMinimized ? 'none' : '1px solid #1f2937',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(135deg, #0f1a2e, #111827)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0060df, #00a8ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
            boxShadow: isSpeaking ? '0 0 0 4px rgba(0,132,255,0.3)' : 'none',
            transition: 'box-shadow 0.3s',
          }}>
            {isSpeaking ? '🔊' : '⚡'}
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>Jarvis</div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>
              {isListening ? '🎤 Listening...' : isSpeaking ? 'Speaking...' : `Step ${currentStep} of ${DEMO_SCRIPT.length}`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Audio toggle */}
          <button
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (!next) { window.speechSynthesis?.cancel(); setIsSpeaking(false); }
            }}
            title={audioEnabled ? 'Mute Jarvis' : 'Enable voice'}
            style={{
              width: 30, height: 30, borderRadius: 6,
              background: audioEnabled ? '#1d4ed8' : '#1f2937',
              border: `1px solid ${audioEnabled ? '#2563eb' : '#374151'}`,
              color: audioEnabled ? '#93c5fd' : '#6b7280',
              cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
          <button
            onClick={() => setIsMinimized(m => !m)}
            title={isMinimized ? 'Expand' : 'Minimize'}
            style={{
              width: 30, height: 30, borderRadius: 6,
              background: '#1f2937', border: '1px solid #374151',
              color: '#9ca3af', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={skipDemo}
            title="Close"
            style={{
              width: 30, height: 30, borderRadius: 6,
              background: '#1f2937', border: '1px solid #374151',
              color: '#9ca3af', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* ── Progress bar ── */}
          <div style={{ height: 3, background: '#1f2937', flexShrink: 0 }}>
            <div style={{
              height: '100%', width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #0060df, #00c6ff)',
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* ── Chat ── */}
          <div
            ref={chatRef}
            style={{
              flex: 1, padding: '12px 14px', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '86%', padding: '9px 12px',
                  background: msg.sender === 'jarvis' ? '#1f2937' : '#1d4ed8',
                  borderRadius: msg.sender === 'jarvis' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                  color: '#e2e8f0', fontSize: 13, lineHeight: 1.55,
                  border: msg.sender === 'jarvis' ? '1px solid #374151' : 'none',
                }}>
                  {msg.message}
                  <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4, textAlign: 'right' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Input ── */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* Mic button */}
              <button
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Speak to Jarvis'}
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: isListening ? '#dc2626' : '#1f2937',
                  border: `1px solid ${isListening ? '#ef4444' : '#374151'}`,
                  color: isListening ? 'white' : '#6b7280',
                  cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: isListening ? 'mic-pulse 1.2s ease-in-out infinite' : 'none',
                }}
              >
                🎤
              </button>
              <input
                type="text"
                value={userQuestion}
                onChange={e => setUserQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuestion(userQuestion)}
                placeholder={isListening ? 'Listening...' : 'Ask Jarvis anything...'}
                style={{
                  flex: 1, padding: '7px 10px',
                  background: '#1f2937', border: '1px solid #374151',
                  borderRadius: 7, color: '#e2e8f0', fontSize: 13, outline: 'none',
                }}
              />
              <button
                onClick={() => handleQuestion(userQuestion)}
                disabled={!userQuestion.trim()}
                style={{
                  padding: '7px 12px', borderRadius: 7, border: 'none',
                  background: userQuestion.trim() ? '#1d4ed8' : '#1f2937',
                  color: 'white', fontSize: 13, cursor: userQuestion.trim() ? 'pointer' : 'not-allowed',
                  opacity: userQuestion.trim() ? 1 : 0.4, flexShrink: 0,
                }}
              >
                Ask
              </button>
            </div>
          </div>

          {/* ── Nav controls ── */}
          <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
            {!session ? (
              <button onClick={startDemo} style={{
                width: '100%', padding: 9, background: '#1d4ed8',
                border: 'none', borderRadius: 7, color: 'white',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                Start Demo
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={previousStep} disabled={currentStep === 1 || isPaused} style={{
                    flex: 1, padding: 8, background: '#1f2937',
                    border: '1px solid #374151', borderRadius: 7,
                    color: '#9ca3af', fontSize: 13,
                    cursor: currentStep === 1 || isPaused ? 'not-allowed' : 'pointer',
                    opacity: currentStep === 1 || isPaused ? 0.4 : 1,
                  }}>
                    ← Back
                  </button>
                  <button onClick={nextStep} disabled={isPaused} style={{
                    flex: 2, padding: 8,
                    background: isPaused ? '#1f2937' : 'linear-gradient(90deg, #1d4ed8, #0ea5e9)',
                    border: 'none', borderRadius: 7, color: 'white',
                    fontWeight: 700, fontSize: 13,
                    cursor: isPaused ? 'not-allowed' : 'pointer',
                    opacity: isPaused ? 0.5 : 1,
                  }}>
                    {currentStep < DEMO_SCRIPT.length ? 'Next →' : 'Finish ✓'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={isPaused ? resumeDemo : pauseDemo} style={{
                    flex: 1, padding: 7,
                    background: isPaused ? '#065f46' : '#1f2937',
                    border: `1px solid ${isPaused ? '#10b981' : '#374151'}`,
                    borderRadius: 7,
                    color: isPaused ? '#34d399' : '#9ca3af',
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button onClick={restartDemo} style={{
                    flex: 1, padding: 7, background: '#1f2937',
                    border: '1px solid #374151', borderRadius: 7,
                    color: '#9ca3af', fontSize: 12, cursor: 'pointer',
                  }}>
                    Restart
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}
