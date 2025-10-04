// Limbo Studio Chat Widget
// Vanilla JavaScript - No framework dependencies

(function() {
  'use strict';
  
  const CONFIG = {
    endpoint: '/api/chat',
    sendEndpoint: '/api/send-transcript',
    healthEndpoint: '/api/health',
    maxMessageLength: 1000,
    position: 'bottom-right',
    primaryColor: '#8ecbff',
    accentColor: '#a58cff',
    bgColor: '#0b0f14',
    panelColor: '#111824'
  };
  
  const STARTERS = [
    { id: 'describe', emoji: '💡', text: 'Help me describe my project' },
    { id: 'doc-chaos', emoji: '📄', text: 'Fix our document chaos' },
    { id: 'site-bot', emoji: '🤖', text: 'Add AI chatbot to website' },
    { id: 'ai-site', emoji: '🌐', text: 'Build AI-powered website' },
    { id: 'schedule', emoji: '📅', text: 'AI scheduling assistant' }
  ];
  
  class LimboChatWidget {
    constructor() {
      this.isOpen = false;
      this.sessionId = this.getOrCreateSessionId();
      this.messages = [];
      this.isLoading = false;
      this.hasSentTranscript = false;
      this.currentPlan = null;
      
      this.init();
    }
    
    init() {
      this.injectStyles();
      this.createWidget();
      this.attachEventListeners();
      this.checkHealth();
      
      // Expose API for programmatic control
      window.LimboChat = {
        open: () => this.open(),
        close: () => this.close(),
        sendMessage: (msg) => this.sendMessage(msg)
      };
    }
    
    getOrCreateSessionId() {
      let sessionId = localStorage.getItem('limbo_chat_session');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('limbo_chat_session', sessionId);
      }
      return sessionId;
    }
    
    injectStyles() {
      const style = document.createElement('style');
      style.textContent = `
        #limbo-chat-widget {
          position: fixed;
          ${CONFIG.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
          ${CONFIG.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          z-index: 999999;
        }
        
        #limbo-chat-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
          color: ${CONFIG.bgColor};
          border: none;
          border-radius: 24px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        #limbo-chat-toggle:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }
        
        #limbo-chat-toggle.open {
          border-radius: 50%;
          width: 48px;
          height: 48px;
          padding: 0;
          justify-content: center;
        }
        
        #limbo-chat-toggle .text {
          transition: opacity 0.2s;
        }
        
        #limbo-chat-toggle.open .text {
          display: none;
        }
        
        #limbo-chat-panel {
          position: absolute;
          ${CONFIG.position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;'}
          ${CONFIG.position.includes('right') ? 'right: 0;' : 'left: 0;'}
          width: 380px;
          max-width: calc(100vw - 40px);
          height: 600px;
          max-height: calc(100vh - 120px);
          background: ${CONFIG.panelColor};
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          display: none;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(142,203,255,0.15);
        }
        
        #limbo-chat-panel.open {
          display: flex;
          animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .limbo-chat-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
          color: ${CONFIG.bgColor};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .limbo-chat-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }
        
        .limbo-chat-close {
          background: none;
          border: none;
          color: ${CONFIG.bgColor};
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }
        
        .limbo-chat-close:hover {
          background: rgba(0,0,0,0.1);
        }
        
        .limbo-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .limbo-chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        
        .limbo-chat-messages::-webkit-scrollbar-track {
          background: rgba(142,203,255,0.05);
        }
        
        .limbo-chat-messages::-webkit-scrollbar-thumb {
          background: rgba(142,203,255,0.2);
          border-radius: 3px;
        }
        
        .limbo-chat-starters {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0;
        }
        
        .limbo-starter-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(142,203,255,0.08);
          border: 1px solid rgba(142,203,255,0.2);
          border-radius: 12px;
          color: #e6edf3;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .limbo-starter-btn:hover {
          background: rgba(142,203,255,0.15);
          border-color: rgba(142,203,255,0.3);
          transform: translateX(4px);
        }
        
        .limbo-message {
          display: flex;
          gap: 10px;
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .limbo-message.user {
          flex-direction: row-reverse;
        }
        
        .limbo-message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 16px;
        }
        
        .limbo-message.bot .limbo-message-avatar {
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
        }
        
        .limbo-message.user .limbo-message-avatar {
          background: rgba(142,203,255,0.2);
        }
        
        .limbo-message-content {
          flex: 1;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          color: #e6edf3;
        }
        
        .limbo-message.bot .limbo-message-content {
          background: rgba(17,24,36,0.8);
          border: 1px solid rgba(142,203,255,0.12);
        }
        
        .limbo-message.user .limbo-message-content {
          background: rgba(142,203,255,0.15);
          border: 1px solid rgba(142,203,255,0.25);
        }
        
        .limbo-message-content p {
          margin: 0 0 8px 0;
        }
        
        .limbo-message-content p:last-child {
          margin-bottom: 0;
        }
        
        .limbo-message-content strong {
          color: ${CONFIG.primaryColor};
        }
        
        .limbo-typing {
          display: flex;
          gap: 4px;
          padding: 8px 0;
        }
        
        .limbo-typing span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${CONFIG.primaryColor};
          animation: bounce 1.4s infinite;
        }
        
        .limbo-typing span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .limbo-typing span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }
        
        .limbo-chat-input-area {
          padding: 16px 20px;
          background: rgba(17,24,36,0.6);
          border-top: 1px solid rgba(142,203,255,0.12);
        }
        
        .limbo-chat-input-wrapper {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        
        .limbo-chat-input {
          flex: 1;
          background: rgba(12,18,28,0.8);
          border: 1px solid rgba(142,203,255,0.2);
          border-radius: 12px;
          padding: 10px 14px;
          color: #e6edf3;
          font-size: 14px;
          font-family: inherit;
          resize: none;
          max-height: 120px;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .limbo-chat-input:focus {
          border-color: ${CONFIG.primaryColor};
          box-shadow: 0 0 0 3px rgba(142,203,255,0.1);
        }
        
        .limbo-chat-input::placeholder {
          color: #9fb0c3;
        }
        
        .limbo-chat-send {
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
          border: none;
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        
        .limbo-chat-send:hover:not(:disabled) {
          transform: scale(1.05);
        }
        
        .limbo-chat-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .limbo-transcript-prompt {
          background: rgba(142,203,255,0.08);
          border: 1px solid rgba(142,203,255,0.2);
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
        }
        
        .limbo-transcript-prompt h4 {
          margin: 0 0 8px 0;
          color: ${CONFIG.primaryColor};
          font-size: 14px;
        }
        
        .limbo-transcript-prompt p {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #9fb0c3;
        }
        
        .limbo-transcript-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .limbo-transcript-form input {
          background: rgba(12,18,28,0.8);
          border: 1px solid rgba(142,203,255,0.2);
          border-radius: 8px;
          padding: 8px 12px;
          color: #e6edf3;
          font-size: 13px;
          outline: none;
        }
        
        .limbo-transcript-form input:focus {
          border-color: ${CONFIG.primaryColor};
        }
        
        .limbo-transcript-form button {
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
          border: none;
          border-radius: 8px;
          padding: 10px;
          color: ${CONFIG.bgColor};
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .limbo-transcript-form button:hover {
          transform: translateY(-1px);
        }
        
        .limbo-transcript-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .limbo-status-message {
          font-size: 12px;
          color: #9fb0c3;
          margin-top: 4px;
        }
        
        .limbo-status-message.success {
          color: #4ade80;
        }
        
        .limbo-status-message.error {
          color: #f87171;
        }

        /* Rate Limit Modal */
        .limbo-rate-limit-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000000;
          padding: 20px;
        }

        .limbo-modal-content {
          background: ${CONFIG.panelColor};
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: limbo-modal-slide 0.3s ease;
        }

        @keyframes limbo-modal-slide {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .limbo-modal-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .limbo-modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: white;
        }

        .limbo-modal-close {
          background: none;
          border: none;
          color: #9fb0c3;
          font-size: 28px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .limbo-modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .limbo-modal-body {
          padding: 24px;
          color: #e0e8f0;
        }

        .limbo-modal-body > p {
          margin: 0 0 20px;
          font-size: 15px;
          line-height: 1.6;
        }

        .limbo-summary-section {
          background: rgba(142, 203, 255, 0.1);
          border-left: 3px solid ${CONFIG.primaryColor};
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .limbo-summary-section h4 {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 600;
          color: ${CONFIG.primaryColor};
        }

        .limbo-summary-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #c9d7e5;
        }

        .limbo-inquiry-section h4 {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .limbo-inquiry-section > p {
          margin: 0 0 12px;
          font-size: 13px;
          color: #9fb0c3;
        }

        .limbo-modal-input,
        .limbo-modal-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: ${CONFIG.bgColor};
          color: white;
          font-size: 14px;
          font-family: inherit;
          margin-bottom: 12px;
          box-sizing: border-box;
        }

        .limbo-modal-input:focus,
        .limbo-modal-textarea:focus {
          outline: none;
          border-color: ${CONFIG.primaryColor};
        }

        .limbo-modal-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .limbo-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .limbo-modal-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .limbo-modal-btn.primary {
          background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
          color: ${CONFIG.bgColor};
        }

        .limbo-modal-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(142, 203, 255, 0.3);
        }

        .limbo-modal-btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .limbo-modal-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .limbo-modal-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .limbo-modal-status {
          padding: 0 24px 16px;
          margin: 0;
          font-size: 13px;
          text-align: center;
        }

        .limbo-modal-status.success {
          color: #4ade80;
        }

        .limbo-modal-status.error {
          color: #f87171;
        }

        @media (max-width: 480px) {
          #limbo-chat-panel {
            width: calc(100vw - 40px);
            height: calc(100vh - 120px);
          }

          .limbo-modal-content {
            max-width: calc(100vw - 40px);
          }

          .limbo-modal-footer {
            flex-direction: column-reverse;
          }

          .limbo-modal-btn {
            width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    createWidget() {
      const container = document.createElement('div');
      container.id = 'limbo-chat-widget';
      
      container.innerHTML = `
        <button id="limbo-chat-toggle" aria-label="Open chat">
          <span class="emoji">💬</span>
          <span class="text">Chat</span>
        </button>
        
        <div id="limbo-chat-panel">
          <div class="limbo-chat-header">
            <h3>Limbo Studio</h3>
            <button class="limbo-chat-close" aria-label="Close chat">×</button>
          </div>
          
          <div class="limbo-chat-messages" id="limbo-messages">
            <div class="limbo-message bot">
              <div class="limbo-message-avatar">🤖</div>
              <div class="limbo-message-content">
                <p><strong>Hey there!</strong> I'm here to help you scope out AI automation for your team.</p>
                <p>Pick a starting point or tell me what you're working on:</p>
              </div>
            </div>
            <div class="limbo-chat-starters" id="limbo-starters">
              ${STARTERS.map(s => `
                <button class="limbo-starter-btn" data-starter="${s.id}">
                  <span>${s.emoji}</span>
                  <span>${s.text}</span>
                </button>
              `).join('')}
            </div>
          </div>
          
          <div class="limbo-chat-input-area">
            <div class="limbo-chat-input-wrapper">
              <textarea 
                id="limbo-chat-input" 
                class="limbo-chat-input"
                placeholder="Type your message..."
                rows="1"
                maxlength="${CONFIG.maxMessageLength}"
              ></textarea>
              <button id="limbo-chat-send" class="limbo-chat-send" aria-label="Send message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(container);
    }
    
    attachEventListeners() {
      const toggle = document.getElementById('limbo-chat-toggle');
      const close = document.querySelector('.limbo-chat-close');
      const input = document.getElementById('limbo-chat-input');
      const sendBtn = document.getElementById('limbo-chat-send');
      const starters = document.querySelectorAll('.limbo-starter-btn');
      
      toggle.addEventListener('click', () => this.toggleChat());
      close.addEventListener('click', () => this.close());
      sendBtn.addEventListener('click', () => this.handleSend());
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
      
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
      
      starters.forEach(btn => {
        btn.addEventListener('click', () => {
          const starterId = btn.dataset.starter;
          this.sendStarter(starterId);
        });
      });
    }
    
    toggleChat() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }
    
    open() {
      this.isOpen = true;
      const toggle = document.getElementById('limbo-chat-toggle');
      const panel = document.getElementById('limbo-chat-panel');
      
      toggle.classList.add('open');
      panel.classList.add('open');
      
      setTimeout(() => {
        document.getElementById('limbo-chat-input').focus();
      }, 300);
    }
    
    close() {
      this.isOpen = false;
      const toggle = document.getElementById('limbo-chat-toggle');
      const panel = document.getElementById('limbo-chat-panel');
      
      toggle.classList.remove('open');
      panel.classList.remove('open');
    }
    
    async checkHealth() {
      try {
        const response = await fetch(CONFIG.healthEndpoint);
        const data = await response.json();
        if (!data.ok) {
          console.warn('Chat service unhealthy');
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }
    
    hideStarters() {
      const starters = document.getElementById('limbo-starters');
      if (starters) {
        starters.style.display = 'none';
      }
    }
    
    addMessage(role, content, isTyping = false) {
      const messagesContainer = document.getElementById('limbo-messages');
      
      if (isTyping) {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'limbo-message bot';
        typingDiv.id = 'limbo-typing-indicator';
        typingDiv.innerHTML = `
          <div class="limbo-message-avatar">🤖</div>
          <div class="limbo-message-content">
            <div class="limbo-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        `;
        messagesContainer.appendChild(typingDiv);
      } else {
        const messageDiv = document.createElement('div');
        messageDiv.className = `limbo-message ${role}`;
        
        const avatar = role === 'bot' ? '🤖' : '👤';
        const formattedContent = this.formatMessage(content);
        
        messageDiv.innerHTML = `
          <div class="limbo-message-avatar">${avatar}</div>
          <div class="limbo-message-content">${formattedContent}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        this.messages.push({ role, content });
      }
      
      this.scrollToBottom();
    }
    
    removeTypingIndicator() {
      const typing = document.getElementById('limbo-typing-indicator');
      if (typing) {
        typing.remove();
      }
    }
    
    formatMessage(text) {
      // Convert markdown-style formatting to HTML
      let formatted = text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');
      
      if (!formatted.startsWith('<p>')) {
        formatted = '<p>' + formatted + '</p>';
      }
      
      return formatted;
    }
    
    scrollToBottom() {
      const messagesContainer = document.getElementById('limbo-messages');
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    async handleSend() {
      const input = document.getElementById('limbo-chat-input');
      const message = input.value.trim();
      
      if (!message || this.isLoading) return;
      
      this.hideStarters();
      this.addMessage('user', message);
      input.value = '';
      input.style.height = 'auto';
      
      await this.sendMessage(message);
    }
    
    async sendStarter(starterId) {
      if (this.isLoading) return;
      
      const starter = STARTERS.find(s => s.id === starterId);
      if (!starter) return;
      
      this.hideStarters();
      this.addMessage('user', starter.text);
      
      await this.sendMessage(null, starterId);
    }
    
    async sendMessage(message = null, starter = null) {
      this.isLoading = true;
      document.getElementById('limbo-chat-send').disabled = true;
      
      this.addMessage('bot', '', true);
      
      try {
        const response = await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: this.sessionId,
            message: message,
            starter: starter,
            client_ts: new Date().toISOString()
          })
        });
        
        this.removeTypingIndicator();
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.reply_markdown || 'Request failed');
        }
        
        const data = await response.json();
        
        if (!data.ok) {
          throw new Error(data.reply_markdown || data.error || 'Unknown error');
        }
        
        this.addMessage('bot', data.reply_markdown);
        
        if (data.plan) {
          this.currentPlan = data.plan;
        }
        
        if (data.is_final && !this.hasSentTranscript) {
          this.showTranscriptPrompt();
        }
        
      } catch (error) {
        this.removeTypingIndicator();
        console.error('Send message error:', error);

        // Check if this is a rate limit error
        if (error.message && error.message.includes('rate limit')) {
          this.showRateLimitModal();
        } else {
          this.addMessage('bot', error.message || 'Sorry, something went wrong. Please try again or email us at contact@thelimbostudio.com');
        }
      } finally {
        this.isLoading = false;
        document.getElementById('limbo-chat-send').disabled = false;
      }
    }
    
    showTranscriptPrompt() {
      const messagesContainer = document.getElementById('limbo-messages');
      
      const promptDiv = document.createElement('div');
      promptDiv.className = 'limbo-transcript-prompt';
      promptDiv.innerHTML = `
        <h4>💌 Send this to our team?</h4>
        <p>We'll review your chat and follow up with personalized recommendations.</p>
        <form class="limbo-transcript-form" id="limbo-transcript-form">
          <input 
            type="email" 
            id="limbo-visitor-email" 
            placeholder="Your email (optional)"
            autocomplete="email"
          />
          <button type="submit">Send to Limbo Studio</button>
        </form>
        <div class="limbo-status-message" id="limbo-transcript-status"></div>
      `;
      
      messagesContainer.appendChild(promptDiv);
      this.scrollToBottom();
      
      const form = document.getElementById('limbo-transcript-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendTranscript();
      });
    }
    
    async sendTranscript() {
      if (this.hasSentTranscript) return;
      
      const emailInput = document.getElementById('limbo-visitor-email');
      const submitBtn = document.querySelector('#limbo-transcript-form button');
      const statusEl = document.getElementById('limbo-transcript-status');
      
      submitBtn.disabled = true;
      statusEl.textContent = 'Sending...';
      statusEl.className = 'limbo-status-message';
      
      try {
        const response = await fetch(CONFIG.sendEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: this.sessionId,
            visitor_email: emailInput.value || null,
            consent: true,
            transcript: this.messages,
            plan: this.currentPlan
          })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
          throw new Error(data.message || 'Failed to send');
        }
        
        this.hasSentTranscript = true;
        statusEl.textContent = `✓ Sent! We'll be in touch soon. Ticket: ${data.ticket_id}`;
        statusEl.className = 'limbo-status-message success';
        
        submitBtn.style.display = 'none';
        emailInput.style.display = 'none';
        
      } catch (error) {
        console.error('Send transcript error:', error);
        statusEl.textContent = '✗ Failed to send. Please email contact@thelimbostudio.com';
        statusEl.className = 'limbo-status-message error';
        submitBtn.disabled = false;
      }
    }

    showRateLimitModal() {
      // Generate conversation summary
      const summary = this.generateConversationSummary();

      // Create modal overlay
      const modal = document.createElement('div');
      modal.className = 'limbo-rate-limit-modal';
      modal.innerHTML = `
        <div class="limbo-modal-content">
          <div class="limbo-modal-header">
            <h3>⏱️ Rate Limit Reached</h3>
            <button class="limbo-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="limbo-modal-body">
            <p>You've hit our conversation limit, but we'd love to continue helping you!</p>

            <div class="limbo-summary-section">
              <h4>📝 Conversation Summary</h4>
              <p class="limbo-summary-text">${summary}</p>
            </div>

            <div class="limbo-inquiry-section">
              <h4>📧 Send Your Inquiry</h4>
              <p>Share your email so we can continue this conversation personally:</p>
              <input
                type="email"
                id="limbo-modal-email"
                placeholder="your@email.com"
                class="limbo-modal-input"
              />
              <textarea
                id="limbo-modal-request"
                placeholder="Describe what you need help with (optional - we already have your conversation)"
                class="limbo-modal-textarea"
                rows="3"
              ></textarea>
            </div>
          </div>
          <div class="limbo-modal-footer">
            <button class="limbo-modal-btn secondary" id="limbo-modal-cancel">Maybe Later</button>
            <button class="limbo-modal-btn primary" id="limbo-modal-submit">Send Inquiry</button>
          </div>
          <p class="limbo-modal-status" id="limbo-modal-status"></p>
        </div>
      `;

      document.body.appendChild(modal);

      // Event listeners
      const closeBtn = modal.querySelector('.limbo-modal-close');
      const cancelBtn = modal.querySelector('#limbo-modal-cancel');
      const submitBtn = modal.querySelector('#limbo-modal-submit');
      const emailInput = modal.querySelector('#limbo-modal-email');
      const requestInput = modal.querySelector('#limbo-modal-request');
      const statusEl = modal.querySelector('#limbo-modal-status');

      const closeModal = () => {
        modal.remove();
      };

      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);

      submitBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const request = requestInput.value.trim();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          statusEl.textContent = 'Please enter a valid email address';
          statusEl.className = 'limbo-modal-status error';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        statusEl.textContent = '';

        try {
          const response = await fetch(CONFIG.sendEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              session_id: this.sessionId,
              visitor_email: email,
              consent: true,
              transcript: this.messages,
              plan: this.currentPlan,
              additional_request: request || null
            })
          });

          const data = await response.json();

          if (!data.ok) {
            throw new Error(data.message || 'Failed to send');
          }

          statusEl.textContent = `✓ Sent! We'll reach out within 24 hours. Ticket: ${data.ticket_id}`;
          statusEl.className = 'limbo-modal-status success';

          setTimeout(closeModal, 3000);

        } catch (error) {
          console.error('Send inquiry error:', error);
          statusEl.textContent = '✗ Failed to send. Please email contact@thelimbostudio.com';
          statusEl.className = 'limbo-modal-status error';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Inquiry';
        }
      });
    }

    generateConversationSummary() {
      if (this.messages.length === 0) {
        return 'You started a conversation but hit the rate limit before sending messages.';
      }

      const userMessages = this.messages.filter(m => m.role === 'user').map(m => m.content);
      const topics = userMessages.join('. ').slice(0, 300);

      return `You discussed: ${topics}${topics.length >= 300 ? '...' : ''}`;
    }
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new LimboChatWidget());
  } else {
    new LimboChatWidget();
  }
})();
