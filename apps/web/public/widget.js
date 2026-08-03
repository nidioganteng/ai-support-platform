/* eslint-env browser */
(function () {
  // Find the script tag that loaded this widget to extract data attributes
  const scripts = document.getElementsByTagName('script');
  const currentScript = Array.from(scripts).find(s => s.src.includes('widget.js'));
  
  if (!currentScript) {
    console.error('AI Support Widget: Script tag not found.');
    return;
  }

  const orgKey = currentScript.getAttribute('data-org-key');
  if (!orgKey) {
    console.error('AI Support Widget: Missing data-org-key attribute.');
    return;
  }

  // Configuration
  const API_URL = currentScript.getAttribute('data-api-url') || 'http://localhost:4000';
  let conversationId = null;

  // Create UI Container
  const container = document.createElement('div');
  container.id = 'ai-support-widget-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  document.body.appendChild(container);

  // Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #ai-support-widget-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #4f46e5;
      color: white;
      border: none;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    #ai-support-widget-btn:hover {
      transform: scale(1.05);
    }
    #ai-support-widget-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    #ai-support-widget-header {
      background-color: #4f46e5;
      color: white;
      padding: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #ai-support-widget-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
    }
    #ai-support-widget-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: #f9fafb;
    }
    .ai-msg, .user-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.4;
    }
    .ai-msg {
      align-self: flex-start;
      background-color: #e5e7eb;
      color: #111827;
      border-bottom-left-radius: 0;
    }
    .user-msg {
      align-self: flex-end;
      background-color: #4f46e5;
      color: white;
      border-bottom-right-radius: 0;
    }
    #ai-support-widget-input-area {
      display: flex;
      padding: 12px;
      background-color: white;
      border-top: 1px solid #e5e7eb;
    }
    #ai-support-widget-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      outline: none;
      font-size: 14px;
    }
    #ai-support-widget-input:focus {
      border-color: #4f46e5;
    }
    #ai-support-widget-send {
      background-color: #4f46e5;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0 16px;
      margin-left: 8px;
      cursor: pointer;
      font-weight: 500;
    }
    #ai-support-widget-send:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    .ai-loading {
      display: flex;
      gap: 4px;
      padding: 14px;
    }
    .ai-dot {
      width: 6px;
      height: 6px;
      background-color: #6b7280;
      border-radius: 50%;
      animation: ai-bounce 1.4s infinite ease-in-out both;
    }
    .ai-dot:nth-child(1) { animation-delay: -0.32s; }
    .ai-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes ai-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // HTML Structure
  container.innerHTML = `
    <div id="ai-support-widget-window">
      <div id="ai-support-widget-header">
        <span>AI Support</span>
        <button id="ai-support-widget-close">&times;</button>
      </div>
      <div id="ai-support-widget-messages">
        <div class="ai-msg">Hello! How can I help you today?</div>
      </div>
      <div id="ai-support-widget-input-area">
        <input type="text" id="ai-support-widget-input" placeholder="Type your message..." autocomplete="off" />
        <button id="ai-support-widget-send">Send</button>
      </div>
    </div>
    <button id="ai-support-widget-btn">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
  `;

  // Elements
  const btn = document.getElementById('ai-support-widget-btn');
  const chatWindow = document.getElementById('ai-support-widget-window');
  const closeBtn = document.getElementById('ai-support-widget-close');
  const messagesDiv = document.getElementById('ai-support-widget-messages');
  const inputEl = document.getElementById('ai-support-widget-input');
  const sendBtn = document.getElementById('ai-support-widget-send');

  let isOpen = false;

  // Toggle Window
  const toggleWindow = () => {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) inputEl.focus();
  };

  btn.addEventListener('click', toggleWindow);
  closeBtn.addEventListener('click', toggleWindow);

  // Add Message to UI
  const appendMessage = (text, sender) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'user' ? 'user-msg' : 'ai-msg';
    msgDiv.textContent = text;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const showLoading = () => {
    const loader = document.createElement('div');
    loader.className = 'ai-msg ai-loading';
    loader.id = 'ai-loading-indicator';
    loader.innerHTML = '<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>';
    messagesDiv.appendChild(loader);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const removeLoading = () => {
    const loader = document.getElementById('ai-loading-indicator');
    if (loader) loader.remove();
  };

  // Send Message API Call
  const sendMessage = async () => {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    inputEl.disabled = true;
    sendBtn.disabled = true;

    appendMessage(text, 'user');
    showLoading();

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-key': orgKey
        },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId
        })
      });

      const data = await response.json();
      removeLoading();

      if (response.ok) {
        appendMessage(data.message.content, 'ai');
        if (data.conversationId) {
          conversationId = data.conversationId; // store if backend returns it
        }
      } else {
        appendMessage('Sorry, an error occurred: ' + (data.error || 'Unknown error'), 'ai');
      }
    } catch (err) {
      removeLoading();
      appendMessage('Connection error. Please try again later.', 'ai');
      console.error('Widget Chat Error:', err);
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

})();
