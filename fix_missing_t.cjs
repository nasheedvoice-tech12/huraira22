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

  if ((content.includes(' t(') || content.includes('locale') || content.includes('setLocale')) && !content.includes('useTranslation')) {
    let importMatch = content.match(/import.*['"];?/g);
    if (importMatch) {
       let lastImport = importMatch[importMatch.length - 1];
       let relativePath = path.relative(path.dirname(file), path.join(__dirname, 'src', 'context', 'TranslationContext')).replace(/\\/g, '/');
       if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
       content = content.replace(lastImport, lastImport + `\nimport { useTranslation } from '${relativePath}';`);
    }
    content = content.replace(/const\s+\{([^}]*)\}\s*=\s*useVelcora\(\);/g, `const {$1} = useVelcora();\n  const { t, locale, setLocale } = useTranslation();`);
  }

  // Also fix PosBillingScreen where t might be redeclared.
  if (file.endsWith('PosBillingScreen.tsx')) {
    if (content.includes('const { t, locale, setLocale } = useTranslation();') && content.includes('const { t } = useTranslation();')) {
      content = content.replace('const { t } = useTranslation();\n', '');
    }
    // Remove duplicates
    content = content.replace(/const \{ t, locale, setLocale \} = useTranslation\(\);\s*const \{ t, locale, setLocale \} = useTranslation\(\);/g, 'const { t, locale, setLocale } = useTranslation();');
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed missing t/locale in ${file}`);
  }
}
