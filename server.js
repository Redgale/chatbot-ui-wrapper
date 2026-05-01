// Node.js server — proxies requests to Claude & Groq (keeps API keys off the browser)
// Requires Node 18+ (uses built-in fetch — no node-fetch needed)
// Setup: npm install express cors dotenv
// Run:   node server.js

const express = require('express');
const cors    = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// ─── CORS — allow any origin ──────────────────────────────────────────────────
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // pre-flight for all routes

// Raise body limit to 50 mb to handle base64-encoded image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// ─── Main chat route ─────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [], isComplex, files = [] } = req.body;

        const response = isComplex
            ? await callNemotron(message, history, files)
            : await callGroq(message, history);

        res.json({ response, model: isComplex ? 'Nemotron (OpenRouter)' : 'Groq (Llama 3)' });
    } catch (error) {
        console.error('API error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── OpenRouter / NVIDIA Nemotron API ────────────────────────────────────────

async function callNemotron(message, history, files = []) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set in .env');

    // Build the user content — plain text or multimodal array if files attached
    let userContent;
    if (files.length > 0) {
        userContent = [];
        // Add each file as an image_url block (works for images & PDFs via OpenRouter)
        for (const f of files) {
            if (f.type.startsWith('image/')) {
                userContent.push({
                    type: 'image_url',
                    image_url: { url: `data:${f.type};base64,${f.base64}` }
                });
            } else if (f.type === 'application/pdf') {
                // OpenRouter supports PDF as base64 image_url with pdf mime type
                userContent.push({
                    type: 'image_url',
                    image_url: { url: `data:application/pdf;base64,${f.base64}` }
                });
            }
        }
        if (message) {
            userContent.push({ type: 'text', text: message });
        }
    } else {
        userContent = message;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
            messages: [...history, { role: 'user', content: userContent }],
            max_tokens: 2048
        })
    });

    const rawText = await response.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch { throw new Error(`Nemotron returned non-JSON (status ${response.status}): ${rawText.slice(0, 200)}`); }
    if (data.error) throw new Error(`Nemotron: ${data.error.message}`);
    if (!data.choices?.[0]?.message?.content) throw new Error('Unexpected Nemotron response shape');
    return data.choices[0].message.content;
}

// ─── Groq API ────────────────────────────────────────────────────────────────

async function callGroq(message, history) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set in .env');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [...history, { role: 'user', content: message }],
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    const rawText = await response.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch { throw new Error(`Groq returned non-JSON (status ${response.status}): ${rawText.slice(0, 200)}`); }
    if (data.error) throw new Error(`Groq: ${data.error.message}`);
    if (!data.choices?.[0]?.message?.content) throw new Error('Unexpected Groq response shape');
    return data.choices[0].message.content;
}

// ─── Payload error handler (catches Express body-parser rejections) ───────────
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Payload too large — try a smaller image or PDF.' });
    }
    console.error('Unhandled middleware error:', err.message);
    res.status(500).json({ error: err.message });
});

// ─── Fallback ─────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log('   Complex queries  →  Nemotron (OpenRouter)');
    console.log('   Simple queries   →  Groq (Llama 3)\n');
});
