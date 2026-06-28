import express from 'express';
import cors    from 'cors';
import { PORT, CORS_ORIGIN, MOCK, ENV_KEYS } from './config.js';
import healthRouter   from './routes/health.js';
import completeRouter from './routes/complete.js';
import extractRouter  from './routes/extract.js';
import flagsRouter    from './routes/flags.js';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

app.use(healthRouter);
app.use(flagsRouter);
app.use(completeRouter);
app.use(extractRouter);

app.listen(PORT, () => {
  const configured = ['claude', 'openai', 'gemini'].filter(p => ENV_KEYS[p]).join(', ') || 'none';
  console.log(`AI Form Assistant proxy running on http://localhost:${PORT} ${MOCK ? '[MOCK MODE] ' : ''}— env keys: ${configured}`);
});
