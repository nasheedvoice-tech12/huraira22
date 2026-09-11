const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
};

const files = walk(path.join(__dirname, 'src'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Remove t, locale, setLocale if they are standalone on a line
  content = content.replace(/^\s*t,\s*$/gm, '');
  content = content.replace(/^\s*locale,\s*$/gm, '');
  content = content.replace(/^\s*setLocale,\s*$/gm, '');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed standalone t/locale in ${file}`);
  }
}
