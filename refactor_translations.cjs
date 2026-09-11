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

  // Change tStr to t
  content = content.replace(/tStr/g, 't');

  // If useVelcora had t extracted, we need to extract t from useTranslation instead.
  // Wait, the easiest way is to add const { t, locale, setLocale } = useTranslation();
  // and remove them from useVelcora();
  
  if (content.includes('useVelcora()') && content.includes(', t } = useVelcora()')) {
    content = content.replace(/,\s*t\s*\}\s*=\s*useVelcora\(\)/g, '} = useVelcora()');
  } else if (content.includes('useVelcora()') && content.includes('{ t } = useVelcora()')) {
    content = content.replace(/\{\s*t\s*\}\s*=\s*useVelcora\(\)/g, '{} = useVelcora()');
  }

  // Remove locale, setLocale from useVelcora()
  content = content.replace(/,\s*locale/g, '');
  content = content.replace(/locale\s*,/g, '');
  content = content.replace(/,\s*setLocale/g, '');
  content = content.replace(/setLocale\s*,/g, '');

  if (content.includes('const { t }') || content.includes(' t(')) {
    // Add import if not exists
    if (!content.includes('useTranslation')) {
      // Find the last import and add useTranslation
      let importMatch = content.match(/import.*['"];?/g);
      if (importMatch) {
         let lastImport = importMatch[importMatch.length - 1];
         // Figure out path to TranslationContext
         let relativePath = path.relative(path.dirname(file), path.join(__dirname, 'src', 'context', 'TranslationContext')).replace(/\\/g, '/');
         if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
         content = content.replace(lastImport, lastImport + `\nimport { useTranslation } from '${relativePath}';`);
      }
      
      // Inject const { t, locale, setLocale } = useTranslation();
      // Right after useVelcora()
      content = content.replace(/const\s+\{([^}]*)\}\s*=\s*useVelcora\(\);/g, `const {$1} = useVelcora();\n  const { t, locale, setLocale } = useTranslation();`);
    }
  }

  // Check if there's any useVelcora without t, but t is used
  // e.g. floating assistant where we changed tStr to t.
  
  // App.tsx
  if (file.endsWith('App.tsx')) {
    if (!content.includes('TranslationProvider')) {
       content = content.replace(/import \{ VelcoraProvider/, `import { TranslationProvider } from './context/TranslationContext';\nimport { VelcoraProvider`);
       content = content.replace(/<VelcoraProvider>/, `<TranslationProvider>\n    <VelcoraProvider>`);
       content = content.replace(/<\/VelcoraProvider>/, `</VelcoraProvider>\n    </TranslationProvider>`);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Refactored translations in ${file}`);
  }
}
