import express from 'express';
import cors    from 'cors';
import { PORT, CORS_ORIGIN, MOCK, ENV_KEYS } from './config.js';
import healthRouter   from './routes/health.js';
import completeRouter from './routes/complete.js';
import extractRouter  from './routes/extract.js';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use(healthRouter);
app.use(completeRouter);
app.use(extractRouter);

app.listen(PORT, () => {
  const configured = ['claude', 'openai', 'gemini'].filter(p => ENV_KEYS[p]).join(', ') || 'none';
  console.log(`AI Form Assistant proxy running on http://localhost:${PORT} ${MOCK ? '[MOCK MODE] ' : ''}— env keys: ${configured}`);
});
