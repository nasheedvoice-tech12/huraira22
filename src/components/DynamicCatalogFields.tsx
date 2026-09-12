import React from 'react';
import { CatalogSchema, CatalogField, CatalogFieldScope } from '../types';
import { dynamicFieldsForScope } from '../lib/catalogSchema';
import { Sparkles, ShieldAlert } from 'lucide-react';

interface Props {
  schema: CatalogSchema;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  scope?: CatalogFieldScope;
  title?: string;
}

const inputCls =
  'w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#1F2E4D] text-slate-900 dark:text-[#F8FAFC] focus:border-primary focus:outline-hidden';

/**
 * Renders the AI-generated, business-specific fields for a given scope.
 * Nothing here is hardcoded per industry — the schema drives everything.
 */
export const DynamicCatalogFields: React.FC<Props> = ({ schema, values, onChange, scope = 'item', title }) => {
  const fields = dynamicFieldsForScope(schema, scope);
  if (fields.length === 0) return null;

  const renderField = (f: CatalogField) => {
    const value = values[f.key];
    const label = (
      <label className="block font-bold text-slate-600 dark:text-[#94A3B8] mb-1">
        {f.label}
        {f.required ? ' *' : ''}
        {f.unit ? <span className="text-slate-400 dark:text-[#64748B] font-medium"> ({f.unit})</span> : null}
        {f.safetyCritical ? (
          <span
            className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400"
            title="Specialised information — verify with a qualified professional. Velcora never invents these values."
          >
            <ShieldAlert className="w-3 h-3" /> VERIFY
          </span>
        ) : null}
      </label>
    );
    const help = f.help ? <p className="mt-1 text-[10px] text-slate-400 dark:text-[#64748B]">{f.help}</p> : null;

    switch (f.type) {
      case 'textarea':
        return (
          <div key={f.key} className="sm:col-span-2">
            {label}
            <textarea
              rows={2}
              value={value ?? ''}
              required={f.required}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder={f.examples?.[0] || f.help || ''}
              className={inputCls}
            />
            {help}
          </div>
        );
      case 'boolean':
        return (
          <div key={f.key} className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(f.key, e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="font-bold text-slate-600 dark:text-[#94A3B8]">{f.label}</span>
            {help}
          </div>
        );
      case 'select':
        return (
          <div key={f.key}>
            {label}
            <select
              value={value ?? ''}
              required={f.required}
              onChange={(e) => onChange(f.key, e.target.value)}
              className={inputCls}
            >
              <option value="">Select…</option>
              {(f.options || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {help}
          </div>
        );
      case 'multiselect':
        return (
          <div key={f.key} className="sm:col-span-2">
            {label}
            <div className="flex flex-wrap gap-1.5">
              {(f.options || []).map((o) => {
                const arr: string[] = Array.isArray(value) ? value : [];
                const on = arr.includes(o);
                return (
                  <button
                    type="button"
                    key={o}
                    onClick={() => onChange(f.key, on ? arr.filter((x) => x !== o) : [...arr, o])}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      on
                        ? 'bg-primary text-white border-transparent'
                        : 'bg-white dark:bg-[#111C30] border-slate-200 dark:border-[#1F2E4D] text-slate-600 dark:text-[#94A3B8]'
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {help}
          </div>
        );
      default: {
        const htmlType =
          f.type === 'number' || f.type === 'currency' || f.type === 'weight'
            ? 'number'
            : f.type === 'date'
              ? 'date'
              : 'text';
        return (
          <div key={f.key}>
            {label}
            <input
              type={htmlType}
              step={f.type === 'weight' ? '0.001' : 'any'}
              value={value ?? ''}
              required={f.required}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder={f.examples?.[0] || f.help || ''}
              className={inputCls}
            />
            {help}
          </div>
        );
      }
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-[#1F2E4D] bg-slate-50/60 dark:bg-[#0B1220]/60 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="font-black text-[10px] uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">
          {title || `${schema.itemLabelSingular} details`}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{fields.map(renderField)}</div>
    </div>
  );
};

export default DynamicCatalogFields;
