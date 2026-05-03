"use client";

import React, { useEffect, useState } from 'react';
import { DemoCommand } from '@/lib/demoSystem';

interface GuidanceOverlayProps {
  command: DemoCommand | null;
  onComplete?: () => void;
}

interface HighlightInfo {
  element: Element;
  originalStyle: string;
  rect: DOMRect;
}

export default function GuidanceOverlay({ command, onComplete }: GuidanceOverlayProps) {
  const [activeHighlight, setActiveHighlight] = useState<HighlightInfo | null>(null);
  const [tooltip, setTooltip] = useState<{
    message: string;
    x: number;
    y: number;
    position: string;
  } | null>(null);

  useEffect(() => {
    if (!command) return;

    executeCommand(command);

    // Auto-complete after duration
    if (command.duration_ms && onComplete) {
      const timer = setTimeout(() => {
        clearGuidance();
        onComplete();
      }, command.duration_ms);

      return () => clearTimeout(timer);
    }
  }, [command]);

  const executeCommand = (cmd: DemoCommand) => {
    switch (cmd.action) {
      case 'highlight_element':
      case 'spotlight_element':
      case 'pulse_element':
        highlightElement(cmd);
        break;
      case 'scroll_to_element':
        scrollToElement(cmd);
        break;
      case 'show_tooltip':
        showTooltip(cmd);
        break;
      case 'clear_guidance':
        clearGuidance();
        break;
      default:
        console.log(`Demo command: ${cmd.action}`, cmd);
    }
  };

  const highlightElement = (cmd: DemoCommand) => {
    if (!cmd.target) return;

    // Find element by data-jarvis-target attribute
    const element = document.querySelector(`[data-jarvis-target="${cmd.target}"]`);
    if (!element) {
      console.warn(`Demo target not found: ${cmd.target}`);
      return;
    }

    // Clear previous highlight
    clearGuidance();

    const rect = element.getBoundingClientRect();
    const originalStyle = element.getAttribute('style') || '';

    // Apply highlight style based on command
    let highlightClass = '';
    switch (cmd.action) {
      case 'highlight_element':
        highlightClass = 'jarvis-highlight';
        break;
      case 'spotlight_element':
        highlightClass = 'jarvis-spotlight';
        break;
      case 'pulse_element':
        highlightClass = 'jarvis-pulse';
        break;
    }

    element.classList.add(highlightClass);
    
    setActiveHighlight({
      element: element as Element,
      originalStyle,
      rect
    });

    // Show tooltip if message provided
    if (cmd.message) {
      showTooltipForElement(element as Element, cmd.message, cmd.position || 'top');
    }

    // Scroll element into view
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
  };

  const scrollToElement = (cmd: DemoCommand) => {
    if (!cmd.target) return;

    const element = document.querySelector(`[data-jarvis-target="${cmd.target}"]`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  };

  const showTooltip = (cmd: DemoCommand) => {
    if (!cmd.target || !cmd.message) return;

    const element = document.querySelector(`[data-jarvis-target="${cmd.target}"]`);
    if (element) {
      showTooltipForElement(element as Element, cmd.message, cmd.position || 'top');
    }
  };

  const showTooltipForElement = (element: Element, message: string, position: string) => {
    const rect = element.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top;

    switch (position) {
      case 'bottom':
        y = rect.bottom + 10;
        break;
      case 'left':
        x = rect.left - 10;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + 10;
        y = rect.top + rect.height / 2;
        break;
      default: // 'top'
        y = rect.top - 10;
    }

    setTooltip({ message, x, y, position });
  };

  const clearGuidance = () => {
    // Remove highlight classes
    if (activeHighlight) {
      activeHighlight.element.classList.remove(
        'jarvis-highlight',
        'jarvis-spotlight', 
        'jarvis-pulse'
      );
    }

    setActiveHighlight(null);
    setTooltip(null);

    // Clear any existing overlays
    const existingOverlays = document.querySelectorAll('.jarvis-overlay-backdrop');
    existingOverlays.forEach(overlay => overlay.remove());
  };

  // Create spotlight backdrop for spotlight_element
  useEffect(() => {
    if (command?.action === 'spotlight_element' && activeHighlight) {
      const backdrop = document.createElement('div');
      backdrop.className = 'jarvis-overlay-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9998;
        pointer-events: none;
      `;

      // Create spotlight hole
      const rect = activeHighlight.rect;
      backdrop.style.clipPath = `circle(${Math.max(rect.width, rect.height) * 0.6}px at ${rect.left + rect.width/2}px ${rect.top + rect.height/2}px)`;
      backdrop.style.clipPath = `polygon(0% 0%, 0% 100%, ${rect.left}px 100%, ${rect.left}px ${rect.top}px, ${rect.right}px ${rect.top}px, ${rect.right}px ${rect.bottom}px, ${rect.left}px ${rect.bottom}px, ${rect.left}px 100%, 100% 100%, 100% 0%)`;

      document.body.appendChild(backdrop);
    }
  }, [activeHighlight, command]);

  return (
    <>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="jarvis-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.position === 'top' || tooltip.position === 'bottom' 
              ? 'translateX(-50%)' 
              : tooltip.position === 'left' 
                ? 'translateX(-100%)'
                : 'none',
            zIndex: 10001,
            background: '#1f2937',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            maxWidth: '300px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            border: '1px solid #374151'
          }}
        >
          {tooltip.message}
          <div
            className="tooltip-arrow"
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              borderStyle: 'solid',
              ...(tooltip.position === 'top' && {
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '8px 8px 0 8px',
                borderColor: '#1f2937 transparent transparent transparent'
              }),
              ...(tooltip.position === 'bottom' && {
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '0 8px 8px 8px',
                borderColor: 'transparent transparent #1f2937 transparent'
              })
            }}
          />
        </div>
      )}

      {/* CSS Styles for highlights */}
      <style jsx global>{`
        .jarvis-highlight {
          position: relative;
          outline: 3px solid #0084ff !important;
          outline-offset: 2px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .jarvis-spotlight {
          position: relative;
          outline: 3px solid #0084ff !important;
          outline-offset: 2px;
          border-radius: 4px;
          z-index: 9999 !important;
          transition: all 0.3s ease;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8) !important;
        }

        .jarvis-pulse {
          position: relative;
          animation: jarvis-pulse-animation 2s infinite;
        }

        @keyframes jarvis-pulse-animation {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 132, 255, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 132, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 132, 255, 0);
          }
        }

        .jarvis-tooltip {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </>
  );
}