// ─── Routing config ──────────────────────────────────────────────────────────

const COMPLEX_KEYWORDS = [
    'explain', 'analyze', 'analyse', 'research', 'code', 'algorithm',
    'mathematics', 'physics', 'chemistry', 'biology', 'philosophy',
    'debate', 'compare', 'contrast', 'reasoning', 'proof', 'complex',
    'detailed', 'comprehensive', 'debug', 'fix', 'implement', 'design',
    'architecture', 'write', 'summarize', 'summarise', 'review', 'evaluate'
];

// ─── State ───────────────────────────────────────────────────────────────────

let chatHistory = [];          // [{role, content}, ...]
let activeModel  = 'Groq (Llama 3)';

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const messageInput      = document.getElementById('messageInput');
const sendBtn           = document.getElementById('sendBtn');
const chatMessages      = document.getElementById('chatMessages');
const currentModelEl    = document.getElementById('currentModel');
const newChatBtn        = document.querySelector('.new-chat-btn');

// ─── Event listeners ─────────────────────────────────────────────────────────

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
newChatBtn.addEventListener('click', clearChat);

// ─── Core send logic ─────────────────────────────────────────────────────────

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || sendBtn.disabled) return;

    // Snapshot history BEFORE appending the new user turn so the server
    // doesn't see a duplicate (it appends `message` itself).
    const historySent = [...chatHistory];

    addMessageToUI(message, 'user');
    messageInput.value = '';
    setSending(true);

    const isComplex = analyzeComplexity(message);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history: historySent, isComplex })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }

        // Update the model badge to what the server actually used
        if (data.model) setModelDisplay(data.model);

        addMessageToUI(data.response, 'assistant');
    } catch (err) {
        console.error('Chat error:', err);
        addMessageToUI(`⚠️ Error: ${err.message}`, 'assistant');
    } finally {
        setSending(false);
    }
}

// ─── Complexity heuristic ────────────────────────────────────────────────────

function analyzeComplexity(message) {
    const lower = message.toLowerCase();
    const hasKeyword = COMPLEX_KEYWORDS.some(k => lower.includes(k));
    const isLong     = message.length > 100;
    return hasKeyword || isLong;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

function addMessageToUI(content, role) {
    chatHistory.push({ role, content });

    // Remove welcome screen on first real exchange
    if (chatHistory.length === 2) {
        document.querySelector('.welcome-section')?.remove();
        // Once messages start, let the container scroll normally
        chatMessages.style.justifyContent = 'flex-start';
    }

    const el = document.createElement('div');
    el.className = `message ${role}`;
    el.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setSending(isSending) {
    sendBtn.disabled   = isSending;
    messageInput.disabled = isSending;

    if (isSending) {
        // Show a typing indicator
        const indicator = document.createElement('div');
        indicator.className = 'message assistant';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `<div class="message-content typing">
            <span></span><span></span><span></span>
        </div>`;
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        document.getElementById('typingIndicator')?.remove();
    }
}

function setModelDisplay(modelName) {
    activeModel = modelName;
    currentModelEl.textContent = modelName;
}

function clearChat() {
    chatHistory = [];
    chatMessages.innerHTML = `
        <div class="welcome-section">
            <div class="welcome-icon">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M50 20C33.4 20 20 33.4 20 50S33.4 80 50 80S80 66.6 80 50S66.6 20 50 20M30 55L45 65L70 35"
                          stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1 class="welcome-title">Chatbot UI</h1>
        </div>`;
    chatMessages.style.justifyContent = 'center';
    setModelDisplay('Groq (Llama 3)');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Settings (no longer needed for keys — they live in .env) ────────────────

document.querySelector('.settings-btn')?.addEventListener('click', () => {
    alert(
        'API keys are configured in your .env file on the server.\n\n' +
        'ANTHROPIC_API_KEY  →  Claude Sonnet 4 (complex queries)\n' +
        'GROQ_API_KEY       →  Groq Llama 3 (fast queries)'
    );
});

// ─── Init ────────────────────────────────────────────────────────────────────

console.log('Chatbot UI ready.  Complex → Claude Sonnet 4  |  Simple → Groq Llama 3');
setModelDisplay('Groq (Llama 3)');
