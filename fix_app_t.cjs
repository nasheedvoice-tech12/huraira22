const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import if missing
if (!content.includes('useTranslation')) {
  content = content.replace("import { TranslationProvider } from './context/TranslationContext';", "import { TranslationProvider, useTranslation } from './context/TranslationContext';");
  
  content = content.replace("} = useVelcora();", "} = useVelcora();\n  const { t, locale, setLocale } = useTranslation();\n\n  // Sync language from cloud business profile on login\n  useEffect(() => {\n    if (activeBusiness?.language && activeBusiness.language !== locale) {\n      setLocale(activeBusiness.language as any);\n    }\n  }, [activeBusiness?.language]);\n");
  
  // also let's use t for some labels!
  content = content.replace("label: 'Dashboard'", "label: t('business_brain')");
  content = content.replace("label: 'POS Register'", "label: t('pos_mode')");
  content = content.replace("label: 'Product Catalog'", "label: t('products')");
  content = content.replace("label: 'Inventory & Stock'", "label: t('inventory')");
  content = content.replace("label: 'Sales & Invoices'", "label: t('sales')");
  content = content.replace("label: 'Purchases & POs'", "label: t('purchases')");
  content = content.replace("label: 'Customers & Loyalty'", "label: t('customer')");
  
  fs.writeFileSync('src/App.tsx', content);
}
