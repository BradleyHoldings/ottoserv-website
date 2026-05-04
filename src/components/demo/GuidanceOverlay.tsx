"use client";

import React, { useEffect, useRef, useState } from 'react';
import { DemoCommand } from '@/lib/demoSystem';

interface GuidanceOverlayProps {
  command: DemoCommand | null;
  onComplete?: () => void;
}

interface HighlightInfo {
  element: Element;
  rect: DOMRect;
}

export default function GuidanceOverlay({ command, onComplete }: GuidanceOverlayProps) {
  const [tooltip, setTooltip] = useState<{
    message: string; x: number; y: number; position: string;
  } | null>(null);
  const activeElementRef = useRef<Element | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!command) return;

    // Clear completion timer from previous command
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);

    executeCommand(command);

    if (command.duration_ms && onComplete) {
      completionTimerRef.current = setTimeout(() => {
        clearGuidance();
        onComplete();
      }, command.duration_ms);
    }

    return () => {
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    };
  }, [command]);

  // Clean up on unmount
  useEffect(() => {
    return () => clearGuidance();
  }, []);

  const executeCommand = (cmd: DemoCommand) => {
    switch (cmd.action) {
      case 'highlight_element':
      case 'spotlight_element':
      case 'pulse_element':
        highlightElement(cmd);
        break;
      case 'scroll_to_element':
        scrollToTarget(cmd.target!);
        break;
      case 'clear_guidance':
        clearGuidance();
        break;
    }
  };

  const removeBackdrop = () => {
    if (backdropRef.current) {
      backdropRef.current.remove();
      backdropRef.current = null;
    }
    // Also sweep any stragglers (e.g. from hot reloads)
    document.querySelectorAll('.jarvis-overlay-backdrop').forEach(el => el.remove());
  };

  const clearGuidance = () => {
    if (activeElementRef.current) {
      activeElementRef.current.classList.remove(
        'jarvis-highlight', 'jarvis-spotlight-target', 'jarvis-pulse'
      );
      activeElementRef.current = null;
    }
    removeBackdrop();
    setTooltip(null);
  };

  const scrollToTarget = (target: string) => {
    const el = document.querySelector(`[data-demo-target="${target}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  };

  const placeBackdrop = (rect: DOMRect) => {
    removeBackdrop();

    const pad = 8;
    const l = Math.max(0, rect.left - pad);
    const t = Math.max(0, rect.top - pad);
    const r = Math.min(window.innerWidth, rect.right + pad);
    const b = Math.min(window.innerHeight, rect.bottom + pad);

    const backdrop = document.createElement('div');
    backdrop.className = 'jarvis-overlay-backdrop';
    Object.assign(backdrop.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.72)',
      zIndex: '9990',
      pointerEvents: 'none',
      // Punch a rectangular hole where the target lives
      clipPath: `polygon(
        0% 0%, 0% 100%,
        ${l}px 100%, ${l}px ${t}px,
        ${r}px ${t}px, ${r}px ${b}px,
        ${l}px ${b}px, ${l}px 100%,
        100% 100%, 100% 0%
      )`,
    });
    document.body.appendChild(backdrop);
    backdropRef.current = backdrop;
  };

  const placeTooltip = (rect: DOMRect, message: string, position: string) => {
    let x = rect.left + rect.width / 2;
    let y: number;
    const pos = position || 'bottom';

    switch (pos) {
      case 'top':    y = rect.top - 12; break;
      case 'bottom': y = rect.bottom + 12; break;
      case 'left':   x = rect.left - 12; y = rect.top + rect.height / 2; break;
      case 'right':  x = rect.right + 12; y = rect.top + rect.height / 2; break;
      default:       y = rect.bottom + 12;
    }
    setTooltip({ message, x, y, position: pos });
  };

  const highlightElement = (cmd: DemoCommand) => {
    if (!cmd.target) return;

    const el = document.querySelector(`[data-demo-target="${cmd.target}"]`);
    if (!el) {
      console.warn(`[Demo] Target not found: ${cmd.target}`);
      return;
    }

    // Clear any previous highlight immediately
    clearGuidance();

    // Mark the element so clearGuidance can clean it up later
    activeElementRef.current = el;

    // Scroll the element into view — smooth scroll takes ~300-500ms
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    // Wait for scroll to settle, then capture the real viewport position
    setTimeout(() => {
      if (!activeElementRef.current || activeElementRef.current !== el) return; // stepped away

      const rect = el.getBoundingClientRect();

      if (cmd.action === 'spotlight_element') {
        // Spotlight: backdrop with hole. Add a subtle glow ring instead of box-shadow
        // (box-shadow is clipped by overflow:hidden parents like the sidebar).
        el.classList.add('jarvis-spotlight-target');
        placeBackdrop(rect);
      } else if (cmd.action === 'highlight_element') {
        el.classList.add('jarvis-highlight');
      } else {
        el.classList.add('jarvis-pulse');
      }

      if (cmd.message) {
        placeTooltip(rect, cmd.message, cmd.position || 'bottom');
      }
    }, 500);
  };

  return (
    <>
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: (tooltip.position === 'top' || tooltip.position === 'bottom')
              ? 'translateX(-50%)'
              : tooltip.position === 'left' ? 'translate(-100%, -50%)' : 'translateY(-50%)',
            zIndex: 10002,
            background: '#111827',
            color: 'white',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            maxWidth: '260px',
            lineHeight: '1.5',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            border: '1px solid #374151',
            pointerEvents: 'none',
          }}
        >
          {tooltip.message}
        </div>
      )}

      <style jsx global>{`
        .jarvis-spotlight-target {
          position: relative;
          z-index: 9991 !important;
          outline: 2px solid rgba(0, 132, 255, 0.8) !important;
          outline-offset: 4px;
          border-radius: 6px;
          transition: outline 0.2s ease;
        }
        .jarvis-highlight {
          outline: 3px solid #0084ff !important;
          outline-offset: 2px;
          border-radius: 4px;
        }
        .jarvis-pulse {
          animation: jarvis-pulse-ring 1.8s ease-out infinite;
        }
        @keyframes jarvis-pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(0,132,255,0.7); }
          70%  { box-shadow: 0 0 0 10px rgba(0,132,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,132,255,0); }
        }
      `}</style>
    </>
  );
}
