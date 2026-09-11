import express, { Request, Response, Router } from 'express';
import { ingestionService } from '../services/ingestion/ingestionService';
import { memoryService } from '../services/memory/memoryService';
import { wikiService } from '../services/indexing/wikiService';
import { retrievalService } from '../services/retrieval/retrievalService';
import { reasoningEngine } from '../services/reasoning/reasoningEngine';
import { relationshipGraphService } from '../services/relationships/relationshipGraph';
import { healthLintService } from '../services/lint/healthLintService';
import { synthesisService } from '../services/synthesis/synthesisService';
import { learningService } from '../services/learning/learningService';
import { contradictionService } from '../services/contradiction/contradictionService';

// Express Router that encapsulates the Second Brain API
export function createSecondBrainRouter(): Router {
  const router = express.Router();
  router.use(express.json());

  // Middleware to extract tenant and user identity from headers or body
  const getAuthContext = (req: Request) => {
    const tenantId =
      (req.headers['x-tenant-id'] as string) ||
      (req.query.tenantId as string) ||
      (req.body?.tenantId as string) ||
      'velcora-default-store';
    const userId =
      (req.headers['x-user-id'] as string) ||
      (req.query.userId as string) ||
      (req.body?.userId as string) ||
      null;
    return { tenantId, userId };
  };

  // GET /health
  router.get('/health', (req: Request, res: Response) => {
    const { tenantId } = getAuthContext(req);
    const lint = healthLintService.runLint(tenantId);
    res.json({
      status: 'healthy',
      service: 'Velcora Second Brain',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      stats: {
        memoriesCount: memoryService.count(tenantId),
        wikiDocsCount: wikiService.count(tenantId),
        relationshipsCount: relationshipGraphService.count(tenantId),
        contradictionsCount: contradictionService.count(tenantId),
      },
      healthReport: lint,
    });
  });

  // POST /memory/ingest
  router.post('/memory/ingest', async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const payload = {
        ...req.body,
        tenantId,
        userId: req.body.userId || userId,
      };
      const result = await ingestionService.ingest(payload);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /memory/store
  router.post('/memory/store', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const payload = {
        ...req.body,
        content: req.body.content || req.body.text || '',
        tenantId,
        userId: req.body.userId || userId,
      };
      const memory = memoryService.store(payload);
      res.json({ success: true, memory });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /memory/update
  router.post('/memory/update', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const payload = {
        ...req.body,
        content: req.body.content || req.body.text || undefined,
        tenantId,
        userId: req.body.userId || userId,
      };
      const memory = memoryService.update(payload);
      res.json({ success: true, memory });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /memory/query
  router.post('/memory/query', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const options = {
        ...req.body,
        tenantId,
        userId: req.body.userId || userId,
      };
      const memories = memoryService.query(options);
      res.json({ success: true, count: memories.length, memories });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // DELETE /memory/:id
  router.delete('/memory/:id', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const deleted = memoryService.delete(req.params.id, tenantId, userId);
      res.json({ success: deleted, id: req.params.id });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /memory/user/clear or DELETE /memory/user/clear
  router.post('/memory/user/clear', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const targetUserId = req.body.userId || userId;
      const result = memoryService.clearUserMemories(tenantId, targetUserId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.delete('/memory/user/clear', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const targetUserId = (req.query.userId as string) || userId;
      const result = memoryService.clearUserMemories(tenantId, targetUserId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // GET /memory/search
  router.get('/memory/search', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const query = (req.query.q as string) || (req.query.query as string) || '';
      const limit = parseInt(req.query.limit as string, 10) || 15;
      const result = retrievalService.search(query, tenantId, userId, limit);
      res.json({ success: true, query, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // GET /memory/context
  router.get('/memory/context', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const query = (req.query.q as string) || (req.query.query as string) || '';
      const limit = parseInt(req.query.limit as string, 10) || 8;
      const context = reasoningEngine.buildContext({
        query,
        tenantId,
        userId,
        limit,
      });
      res.json({ success: true, query, context });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // GET /memory/entity/:id
  router.get('/memory/entity/:id', (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const doc = wikiService.getBySlugOrId(req.params.id, tenantId);
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Entity not found' });
      }
      res.json({ success: true, entity: doc });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // GET /memory/topic/:id
  router.get('/memory/topic/:id', (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const doc = wikiService.getBySlugOrId(req.params.id, tenantId);
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Topic not found' });
      }
      res.json({ success: true, topic: doc });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /memory/relationships
  router.post('/memory/relationships', (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { sourceId, sourceType, targetId, targetType, relationshipType, strength, confidence, metadata } = req.body;
      const rel = relationshipGraphService.addRelationship(
        tenantId,
        sourceId,
        sourceType || 'node',
        targetId,
        targetType || 'node',
        relationshipType || 'relates_to',
        strength,
        confidence,
        metadata
      );
      res.json({ success: true, relationship: rel });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // GET /memory/relationships/:id
  router.get('/memory/relationships/:id', (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const relationships = relationshipGraphService.getForNode(req.params.id, tenantId);
      res.json({ success: true, nodeId: req.params.id, count: relationships.length, relationships });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /memory/lint
  router.post('/memory/lint', (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const report = healthLintService.runLint(tenantId);
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /memory/synthesize
  router.post('/memory/synthesize', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const { topic } = req.body;
      if (!topic) return res.status(400).json({ success: false, error: 'Topic required' });
      const synthesis = synthesisService.synthesizeTopic(tenantId, topic, userId);
      res.json({ success: true, synthesis });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /memory/learn
  router.post('/memory/learn', (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = getAuthContext(req);
      const { text, speakerRole, topicOrModule, businessContext } = req.body;
      const result = learningService.evaluateAndLearn({
        tenantId,
        userId,
        text,
        speakerRole: speakerRole || 'user',
        topicOrModule,
        businessContext,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
}

// Standalone Server function if executed directly
export function startStandaloneServer(port: number = 3001) {
  const app = express();
  app.use(createSecondBrainRouter());
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Velcora Second Brain] Standalone Server running on http://0.0.0.0:${port}`);
  });
}
