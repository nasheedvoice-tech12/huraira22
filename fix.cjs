const fs = require('fs');
let content = fs.readFileSync('src/components/HelpSupportView.tsx', 'utf8');
content = content.replace(/a:\s*`Open "Payments" or "\$\{tStr\('sales'\)\}", locate` the invoice number, click "Details", and select "Refund Transaction"\. The inventory stock count will automatically update\.',/, 'a: `Open "Payments" or "${tStr(\'sales\')}", locate the invoice number, click "Details", and select "Refund Transaction". The inventory stock count will automatically update.`,');
fs.writeFileSync('src/components/HelpSupportView.tsx', content);
