const fs = require('fs');
const path = require('path');
const componentsDir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Fix attribute=tStr('key') to attribute={tStr('key')}
  // E.g. title=tStr('ask_ai') -> title={tStr('ask_ai')}
  // placeholder=tStr('search_placeholder') -> placeholder={tStr('search_placeholder')}
  content = content.replace(/([a-zA-Z0-9_-]+)=tStr\('([^']+)'\)/g, '$1={tStr(\'$2\')}');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed JSX attributes in ${file}`);
  }
}
