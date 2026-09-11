const fs = require('fs');
let content = fs.readFileSync('src/server/creditManager.ts', 'utf8');

// The line is: const deduction = creditAmount;
// Replace all occurrences with conditional logic
content = content.replace(/const deduction = creditAmount;/g, 'const deduction = (record.purchaseState === "completed" || record.purchaseState === "restored") ? creditAmount : 0;');

fs.writeFileSync('src/server/creditManager.ts', content);
