import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log('Starting server initialization...');

  app.use(express.json());

  // Health check for platform readiness
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
      port: PORT,
      hasKey: !!process.env.GEMINI_API_KEY
    });
  });

  app.get('/api/debug-server', (req, res) => {
    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cwd: process.cwd(),
      dirname: __dirname,
      nodeVersion: process.version
    });
  });

  // API Routes
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
      console.log('Received resume for parsing...');
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const data = await pdf(req.file.buffer);
      console.log('PDF parsed successfully');
      res.json({ text: data.text });
    } catch (error) {
      console.error('PDF parsing error:', error);
      res.status(500).json({ 
        error: 'Failed to parse PDF',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    console.log('Configuring Vite middleware...');
    try {
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          host: '0.0.0.0',
          port: PORT,
          hmr: false // Previews are more stable without HMR
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware ready');
    } catch (viteError) {
      console.error('Failed to start Vite server:', viteError);
    }
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('CRITICAL: Server startup failed:', err);
  process.exit(1);
});
