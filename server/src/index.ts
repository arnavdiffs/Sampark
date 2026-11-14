import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sampark-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: 'local-prototype',
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Sampark] Control plane running on http://localhost:${PORT}`);
  });
}

export default app;
