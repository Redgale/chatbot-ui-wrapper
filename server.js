// Node.js server — proxies requests to Claude & Groq (keeps API keys off the browser)
// Setup: npm install express cors dotenv
// Run:   node server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── Main chat route ────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [], isComplex } = req.body;

        const response = isComplex
            ? await callClaude(message, history)
            : await callGroq(message, history);

        res.json({ response, model: isComplex ? 'Claude Sonnet 4' : 'Groq (Llama 3)' });
    } catch (error) {
        console.error('API error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Claude API ─────────────────────────────────────────────────────────────

async function callClaude(message, history) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in .env');

    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [
                ...history,
                { role: 'user', content: message }
            ]
        })
    });

    const data = await response.json();

    if (data.error) throw new Error(`Claude: ${data.error.message}`);
    if (!data.content?.[0]?.text) throw new Error('Unexpected Claude response shape');

    return data.content[0].text;
}

// ─── Groq API ────────────────────────────────────────────────────────────────

async function callGroq(message, history) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set in .env');

    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                ...history,
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    const data = await response.json();

    if (data.error) throw new Error(`Groq: ${data.error.message}`);
    if (!data.choices?.[0]?.message?.content) throw new Error('Unexpected Groq response shape');

    return data.choices[0].message.content;
}

// ─── Static fallback ─────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log('   Complex queries  →  Claude Sonnet 4');
    console.log('   Simple queries   →  Groq (Llama 3)\n');
});
