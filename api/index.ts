import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

dotenv.config();

const app = express();
app.use(express.json());

// Lazy initialization of Gemini
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured on the server');
    }
    aiInstance = new GoogleGenAI(key);
  }
  return aiInstance;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
    hasKey: !!process.env.GEMINI_API_KEY
  });
});

app.post('/api/ai', async (req, res) => {
  try {
    const { prompt, model = "gemini-1.5-flash" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const client = getAI();
    const aiModel = client.getGenerativeModel({ model });
    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({ text });
  } catch (error) {
    console.error('AI Generation error:', error);
    res.status(500).json({ 
      error: 'AI generation failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const data = await pdf(req.file.buffer);
    res.json({ text: data.text });
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ 
      error: 'Failed to parse PDF',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default app;
