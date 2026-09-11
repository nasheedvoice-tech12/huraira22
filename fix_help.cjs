const fs = require('fs');
let content = fs.readFileSync('src/components/HelpSupportView.tsx', 'utf8');
content = content.replace(
  /'Open "Payments" or tStr\('sales'\), locate/g,
  '`Open "Payments" or "${tStr(\'sales\')}", locate`'
);
fs.writeFileSync('src/components/HelpSupportView.tsx', content);
