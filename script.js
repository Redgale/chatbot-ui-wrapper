// Configuration
const API_CONFIG = {
    groq: {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        models: ['mixtral-8x7b-32768', 'llama2-70b-4096'],
        defaultModel: 'mixtral-8x7b-32768'
    },
    claude: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: ['claude-3-5-sonnet-20241022'],
        defaultModel: 'claude-3-5-sonnet-20241022'
    }
};

let chatHistory = [];
let currentModel = 'claude-3-5-sonnet-20241022';
let useClaude = true;

// DOM Elements
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const currentModelDisplay = document.getElementById('currentModel');
const newChatBtn = document.querySelector('.new-chat-btn');

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

newChatBtn.addEventListener('click', clearChat);

// Send Message Function
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Add user message to UI
    addMessageToUI(message, 'user');
    messageInput.value = '';
    
    // Determine which AI to use
    const isComplex = analyzeComplexity(message);
    useClaude = isComplex;
    updateModelDisplay();
    
    try {
        // Get AI response
        const response = await getAIResponse(message);
        addMessageToUI(response, 'assistant');
    } catch (error) {
        console.error('Error:', error);
        addMessageToUI('Sorry, an error occurred. Please try again.', 'assistant');
    }
}

// Analyze message complexity
function analyzeComplexity(message) {
    // Simple heuristic: longer messages or specific keywords indicate complexity
    const complexKeywords = [
        'explain', 'analyze', 'research', 'code', 'algorithm', 'mathematics',
        'physics', 'chemistry', 'biology', 'philosophy', 'debate', 'compare',
        'contrast', 'reasoning', 'proof', 'complex', 'detailed', 'comprehensive',
        'debug', 'fix', 'implement', 'design', 'architecture'
    ];
    
    const lowerMessage = message.toLowerCase();
    const hasComplexKeywords = complexKeywords.some(keyword => lowerMessage.includes(keyword));
    const isLong = message.length > 100;
    
    return hasComplexKeywords || isLong;
}

// Get response from appropriate AI
async function getAIResponse(message) {
    if (useClaude) {
        return getClaudeResponse(message);
    } else {
        return getGroqResponse(message);
    }
}

// Groq API Call (Fast responses)
async function getGroqResponse(message) {
    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
        return 'Please set your Groq API key in settings.';
    }

    try {
        const response = await fetch(API_CONFIG.groq.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: API_CONFIG.groq.defaultModel,
                messages: [
                    ...chatHistory,
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content;
        }
        return 'No response received';
    } catch (error) {
        console.error('Groq Error:', error);
        return 'Error calling Groq API';
    }
}

// Claude API Call (Complex responses)
async function getClaudeResponse(message) {
    const apiKey = localStorage.getItem('claude_api_key');
    if (!apiKey) {
        return 'Please set your Claude API key in settings.';
    }

    try {
        const response = await fetch(API_CONFIG.claude.endpoint, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: API_CONFIG.claude.defaultModel,
                max_tokens: 2048,
                messages: [
                    ...chatHistory,
                    { role: 'user', content: message }
                ]
            })
        });

        const data = await response.json();
        
        if (data.content && data.content[0]) {
            return data.content[0].text;
        }
        return 'No response received';
    } catch (error) {
        console.error('Claude Error:', error);
        return 'Error calling Claude API';
    }
}

// Add message to UI
function addMessageToUI(content, role) {
    // Add to history
    chatHistory.push({ role, content });
    
    // Remove welcome section if it's the first message
    if (chatHistory.length === 2) {
        const welcome = document.querySelector('.welcome-section');
        if (welcome) welcome.remove();
    }
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update model display
function updateModelDisplay() {
    currentModel = useClaude ? 'Claude 3.5 Sonnet' : 'Groq (Mixtral)';
    currentModelDisplay.textContent = currentModel;
}

// Clear chat
function clearChat() {
    chatHistory = [];
    chatMessages.innerHTML = `
        <div class="welcome-section">
            <div class="welcome-icon">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M50 20C33.4 20 20 33.4 20 50S33.4 80 50 80S80 66.6 80 50S66.6 20 50 20M30 55L45 65L70 35" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1 class="welcome-title">Chatbot UI</h1>
        </div>
    `;
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Settings functionality
document.querySelector('.settings-btn')?.addEventListener('click', openSettings);

function openSettings() {
    const claudeKey = prompt('Enter your Claude API key (from console.anthropic.com):');
    if (claudeKey) {
        localStorage.setItem('claude_api_key', claudeKey);
    }
    
    const groqKey = prompt('Enter your Groq API key (from console.groq.com):');
    if (groqKey) {
        localStorage.setItem('groq_api_key', groqKey);
    }
}

// Initialize
console.log('Chatbot UI loaded. Routing: Complex → Claude 3.5 Sonnet | Fast → Groq');
updateModelDisplay();
