// Optional Node.js server for production use
// Install: npm install express cors dotenv
// Run: node server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API Routes
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, isComplex } = req.body;
        
        // Determine which API to call
        if (isComplex) {
            const response = await callGemini(message, history);
            res.json({ response });
        } else {
            const response = await callGroq(message, history);
            res.json({ response });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gemini API Call
async function callGemini(message, history) {
    const fetch = (await import('node-fetch')).default;
    const apiKey = process.env.GEMINI_API_KEY;
    
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    ...history,
                    {
                        role: 'user',
                        parts: [{ text: message }]
                    }
                ]
            })
        }
    );
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Groq API Call
async function callGroq(message, history) {
    const fetch = (await import('node-fetch')).default;
    const apiKey = process.env.GROQ_API_KEY;
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
                ...history,
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1024
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Routing: Complex queries → Gemini 2.5 Pro');
    console.log('Routing: Simple queries → Groq (Fast)');
});
