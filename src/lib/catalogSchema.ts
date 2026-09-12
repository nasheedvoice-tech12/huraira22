import {
  BusinessProfile,
  CatalogSchema,
  CatalogField,
  CatalogCapabilities,
  CatalogCoreBinding,
  CatalogFieldScope,
} from '../types';

export const NEUTRAL_CAPABILITIES: CatalogCapabilities = {
  barcodes: false,
  sku: false,
  stock: false,
  variants: false,
  batchTracking: false,
  serialTracking: false,
  expiry: false,
  weightBased: false,
  appointments: false,
  suppliers: false,
  loyalty: false,
  onlineStore: false,
};

/**
 * Assumption-free catalog used only when a business has no AI-generated schema.
 * It deliberately enables NO retail capability.
 */
export const NEUTRAL_CATALOG_SCHEMA: CatalogSchema = {
  version: 1,
  businessType: 'General Business',
  summary: 'A minimal, industry-neutral catalog. Generate a tailored catalog from your business description.',
  itemLabelSingular: 'Item',
  itemLabelPlural: 'Items',
  sellingModel: 'custom',
  units: ['Unit'],
  categories: ['General'],
  fields: [
    { key: 'name', label: 'Name', type: 'text', scope: 'item', required: true, core: 'name' },
    { key: 'category', label: 'Category / Group', type: 'text', scope: 'item', required: false, core: 'category' },
    {
      key: 'selling_price',
      label: 'Selling Price',
      type: 'currency',
      scope: 'item',
      required: true,
      core: 'sellingPrice',
    },
    { key: 'description', label: 'Description', type: 'textarea', scope: 'item', required: false, core: 'description' },
  ],
  capabilities: { ...NEUTRAL_CAPABILITIES },
  workflows: ['pos'],
  confidence: 0.3,
  source: 'fallback',
};

export function getActiveCatalogSchema(business?: BusinessProfile | null): CatalogSchema {
  const s = business?.catalogSchema;
  if (s && Array.isArray(s.fields) && s.fields.length > 0) {
    return { ...s, capabilities: { ...NEUTRAL_CAPABILITIES, ...(s.capabilities || {}) } };
  }
  return NEUTRAL_CATALOG_SCHEMA;
}

export function hasAiCatalog(business?: BusinessProfile | null): boolean {
  return Boolean(business?.catalogSchema && Array.isArray(business.catalogSchema.fields));
}

export function fieldsForScope(schema: CatalogSchema, scope: CatalogFieldScope): CatalogField[] {
  return (schema.fields || []).filter((f) => f.scope === scope);
}

/** Fields that are NOT bound to a core POS column (i.e. free-form dynamic fields). */
export function dynamicFieldsForScope(schema: CatalogSchema, scope: CatalogFieldScope): CatalogField[] {
  return fieldsForScope(schema, scope).filter((f) => !f.core);
}

export function boundField(
  schema: CatalogSchema,
  core: CatalogCoreBinding,
  scope: CatalogFieldScope = 'item'
): CatalogField | undefined {
  return (schema.fields || []).find((f) => f.core === core && f.scope === scope);
}

/** Whether a core POS column should be shown for this business. */
export function isCoreFieldVisible(schema: CatalogSchema, core: CatalogCoreBinding): boolean {
  const c = schema.capabilities || NEUTRAL_CAPABILITIES;
  switch (core) {
    case 'barcode':
      return !!c.barcodes;
    case 'sku':
      return !!c.sku;
    case 'stock':
    case 'minStock':
      return !!c.stock;
    default:
      return true;
  }
}

/** Human label for a core column, using the AI schema when it named it. */
export function coreLabel(schema: CatalogSchema, core: CatalogCoreBinding, fallback: string): string {
  return boundField(schema, core)?.label || fallback;
}

export function emptyCatalogValues(schema: CatalogSchema, scope: CatalogFieldScope = 'item'): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fieldsForScope(schema, scope)) {
    if (f.type === 'boolean') out[f.key] = false;
    else if (f.type === 'multiselect') out[f.key] = [];
    else out[f.key] = '';
  }
  return out;
}
