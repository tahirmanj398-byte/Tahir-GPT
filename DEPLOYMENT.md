# Tahir GPT Pro - Deployment & Failover Guide

Congratulations on deploying **Tahir GPT Pro**! This guide will help you ensure your application runs perfectly with automatic failover and high availability.

## 1. Automatic Failover & Circuit Breaker (The "Perfect" Setup)

**Tahir GPT Pro** uses a sophisticated "Circuit Breaker" failover system. If one API fails or hits a limit, the system automatically skips it and moves to the next one instantly.

### Required Tokens (In Order of Priority):

1.  **Gemini API Keys**: 
    *   `GEMINI_API_KEY` (Primary)
    *   `GEMINI_API_KEY_1` to `GEMINI_API_KEY_5` (Backups)
    *   *System will rotate these keys if one hits a quota.*
2.  **OpenRouter API Key**:
    *   `OPENROUTER_API_KEY` (Highly recommended as the first fallback).
3.  **OpenAI API Key**:
    *   `OPENAI_API_KEY` (GPT-3.5/4 backup).
4.  **Anthropic API Key**:
    *   `ANTHROPIC_API_KEY` (Claude 3 backup).
5.  **Groq API Key**:
    *   `GROQ_API_KEY` (Ultra-fast Llama 3 backup).
6.  **Cohere API Key**:
    *   `COHERE_API_KEY` (Final fallback).
7.  **Vercel Token**:
    *   `VERCEL_TOKEN` (For live website deployment).

### How Failover Works:
- **Fast Timeout**: Primary keys have a 4-second timeout. If no response, it switches.
- **Circuit Breaker**: If an API fails 2 times, it is "blocked" for 5 minutes to prevent delays in future requests.
- **Zero Delay**: By skipping known "bad" keys, the app ensures the fastest possible response.

## 2. Deployment Steps

### Vercel (Recommended)
1. Push your code to a GitHub repository.
2. Connect the repository to [Vercel](https://vercel.com).
3. Add all the API keys from `.env.example` to the **Environment Variables** section in Vercel project settings.
4. Deploy!

### Manual Deployment (VPS/Docker)
1. Ensure Node.js 20+ is installed.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `npm start`.
5. Use a process manager like `pm2` to keep the server running.

## 3. After-Deployment Maintenance

### Monitoring
- Check the server logs for "Attempting [Provider]..." messages. This tells you if the failover system is working.
- If you see "All AI providers failed", it means you need to update your API keys.

### Storage Optimization
- The app uses a hybrid storage system (LocalDB + Memory). It automatically clears old chats if the browser storage gets full, so users never see "Storage Full" errors.

### Security
- All AI calls are proxied through the backend. Your API keys are **NEVER** exposed to the user's browser.
- Ensure `NODE_ENV` is set to `production` to enable compression and security headers.

---
*Created with ❤️ by Tahir GPT Pro*
