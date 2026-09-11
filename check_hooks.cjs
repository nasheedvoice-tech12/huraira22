const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walkDir('src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // Check for useTranslation() usage
  const lines = content.split('\n');
  let currentFunc = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // basic function detection
    const funcMatch = line.match(/(?:function|const)\s+([a-zA-Z0-9_]+)\s*(?:=|:\s*React\.FC)?\s*(?:=|\()/);
    if (funcMatch) {
       currentFunc = funcMatch[1];
    }
    
    if (line.includes('useTranslation()') || line.includes('useVelcora()') || line.includes('useState(')) {
       if (currentFunc) {
         if (!currentFunc.startsWith('use') && !/^[A-Z]/.test(currentFunc)) {
           console.log(`Potential invalid hook call in ${file}:${i+1} inside function ${currentFunc}`);
         }
       } else {
         console.log(`Hook call outside any function in ${file}:${i+1}`);
       }
    }
  }
}
