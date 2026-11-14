import express from 'express';
import cors from 'cors';
import { store } from './persistence/store';
import { initializeStoreIfEmpty } from './seed/seedData';
import { ValidationService } from './services/validationService';
import { RoutingService } from './services/routingService';
import { ContextService } from './services/contextService';
import { createRouter } from './api/routes';

// Initialize persistent store if empty
initializeStoreIfEmpty(store);

const validationService = new ValidationService(store);
const routingService = new RoutingService(store);
const contextService = new ContextService(store);

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', createRouter(store, validationService, routingService, contextService));

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Sampark] Control plane running on http://localhost:${PORT}`);
    console.log(`[Sampark] Connected to file-backed persistence at ./data`);
  });
}

export default app;
export { store, validationService, routingService, contextService };
