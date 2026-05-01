# Chatbot UI - Gemini & Groq Wrapper

A modern chatbot interface that intelligently routes queries between Gemini 2.5 Pro and Groq APIs based on message complexity.

## Features

- **Smart Routing**: Automatically selects the best AI model based on query complexity
  - **Gemini 2.5 Pro** for complex, in-depth questions
  - **Groq** for fast, simple responses

- **Modern UI**: Beautiful dark-themed interface matching ChatGPT/Claude styling
- **Chat History**: Maintains conversation context across messages
- **API Key Management**: Secure storage of API credentials (localStorage)
- **Responsive Design**: Works on desktop and mobile devices

## Setup

### Prerequisites

- Gemini API Key (get from [Google AI Studio](https://aistudio.google.com))
- Groq API Key (get from [Groq Console](https://console.groq.com))

### Installation

1. Clone this repository
2. Open `index.html` in your browser
3. Click "Quick Settings" and enter your API keys when prompted

## Configuration

Edit `script.js` to customize:

```javascript
// API endpoints and models
const API_CONFIG = {
    groq: {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        defaultModel: 'mixtral-8x7b-32768'
    },
    gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent',
        defaultModel: 'gemini-2.5-pro'
    }
};
```

## Complexity Analysis

Messages are analyzed using:

- **Keywords**: analyze, explain, code, algorithm, reasoning, etc.
- **Length**: Messages longer than 100 characters
- **Pattern**: Complex queries trigger Gemini, simple ones use Groq

## API Documentation

### Gemini 2.5 Pro
- Best for: Detailed analysis, coding help, complex reasoning
- Speed: Slower but more thorough
- Cost: Pay per request

### Groq (Mixtral 8x7B)
- Best for: Quick responses, simple questions
- Speed: Very fast (optimized for speed)
- Cost: Higher throughput limits

## File Structure

```
├── index.html      # Main HTML structure
├── styles.css      # Dark theme styling
├── script.js       # API routing and chat logic
└── README.md       # Documentation
```

## Deployment

This is a static site and can be deployed to:

- **GitHub Pages**: Push to repo, enable in settings
- **Netlify**: Connect repo and auto-deploy
- **Vercel**: Similar to Netlify
- **Any static hosting**: Upload the three files

## Security Notes

⚠️ **Important**: API keys stored in localStorage are visible to JavaScript. For production:

1. Use a backend server to proxy API calls
2. Store keys in environment variables
3. Implement authentication
4. Use HTTPS only

## Future Enhancements

- [ ] Backend proxy for secure API key handling
- [ ] User accounts and chat persistence
- [ ] Conversation export (JSON, PDF, Markdown)
- [ ] Custom system prompts
- [ ] Model comparison mode
- [ ] Token usage analytics
- [ ] Dark/Light theme toggle
- [ ] Markdown rendering for responses

## License

MIT
