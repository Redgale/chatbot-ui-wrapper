// ── State ─────────────────────────────────────────────────────────────────────

let chatHistory      = [];          // [{role, content}] for current session
let sessions         = [];          // [{id, title, messages, timestamp}]
let currentSessionId = null;
let modelMode        = 'auto';      // 'auto' | 'claude' | 'groq'
let sidebarOpen      = true;
let isSending        = false;
let lastUsedModel    = null;        // 'claude' | 'groq'
let searchQuery      = '';

// ── DOM refs ──────────────────────────────────────────────────────────────────

const app             = document.getElementById('app');
const sidebar         = document.getElementById('sidebar');
const sidebarToggle   = document.getElementById('sidebarToggle');
const sidebarExpandTab= document.getElementById('sidebarExpandTab');
const hamburger       = document.getElementById('hamburger');
const newChatBtn      = document.getElementById('newChatBtn');
const sessionsList    = document.getElementById('sessionsList');
const searchInput     = document.getElementById('searchInput');
const searchClear     = document.getElementById('searchClear');
const exportBtn       = document.getElementById('exportBtn');
const settingsBtn     = document.getElementById('settingsBtn');
const messages        = document.getElementById('messages');
const welcome         = document.getElementById('welcome');
const messageInput    = document.getElementById('messageInput');
const sendBtn         = document.getElementById('sendBtn');
const modelBtn        = document.getElementById('modelBtn');
const modelDropdown   = document.getElementById('modelDropdown');
const modelDot        = document.getElementById('modelDot');
const modelLabel      = document.getElementById('modelLabel');
const modalBackdrop   = document.getElementById('modalBackdrop');
const closeModal      = document.getElementById('closeModal');
const clearAllBtn     = document.getElementById('clearAllBtn');
const inputWrap       = document.getElementById('inputWrap');

// ── Sidebar ───────────────────────────────────────────────────────────────────

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    app.classList.toggle('sidebar-collapsed', !sidebarOpen);
}

sidebarToggle.addEventListener('click', toggleSidebar);
sidebarExpandTab.addEventListener('click', toggleSidebar);
hamburger.addEventListener('click', toggleSidebar);

// ── Sessions ──────────────────────────────────────────────────────────────────

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function saveCurrentToSessions() {
    if (chatHistory.length === 0) return;

    const title = chatHistory.find(m => m.role === 'user')?.content.slice(0, 48) || 'Chat';

    if (currentSessionId) {
        const idx = sessions.findIndex(s => s.id === currentSessionId);
        if (idx !== -1) {
            sessions[idx].messages = [...chatHistory];
            sessions[idx].title    = title;
            return;
        }
    }

    const session = {
        id:        generateId(),
        title,
        messages:  [...chatHistory],
        timestamp: Date.now()
    };
    sessions.unshift(session);
    currentSessionId = session.id;
    renderSessionsList();
}

function loadSession(id) {
    saveCurrentToSessions();
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    currentSessionId = id;
    chatHistory      = [...session.messages];

    // Re-render messages
    messages.innerHTML = '';
    chatHistory.forEach(m => renderMessage(m.content, m.role, false));

    renderSessionsList();
    messages.scrollTop = messages.scrollHeight;
}

function deleteSession(id, e) {
    e.stopPropagation();
    sessions = sessions.filter(s => s.id !== id);
    if (currentSessionId === id) {
        startNewChat(false);
    }
    renderSessionsList();
}

function startNewChat(saveFirst = true) {
    if (saveFirst) saveCurrentToSessions();
    chatHistory      = [];
    currentSessionId = null;
    lastUsedModel    = null;

    messages.innerHTML = '';
    const w = document.createElement('div');
    w.className = 'welcome';
    w.id = 'welcome';
    w.innerHTML = `
        <div class="welcome-glyph">+</div>
        <h1>Chatbot UI</h1>
        <p>Claude Sonnet 4 for complex queries &middot; Groq for fast replies</p>`;
    messages.appendChild(w);

    renderSessionsList();
    messageInput.focus();
}

function renderSessionsList() {
    const q = searchQuery.toLowerCase();
    const filtered = q
        ? sessions.filter(s => s.title.toLowerCase().includes(q) ||
            s.messages.some(m => m.content.toLowerCase().includes(q)))
        : sessions;

    if (filtered.length === 0) {
        sessionsList.innerHTML = `<p class="empty-state">${q ? 'No matches.' : 'No chats yet.'}</p>`;
        return;
    }

    sessionsList.innerHTML = filtered.map(s => {
        const ago      = timeAgo(s.timestamp);
        const titleHtml = q
            ? s.title.replace(new RegExp(`(${escReg(q)})`, 'gi'), '<mark>$1</mark>')
            : escapeHtml(s.title);
        const active = s.id === currentSessionId ? ' active' : '';
        return `
        <div class="session-item${active}" data-id="${s.id}">
            <span class="session-title" title="${escapeHtml(s.title)}">${titleHtml}</span>
            <span class="session-time">${ago}</span>
            <button class="session-delete" data-id="${s.id}" title="Delete">✕</button>
        </div>`;
    }).join('');

    sessionsList.querySelectorAll('.session-item').forEach(el => {
        el.addEventListener('click', () => loadSession(el.dataset.id));
    });
    sessionsList.querySelectorAll('.session-delete').forEach(btn => {
        btn.addEventListener('click', e => deleteSession(btn.dataset.id, e));
    });
}

newChatBtn.addEventListener('click', () => startNewChat(true));

// ── Search ────────────────────────────────────────────────────────────────────

searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    const wrap  = searchInput.closest('.search-wrap');
    wrap.classList.toggle('has-value', searchQuery.length > 0);
    renderSessionsList();
    highlightMessages(searchQuery);
});

searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchInput.closest('.search-wrap').classList.remove('has-value');
    renderSessionsList();
    highlightMessages('');
});

function highlightMessages(q) {
    document.querySelectorAll('.msg-bubble').forEach(el => {
        // restore original text
        const orig = el.dataset.original;
        if (!orig) return;
        if (!q) {
            el.innerHTML = orig;
        } else {
            el.innerHTML = orig.replace(
                new RegExp(`(${escReg(q)})`, 'gi'),
                '<mark>$1</mark>'
            );
        }
    });
}

// ── Export ────────────────────────────────────────────────────────────────────

exportBtn.addEventListener('click', () => {
    if (chatHistory.length === 0) {
        alert('Nothing to export yet — start a conversation first.');
        return;
    }

    const title = chatHistory.find(m => m.role === 'user')?.content.slice(0, 40) || 'Chat';
    const date  = new Date().toISOString().slice(0, 10);

    const md = `# ${title}\n_Exported ${date}_\n\n` +
        chatHistory.map(m =>
            `**${m.role === 'user' ? 'You' : 'Assistant'}**\n\n${m.content}`
        ).join('\n\n---\n\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `chat-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
});

// ── Model picker ──────────────────────────────────────────────────────────────

modelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modelDropdown.classList.toggle('open');
});

document.addEventListener('click', () => modelDropdown.classList.remove('open'));

modelDropdown.querySelectorAll('.model-option').forEach(btn => {
    btn.addEventListener('click', e => {
        e.stopPropagation();
        setModelMode(btn.dataset.mode);
        modelDropdown.classList.remove('open');
    });
});

function setModelMode(mode) {
    modelMode = mode;
    modelDropdown.querySelectorAll('.model-option').forEach(b =>
        b.classList.toggle('active', b.dataset.mode === mode)
    );

    const labels = { auto: 'Auto', claude: 'Claude Sonnet 4', groq: 'Groq Llama 3' };
    modelLabel.textContent = labels[mode];
    modelDot.className = 'model-dot ' + mode;
}

// ── Settings modal ────────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => modalBackdrop.classList.add('open'));
closeModal.addEventListener('click',  () => modalBackdrop.classList.remove('open'));
modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) modalBackdrop.classList.remove('open');
});

clearAllBtn.addEventListener('click', () => {
    if (!confirm('Delete all saved sessions? This cannot be undone.')) return;
    sessions = [];
    startNewChat(false);
    modalBackdrop.classList.remove('open');
});

// ── Input auto-resize ─────────────────────────────────────────────────────────

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + 'px';
});

messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

// ── Send ──────────────────────────────────────────────────────────────────────

const COMPLEX_KEYWORDS = [
    'explain','analyze','analyse','research','code','algorithm','mathematics',
    'physics','chemistry','biology','philosophy','debate','compare','contrast',
    'reasoning','proof','complex','detailed','comprehensive','debug','fix',
    'implement','design','architecture','write','summarize','summarise',
    'review','evaluate','refactor','generate'
];

function analyzeComplexity(msg) {
    const lower = msg.toLowerCase();
    return COMPLEX_KEYWORDS.some(k => lower.includes(k)) || msg.length > 100;
}

function resolveIsComplex(msg) {
    if (modelMode === 'claude') return true;
    if (modelMode === 'groq')   return false;
    return analyzeComplexity(msg);
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isSending) return;

    const historySent = [...chatHistory];
    renderMessage(text, 'user', true);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    setSending(true);

    const isComplex = resolveIsComplex(text);

    try {
        const res  = await fetch('/api/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: text, history: historySent, isComplex })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);

        lastUsedModel = isComplex ? 'claude' : 'groq';
        renderMessage(data.response, 'assistant', true);
        saveCurrentToSessions();
    } catch (err) {
        renderMessage(`**Error:** ${err.message}`, 'assistant', true);
    } finally {
        setSending(false);
    }
}

// ── Render message ────────────────────────────────────────────────────────────

function renderMessage(content, role, animate) {
    chatHistory.push({ role, content });

    // Remove welcome screen
    document.getElementById('welcome')?.remove();

    const row = document.createElement('div');
    row.className = `msg-row ${role}${animate ? '' : ''}`;

    const meta    = document.createElement('div');
    meta.className = 'msg-meta';

    if (role === 'assistant') {
        const dot = document.createElement('span');
        dot.className = `meta-dot ${lastUsedModel || ''}`;
        const name = document.createTextNode(
            lastUsedModel === 'claude' ? 'Claude Sonnet 4' :
            lastUsedModel === 'groq'   ? 'Groq Llama 3' : 'Assistant'
        );
        meta.appendChild(dot);
        meta.appendChild(name);
    } else {
        meta.textContent = 'You';
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    const rendered = renderMarkdownLite(content);
    bubble.innerHTML = rendered;
    bubble.dataset.original = rendered; // store for search highlight

    row.appendChild(meta);
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
}

// Lightweight markdown renderer
function renderMarkdownLite(text) {
    // Escape HTML first
    let out = escapeHtml(text);

    // Fenced code blocks
    out = out.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code>${code.trimEnd()}</code></pre>`
    );

    // Inline code
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Line breaks (outside pre blocks) — split by <pre> to avoid touching them
    const parts = out.split(/(<pre>[\s\S]*?<\/pre>)/g);
    out = parts.map((p, i) =>
        i % 2 === 1 ? p : p.replace(/\n/g, '<br>')
    ).join('');

    return out;
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function setSending(state) {
    isSending = state;
    sendBtn.disabled = state;
    messageInput.disabled = state;

    if (state) {
        const row = document.createElement('div');
        row.className = 'typing-row';
        row.id = 'typingRow';
        row.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
    } else {
        document.getElementById('typingRow')?.remove();
        messageInput.focus();
    }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escReg(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

setModelMode('auto');
renderSessionsList();
messageInput.focus();
console.log('Chatbot UI ready | Auto: complex → Claude Sonnet 4, simple → Groq Llama 3');
