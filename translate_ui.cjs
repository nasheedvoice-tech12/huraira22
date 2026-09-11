const fs = require('fs');
const path = require('path');

const translationKeys = {
    'POS Terminal': 'pos_mode',
    'Business Workspace': 'business_mode',
    'Quick Sale': 'quick_sale',
    'Current Cart': 'cart',
    'Subtotal': 'subtotal',
    'Discount': 'discount',
    'Tax': 'tax',
    'Grand Total': 'grand_total',
    'Charge / Complete Sale': 'pay_now',
    'Hold Sale': 'hold_cart',
    'Held Orders': 'held_orders',
    'Clear': 'clear_cart',
    'Split Payment': 'split_payment',
    'Cash': 'cash',
    'Card': 'card',
    'Bank Transfer': 'bank',
    'Mobile Wallet': 'wallet',
    'Store Credit': 'store_credit',
    'Customer': 'customer',
    'Walk-in Customer': 'walk_in',
    'Loyalty Points': 'loyalty_points',
    'Redeem': 'redeem',
    'Products & Catalog': 'products',
    'Inventory & Warehouses': 'inventory',
    'Sales & Invoices': 'sales',
    'Purchases & Suppliers': 'purchases',
    'Financial Management': 'finance',
    'Reports & Intelligence': 'reports',
    'Velcora Business Brain': 'business_brain',
    'Ask Velcora AI': 'ask_ai',
    'Multi-Model AI Router': 'ai_router',
    'Velcora Creative Studio': 'studio',
    'Online Store Beta': 'online_store',
    'Platform Settings': 'settings',
    'Health Score': 'health_score',
    'Low Stock Alert': 'low_stock_warning',
    'Switch Business': 'switch_business',
    'Build / Configure POS': 'build_pos',
    'Daily Briefing': 'daily_briefing'
};

const componentsDir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Add tStr to useVelcora destructuring if not present
  if (content.includes('useVelcora()') && !content.includes('tStr')) {
    content = content.replace(/const {([^}]+)} = useVelcora\(\);/g, (match, p1) => {
        if (!p1.includes('tStr')) {
            return `const {${p1}, tStr} = useVelcora();`;
        }
        return match;
    });
  }

  // Very naive replace for text inside tags or quotes
  for (const [english, key] of Object.entries(translationKeys)) {
    // Replace inside JSX elements: >English< to >{tStr('key')}<
    const jsxRegex = new RegExp(`>\\s*${english}\\s*<`, 'g');
    content = content.replace(jsxRegex, `>{tStr('${key}')}<`);
    
    // Replace exact string literals that are likely labels
    const strRegex = new RegExp(`['"]${english}['"]`, 'g');
    content = content.replace(strRegex, `tStr('${key}')`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated translations in ${file}`);
  }
}
