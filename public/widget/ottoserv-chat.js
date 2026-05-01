(function() {
  'use strict';

  var API_URL = 'https://gateway.ottoserv.com/chat/message';
  var SESSION_KEY = 'ottoserv_chat_session';
  var CLIENT_ID = document.currentScript?.getAttribute('data-client-id') || 'ottoserv';

  var sessionId = localStorage.getItem(SESSION_KEY) || '';
  var isOpen = false;
  var messages = [];

  function createWidget() {
    // Styles
    var style = document.createElement('style');
    style.textContent = `
      #ottoserv-chat-bubble {
        position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px;
        background: #3b82f6; border-radius: 50%; cursor: pointer; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px rgba(59,130,246,0.4); transition: transform 0.2s;
      }
      #ottoserv-chat-bubble:hover { transform: scale(1.1); }
      #ottoserv-chat-bubble svg { width: 28px; height: 28px; fill: white; }
      #ottoserv-chat-window {
        position: fixed; bottom: 96px; right: 24px; width: 380px; max-height: 520px;
        background: #0a0a0a; border: 1px solid #1e293b; border-radius: 16px;
        z-index: 99999; display: none; flex-direction: column; overflow: hidden;
        box-shadow: 0 8px 40px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      #ottoserv-chat-window.open { display: flex; }
      #ottoserv-chat-header {
        background: #111827; padding: 16px; border-bottom: 1px solid #1e293b;
        display: flex; align-items: center; gap: 12px;
      }
      #ottoserv-chat-header .dot { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; }
      #ottoserv-chat-header .title { color: #fff; font-weight: 600; font-size: 15px; }
      #ottoserv-chat-header .subtitle { color: #94a3b8; font-size: 12px; }
      #ottoserv-chat-close { margin-left: auto; cursor: pointer; color: #64748b; font-size: 20px; background: none; border: none; }
      #ottoserv-chat-messages {
        flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
        max-height: 340px; min-height: 200px;
      }
      .ottoserv-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
      .ottoserv-msg.visitor { align-self: flex-end; background: #3b82f6; color: #fff; border-bottom-right-radius: 4px; }
      .ottoserv-msg.agent { align-self: flex-start; background: #1e293b; color: #e2e8f0; border-bottom-left-radius: 4px; }
      .ottoserv-msg.typing { opacity: 0.6; }
      #ottoserv-chat-input-area {
        display: flex; padding: 12px; border-top: 1px solid #1e293b; gap: 8px;
      }
      #ottoserv-chat-input {
        flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 8px;
        color: #fff; padding: 10px 12px; font-size: 14px; outline: none; resize: none;
      }
      #ottoserv-chat-input::placeholder { color: #64748b; }
      #ottoserv-chat-input:focus { border-color: #3b82f6; }
      #ottoserv-chat-send {
        background: #3b82f6; border: none; border-radius: 8px; width: 40px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      #ottoserv-chat-send svg { width: 18px; height: 18px; fill: white; }
      #ottoserv-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
      .ottoserv-powered { text-align: center; padding: 6px; font-size: 11px; color: #475569; }
      .ottoserv-powered a { color: #3b82f6; text-decoration: none; }
      @media (max-width: 480px) {
        #ottoserv-chat-window { width: calc(100vw - 32px); right: 16px; bottom: 88px; max-height: 70vh; }
      }
    `;
    document.head.appendChild(style);

    // Bubble
    var bubble = document.createElement('div');
    bubble.id = 'ottoserv-chat-bubble';
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';
    bubble.onclick = toggleChat;
    document.body.appendChild(bubble);

    // Window
    var win = document.createElement('div');
    win.id = 'ottoserv-chat-window';
    win.innerHTML = `
      <div id="ottoserv-chat-header">
        <div class="dot"></div>
        <div>
          <div class="title">OttoServ</div>
          <div class="subtitle">AI Assistant • Usually responds instantly</div>
        </div>
        <button id="ottoserv-chat-close" onclick="document.getElementById('ottoserv-chat-window').classList.remove('open')">&times;</button>
      </div>
      <div id="ottoserv-chat-messages"></div>
      <div id="ottoserv-chat-input-area">
        <input id="ottoserv-chat-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();document.getElementById('ottoserv-chat-send').click()}" />
        <button id="ottoserv-chat-send" onclick="window.__ottoservSend()">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div class="ottoserv-powered">Powered by <a href="https://ottoserv.com" target="_blank">OttoServ</a></div>
    `;
    document.body.appendChild(win);

    // Add welcome message after a short delay
    setTimeout(function() {
      addMessage('agent', 'Hi! 👋 I\'m the OttoServ AI assistant. I can help you learn about our services for contractors, property managers, and service businesses. How can I help you today?');
    }, 500);
  }

  function toggleChat() {
    var win = document.getElementById('ottoserv-chat-window');
    isOpen = !isOpen;
    if (isOpen) { win.classList.add('open'); } else { win.classList.remove('open'); }
  }

  function addMessage(role, text) {
    var container = document.getElementById('ottoserv-chat-messages');
    var div = document.createElement('div');
    div.className = 'ottoserv-msg ' + role;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    messages.push({ role: role, text: text });
  }

  window.__ottoservSend = async function() {
    var input = document.getElementById('ottoserv-chat-input');
    var btn = document.getElementById('ottoserv-chat-send');
    var text = input.value.trim();
    if (!text) return;

    addMessage('visitor', text);
    input.value = '';
    btn.disabled = true;

    // Show typing indicator
    var typing = document.createElement('div');
    typing.className = 'ottoserv-msg agent typing';
    typing.textContent = 'Typing...';
    typing.id = 'ottoserv-typing';
    document.getElementById('ottoserv-chat-messages').appendChild(typing);

    try {
      // Check for auth tokens (platform or dashboard)
      var token = localStorage.getItem('ottoserv_platform_token') || localStorage.getItem('ottoserv_token') || '';
      var headers = { 'Content-Type': 'application/json' };
      if (token) { headers['Authorization'] = 'Bearer ' + token; }

      var res = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          session_id: sessionId,
          client_id: CLIENT_ID,
          message: text,
          visitor_url: window.location.href
        })
      });
      var data = await res.json();
      sessionId = data.session_id || sessionId;
      localStorage.setItem(SESSION_KEY, sessionId);

      var t = document.getElementById('ottoserv-typing');
      if (t) t.remove();

      addMessage('agent', data.response || 'Sorry, I had trouble responding. Please try again or call us at (407) 798-8172.');
    } catch (e) {
      var t = document.getElementById('ottoserv-typing');
      if (t) t.remove();
      addMessage('agent', 'Sorry, I\'m having trouble connecting. You can call us directly at (407) 798-8172 or book a call at calendly.com/team-ottoserv/30min');
    }
    btn.disabled = false;
    input.focus();
  };

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
