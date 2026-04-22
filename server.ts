import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { PDFParse } from 'pdf-parse';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log('Starting server initialization...');

  app.use(express.json());

  // Health check for platform readiness
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Routes
  const upload = multer({ storage: multer.memoryStorage() });
  app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
    try {
      console.log('Received resume for parsing...');
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      await parser.destroy();
      
      console.log('PDF parsed successfully');
      res.json({ text: result.text });
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
