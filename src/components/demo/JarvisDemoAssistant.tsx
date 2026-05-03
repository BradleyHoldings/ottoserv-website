"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DemoSession, DemoStep, DEMO_SCRIPT, DemoSessionManager } from '@/lib/demoSystem';

interface JarvisDemoAssistantProps {
  isVisible: boolean;
  onCommand: (command: any) => void;
  onClose: () => void;
  autoStart?: boolean;
}

export default function JarvisDemoAssistant({ isVisible, onCommand, onClose, autoStart }: JarvisDemoAssistantProps) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    sender: 'jarvis' | 'user';
    message: string;
    timestamp: Date;
  }>>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    // Auto-scroll chat to bottom
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auto-start when isVisible becomes true and autoStart is set, only once
  useEffect(() => {
    if (isVisible && autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startDemo();
    }
  }, [isVisible, autoStart]);

  const startDemo = () => {
    const newSession = DemoSessionManager.createSession('demo-user', 'demo-account');
    setSession(newSession);
    setCurrentStep(1);
    setIsPaused(false);

    setChatMessages([{
      sender: 'jarvis',
      message: DEMO_SCRIPT[0].jarvis_message,
      timestamp: new Date()
    }]);

    // Execute first step commands
    DEMO_SCRIPT[0].commands.forEach((command, index) => {
      setTimeout(() => {
        const cmd = { ...command, session_id: newSession.id };
        onCommand(cmd);
      }, index * 1000);
    });
  };

  const executeCurrentStep = (stepNumber: number, activeSession: DemoSession | null) => {
    const step = DEMO_SCRIPT.find(s => s.id === stepNumber);
    if (!step) return;

    setChatMessages(prev => [...prev, {
      sender: 'jarvis',
      message: step.jarvis_message,
      timestamp: new Date()
    }]);

    step.commands.forEach((command, index) => {
      setTimeout(() => {
        const cmd = { ...command, session_id: activeSession?.id || '' };
        onCommand(cmd);
      }, index * 1000);
    });
  };

  const nextStep = () => {
    if (isPaused) return;

    if (currentStep < DEMO_SCRIPT.length) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);

      if (session) {
        DemoSessionManager.completeStep(session.id, currentStep);
        DemoSessionManager.updateSession(session.id, { current_step: newStep });
      }

      executeCurrentStep(newStep, session);
    } else {
      completeDemo();
    }
  };

  const previousStep = () => {
    if (isPaused) return;

    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);

      if (session) {
        DemoSessionManager.updateSession(session.id, { current_step: newStep });
      }

      executeCurrentStep(newStep, session);
    }
  };

  const pauseDemo = () => {
    setIsPaused(true);
    if (session) {
      DemoSessionManager.updateSession(session.id, { status: "paused" });
    }
    onCommand({ action: "clear_guidance", session_id: session?.id });
    setChatMessages(prev => [...prev, {
      sender: 'jarvis',
      message: "Demo paused. Click Resume when you're ready to continue.",
      timestamp: new Date()
    }]);
  };

  const resumeDemo = () => {
    setIsPaused(false);
    if (session) {
      DemoSessionManager.updateSession(session.id, { status: "active" });
    }
    setChatMessages(prev => [...prev, {
      sender: 'jarvis',
      message: "Let's continue.",
      timestamp: new Date()
    }]);
    executeCurrentStep(currentStep, session);
  };

  const restartDemo = () => {
    setCurrentStep(1);
    setIsPaused(false);
    setChatMessages([]);
    autoStartedRef.current = false;
    startDemo();
  };

  const skipDemo = () => {
    if (session) {
      DemoSessionManager.updateSession(session.id, { status: "skipped" });
    }
    onCommand({ action: "clear_guidance", session_id: session?.id });
    onClose();
  };

  const completeDemo = () => {
    if (session) {
      DemoSessionManager.updateSession(session.id, {
        status: "completed",
        completed_at: new Date()
      });
    }
    setChatMessages(prev => [...prev, {
      sender: 'jarvis',
      message: "That completes the guided tour of OttoServ. Feel free to explore, or ask me anything about what you've seen.",
      timestamp: new Date()
    }]);
    onCommand({ action: "clear_guidance", session_id: session?.id });
  };

  const askQuestion = () => {
    if (!userQuestion.trim()) return;

    setChatMessages(prev => [...prev, {
      sender: 'user',
      message: userQuestion,
      timestamp: new Date()
    }]);

    const response = generateJarvisResponse(userQuestion);

    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        sender: 'jarvis',
        message: response.message,
        timestamp: new Date()
      }]);

      if (response.highlight) {
        onCommand({
          action: "highlight_element",
          target: response.highlight,
          message: response.message,
          duration_ms: 8000,
          session_id: session?.id
        });
      }
    }, 500);

    setUserQuestion('');
  };

  const generateJarvisResponse = (question: string): { message: string; highlight?: string } => {
    const q = question.toLowerCase();

    if (q.includes('lead') || q.includes('customer')) {
      return {
        message: "OttoServ captures leads from every channel — calls, forms, social media — qualifies them automatically, and moves them through the pipeline without manual follow-up.",
        highlight: "sidebar-leads"
      };
    }
    if (q.includes('automat') || q.includes('workflow')) {
      return {
        message: "Automations run your business logic 24/7 — follow-up sequences, appointment reminders, invoice reminders, and more.",
        highlight: "sidebar-automations"
      };
    }
    if (q.includes('social') || q.includes('post') || q.includes('instagram') || q.includes('facebook')) {
      return {
        message: "I draft and schedule social posts across Facebook, Instagram, LinkedIn, and Reddit, routing them for your approval before publishing.",
        highlight: "sidebar-social"
      };
    }
    if (q.includes('report') || q.includes('analytic') || q.includes('revenue')) {
      return {
        message: "Reports give you intelligence on lead conversion, revenue trends, job profitability, and team performance — generated automatically.",
        highlight: "sidebar-reports"
      };
    }
    if (q.includes('jarvis') || q.includes('voice') || q.includes('app') || q.includes('telegram')) {
      return {
        message: "You can download the Jarvis app to speak with me by voice. The audio version knows everything happening in your business in real time. Since voice conversations can't take direct actions yet, anything that needs doing can be handled through text chat here or via Telegram.",
        highlight: "sidebar-jarvis"
      };
    }
    if (q.includes('alert') || q.includes('risk') || q.includes('overdue') || q.includes('budget')) {
      return {
        message: "I flag budget overruns, overdue invoices, stalled leads, and time-sensitive items in the Alerts & Risks section before they become problems.",
        highlight: "alerts-section"
      };
    }
    if (q.includes('project') || q.includes('job')) {
      return {
        message: "I track project progress, flag delays, and keep clients updated automatically. When a project falls behind I alert you and can draft the client communication.",
        highlight: "active-projects"
      };
    }
    if (q.includes('task') || q.includes('overdue')) {
      return {
        message: "I create and assign tasks automatically based on business activity, and escalate anything that goes overdue.",
        highlight: "tasks-section"
      };
    }
    if (q.includes('price') || q.includes('cost') || q.includes('plan')) {
      return {
        message: "OttoServ plans start at $300/month. Most clients see the value within the first few weeks through captured leads and automated follow-up alone."
      };
    }

    return {
      message: "Great question! OttoServ is designed to handle exactly those kinds of challenges through intelligent automation. Would you like me to walk you through a specific section?"
    };
  };

  const progressPercent = Math.round((currentStep / DEMO_SCRIPT.length) * 100);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        top: '80px',
        width: '380px',
        height: isMinimized ? '60px' : '600px',
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: isMinimized ? 'none' : '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #0084ff, #00a8ff)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>
            ⚡
          </div>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>
              Jarvis
            </div>
            <div style={{ color: '#9ca3af', fontSize: '11px' }}>
              Step {currentStep} of {DEMO_SCRIPT.length}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand" : "Minimize"}
            style={{
              width: '28px', height: '28px',
              background: '#374151', border: '1px solid #4b5563',
              borderRadius: '6px', color: '#e2e8f0',
              cursor: 'pointer', fontSize: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={skipDemo}
            title="Close demo"
            style={{
              width: '28px', height: '28px',
              background: '#374151', border: '1px solid #4b5563',
              borderRadius: '6px', color: '#e2e8f0',
              cursor: 'pointer', fontSize: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Progress bar */}
          <div style={{ height: '4px', background: '#374151', flexShrink: 0 }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #0084ff, #00c6ff)',
              transition: 'width 0.4s ease',
              borderRadius: '0 2px 2px 0',
            }} />
          </div>

          {/* Chat area */}
          <div
            ref={chatRef}
            style={{
              flex: 1,
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {chatMessages.map((msg, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '88%',
                  background: msg.sender === 'jarvis' ? '#2d3748' : '#0084ff',
                  borderRadius: msg.sender === 'jarvis' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                  padding: '10px 12px',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}>
                  {msg.message}
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textAlign: 'right' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Question input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #374151', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ask Jarvis anything..."
                onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                onClick={askQuestion}
                disabled={!userQuestion.trim()}
                style={{
                  padding: '7px 14px',
                  background: userQuestion.trim() ? '#0084ff' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '13px',
                  cursor: userQuestion.trim() ? 'pointer' : 'not-allowed',
                  opacity: userQuestion.trim() ? 1 : 0.5,
                }}
              >
                Ask
              </button>
            </div>
          </div>

          {/* Nav controls */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #374151', flexShrink: 0 }}>
            {!session ? (
              <button
                onClick={startDemo}
                style={{
                  width: '100%', padding: '9px',
                  background: '#0084ff', border: 'none',
                  borderRadius: '6px', color: 'white',
                  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                }}
              >
                Start Demo
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={previousStep}
                    disabled={currentStep === 1 || isPaused}
                    style={{
                      flex: 1, padding: '8px',
                      background: '#374151', border: '1px solid #4b5563',
                      borderRadius: '6px', color: '#e2e8f0',
                      fontSize: '13px', cursor: currentStep === 1 || isPaused ? 'not-allowed' : 'pointer',
                      opacity: currentStep === 1 || isPaused ? 0.45 : 1,
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={isPaused}
                    style={{
                      flex: 2, padding: '8px',
                      background: isPaused ? '#374151' : '#0084ff',
                      border: 'none', borderRadius: '6px', color: 'white',
                      fontWeight: 600, fontSize: '13px',
                      cursor: isPaused ? 'not-allowed' : 'pointer',
                      opacity: isPaused ? 0.5 : 1,
                    }}
                  >
                    {currentStep < DEMO_SCRIPT.length ? 'Next' : 'Finish'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isPaused ? (
                    <button
                      onClick={resumeDemo}
                      style={{
                        flex: 1, padding: '7px',
                        background: '#10b981', border: 'none',
                        borderRadius: '6px', color: 'white',
                        fontSize: '13px', cursor: 'pointer',
                      }}
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={pauseDemo}
                      style={{
                        flex: 1, padding: '7px',
                        background: '#374151', border: '1px solid #4b5563',
                        borderRadius: '6px', color: '#e2e8f0',
                        fontSize: '13px', cursor: 'pointer',
                      }}
                    >
                      Pause
                    </button>
                  )}
                  <button
                    onClick={restartDemo}
                    style={{
                      flex: 1, padding: '7px',
                      background: '#374151', border: '1px solid #4b5563',
                      borderRadius: '6px', color: '#e2e8f0',
                      fontSize: '13px', cursor: 'pointer',
                    }}
                  >
                    Restart
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
