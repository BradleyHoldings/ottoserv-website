"use client";

import React, { useState, useEffect, useRef } from 'react';
import { DemoSession, DemoStep, DEMO_SCRIPT, DemoSessionManager } from '@/lib/demoSystem';

interface JarvisDemoAssistantProps {
  isVisible: boolean;
  onCommand: (command: any) => void;
  onClose: () => void;
}

export default function JarvisDemoAssistant({ isVisible, onCommand, onClose }: JarvisDemoAssistantProps) {
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

  useEffect(() => {
    // Auto-scroll chat to bottom
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const startDemo = () => {
    const newSession = DemoSessionManager.createSession('demo-user', 'demo-account');
    setSession(newSession);
    setCurrentStep(1);
    setIsPaused(false);
    
    // Add welcome message
    setChatMessages([{
      sender: 'jarvis',
      message: "Welcome to your OttoServ guided demo! I'm Jarvis, your AI assistant. I'll show you exactly how OttoServ transforms service businesses. Let's begin!",
      timestamp: new Date()
    }]);

    // Execute first step
    executeCurrentStep(1);
  };

  const executeCurrentStep = (stepNumber: number) => {
    const step = DEMO_SCRIPT.find(s => s.id === stepNumber);
    if (!step) return;

    // Add Jarvis message to chat
    setChatMessages(prev => [...prev, {
      sender: 'jarvis',
      message: step.jarvis_message,
      timestamp: new Date()
    }]);

    // Execute step commands
    step.commands.forEach((command, index) => {
      setTimeout(() => {
        if (session) command.session_id = session.id;
        onCommand(command);
      }, index * 1000); // Stagger commands
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
      
      executeCurrentStep(newStep);
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
      
      executeCurrentStep(newStep);
    }
  };

  const pauseDemo = () => {
    setIsPaused(true);
    if (session) {
      DemoSessionManager.updateSession(session.id, { status: "paused" });
    }
    
    // Clear any active guidance
    onCommand({ action: "clear_guidance", session_id: session?.id });
    
    setChatMessages(prev => [...prev, {
      sender: 'jarvis',
      message: "Demo paused. Click Resume when you're ready to continue exploring OttoServ!",
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
      message: "Great! Let's continue exploring OttoServ. I'll show you more powerful features.",
      timestamp: new Date()
    }]);
    
    executeCurrentStep(currentStep);
  };

  const restartDemo = () => {
    setCurrentStep(1);
    setIsPaused(false);
    setChatMessages([]);
    
    if (session) {
      DemoSessionManager.updateSession(session.id, { 
        status: "active", 
        current_step: 1,
        metadata: { ...session.metadata, steps_completed: [] }
      });
    }
    
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
      message: "🎉 Demo complete! You've seen how OttoServ transforms service businesses with AI automation. Ready to experience the full power of OttoServ for your business? Contact us to get started!",
      timestamp: new Date()
    }]);
    
    onCommand({ action: "clear_guidance", session_id: session?.id });
  };

  const askQuestion = () => {
    if (!userQuestion.trim()) return;
    
    // Add user question to chat
    setChatMessages(prev => [...prev, {
      sender: 'user',
      message: userQuestion,
      timestamp: new Date()
    }]);
    
    // Generate Jarvis response (simplified AI response)
    const response = generateJarvisResponse(userQuestion);
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        sender: 'jarvis',
        message: response.message,
        timestamp: new Date()
      }]);
      
      // If response includes highlighting, execute it
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
        message: "Great question! OttoServ's AI captures leads from every channel - calls, forms, social media - and automatically qualifies them using advanced conversation AI. No leads slip through the cracks!",
        highlight: "lead_pipeline"
      };
    }
    
    if (q.includes('call') || q.includes('phone')) {
      return {
        message: "OttoServ's AI answers every call 24/7! It qualifies leads, books appointments, handles FAQ, and updates your CRM automatically. Your customers get instant responses while you focus on the work.",
        highlight: "missed_calls"
      };
    }
    
    if (q.includes('automat') || q.includes('ai')) {
      return {
        message: "OttoServ automates everything - lead capture, qualification, appointment booking, follow-ups, project updates, and client communication. It's like having a full administrative team working 24/7.",
        highlight: "automation_activity"
      };
    }
    
    if (q.includes('project') || q.includes('job')) {
      return {
        message: "Every project is tracked with AI insights! OttoServ predicts delays, optimizes schedules, manages materials, and keeps clients updated automatically. Project management made effortless.",
        highlight: "project_timeline"
      };
    }
    
    if (q.includes('report') || q.includes('analytic')) {
      return {
        message: "OttoServ provides intelligent insights about your business performance. See trends, identify opportunities, and get actionable recommendations - all generated automatically by AI.",
        highlight: "reports"
      };
    }
    
    if (q.includes('price') || q.includes('cost') || q.includes('plan')) {
      return {
        message: "OttoServ offers flexible plans starting from $300/month for small businesses, with enterprise solutions available. The ROI is immediate - most clients see 300%+ return in the first month through automation and captured leads."
      };
    }
    
    if (q.includes('integration') || q.includes('connect')) {
      return {
        message: "OttoServ integrates with everything! QuickBooks, Google Calendar, popular CRMs, scheduling tools, and more. We handle the setup so your existing tools work seamlessly with AI automation.",
        highlight: "integrations"
      };
    }
    
    return {
      message: "That's a great question! OttoServ is designed to handle exactly those kinds of challenges through intelligent automation. The AI learns your business patterns and adapts to provide the perfect solution. Would you like to see a specific feature in action?"
    };
  };

  const currentStepData = DEMO_SCRIPT.find(s => s.id === currentStep);

  if (!isVisible) return null;

  return (
    <div className={`jarvis-demo-assistant ${isMinimized ? 'minimized' : ''}`}>
      <div className="assistant-header">
        <div className="header-left">
          <div className="jarvis-avatar">
            <span className="avatar-emoji">⚡</span>
          </div>
          <div className="header-info">
            <h3>Jarvis Demo Assistant</h3>
            <p>Step {currentStep} of {DEMO_SCRIPT.length}</p>
          </div>
        </div>
        <div className="header-controls">
          <button
            className="control-btn minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? "▲" : "▼"}
          </button>
          <button
            className="control-btn close"
            onClick={skipDemo}
            title="Skip Demo"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="assistant-body">
            <div className="chat-area" ref={chatRef}>
              {chatMessages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  <div className="message-content">
                    <div className="message-text">{msg.message}</div>
                    <div className="message-time">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="question-area">
              <div className="question-input">
                <input
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="Ask Jarvis about OttoServ..."
                  onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
                />
                <button onClick={askQuestion} disabled={!userQuestion.trim()}>
                  Ask
                </button>
              </div>
            </div>
          </div>

          <div className="assistant-controls">
            {!session ? (
              <button className="control-btn primary" onClick={startDemo}>
                Start Demo
              </button>
            ) : (
              <>
                <div className="control-group">
                  <button
                    className="control-btn"
                    onClick={previousStep}
                    disabled={currentStep === 1 || isPaused}
                  >
                    Back
                  </button>
                  <button
                    className="control-btn primary"
                    onClick={nextStep}
                    disabled={isPaused}
                  >
                    {currentStep < DEMO_SCRIPT.length ? 'Next' : 'Finish'}
                  </button>
                </div>
                
                <div className="control-group">
                  {isPaused ? (
                    <button className="control-btn success" onClick={resumeDemo}>
                      Resume
                    </button>
                  ) : (
                    <button className="control-btn warning" onClick={pauseDemo}>
                      Pause
                    </button>
                  )}
                  <button className="control-btn" onClick={restartDemo}>
                    Restart
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .jarvis-demo-assistant {
          position: fixed;
          right: 20px;
          top: 80px;
          width: 380px;
          height: ${isMinimized ? '60px' : '600px'};
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
        }

        .assistant-header {
          padding: 16px;
          border-bottom: ${isMinimized ? 'none' : '1px solid #374151'};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .jarvis-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #0084ff, #00a8ff);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-emoji {
          font-size: 20px;
        }

        .header-info h3 {
          color: #e2e8f0;
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .header-info p {
          color: #9ca3af;
          margin: 0;
          font-size: 12px;
        }

        .header-controls {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          padding: 8px 16px;
          border: 1px solid #374151;
          background: #374151;
          color: #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .control-btn:hover {
          background: #4b5563;
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-btn.primary {
          background: #0084ff;
          border-color: #0084ff;
          color: white;
        }

        .control-btn.primary:hover {
          background: #0066cc;
        }

        .control-btn.success {
          background: #10b981;
          border-color: #10b981;
        }

        .control-btn.warning {
          background: #f59e0b;
          border-color: #f59e0b;
        }

        .control-btn.minimize,
        .control-btn.close {
          width: 32px;
          padding: 8px;
          text-align: center;
        }

        .assistant-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-area {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          max-height: 400px;
        }

        .chat-message {
          margin-bottom: 16px;
        }

        .chat-message.jarvis .message-content {
          background: #374151;
          margin-right: 20px;
        }

        .chat-message.user .message-content {
          background: #0084ff;
          margin-left: 20px;
          text-align: right;
        }

        .message-content {
          padding: 12px;
          border-radius: 8px;
          color: #e2e8f0;
        }

        .message-text {
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .message-time {
          font-size: 11px;
          color: #9ca3af;
        }

        .question-area {
          padding: 16px;
          border-top: 1px solid #374151;
        }

        .question-input {
          display: flex;
          gap: 8px;
        }

        .question-input input {
          flex: 1;
          padding: 8px 12px;
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
        }

        .question-input input:focus {
          outline: none;
          border-color: #0084ff;
        }

        .assistant-controls {
          padding: 16px;
          border-top: 1px solid #374151;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .control-group {
          display: flex;
          gap: 8px;
        }

        .control-group .control-btn {
          flex: 1;
        }

        /* Scrollbar styles */
        .chat-area::-webkit-scrollbar {
          width: 6px;
        }

        .chat-area::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 3px;
        }

        .chat-area::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}