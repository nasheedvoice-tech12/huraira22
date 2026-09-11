import { ReasoningContext, IngestPayload, StoreMemoryPayload } from '../../types';
import { reasoningEngine } from '../../services/reasoning/reasoningEngine';
import { memoryService } from '../../services/memory/memoryService';
import { ingestionService } from '../../services/ingestion/ingestionService';
import { wikiService } from '../../services/indexing/wikiService';
import { healthLintService } from '../../services/lint/healthLintService';

export class VelcoraAdapter {
  public getContextForQuery(query: string, tenantId: string, userId?: string | null): ReasoningContext {
    return reasoningEngine.buildContext({
      query,
      tenantId: tenantId || 'velcora-default-store',
      userId,
      limit: 8,
    });
  }

  public storeMemory(payload: StoreMemoryPayload) {
    return memoryService.store(payload);
  }

  public ingestDocument(payload: IngestPayload) {
    return ingestionService.ingest(payload);
  }

  public getEntity(slugOrId: string, tenantId: string) {
    return wikiService.getBySlugOrId(slugOrId, tenantId || 'velcora-default-store');
  }

  public getHealthReport(tenantId?: string) {
    return healthLintService.runLint(tenantId);
  }
}

export const velcoraAdapter = new VelcoraAdapter();
