const fs = require('fs');
const path = require('path');

const files = [
  'src/components/CustomerAndLoyalty.tsx',
  'src/components/FloatingAiAssistant.tsx',
  'src/components/HelpSupportView.tsx',
  'src/components/VelcoraStudio.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  if (!content.includes('useTranslation')) {
    let importMatch = content.match(/import.*['"];?/g);
    if (importMatch) {
       let lastImport = importMatch[importMatch.length - 1];
       let relativePath = path.relative(path.dirname(file), path.join(__dirname, 'src', 'context', 'TranslationContext')).replace(/\\/g, '/');
       if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
       content = content.replace(lastImport, lastImport + `\nimport { useTranslation } from '${relativePath}';`);
    }
  }

  if (!content.includes('const { t } = useTranslation();') && !content.includes('const { t, locale, setLocale } = useTranslation();')) {
    content = content.replace(/const\s+\{([^}]*)\}\s*=\s*useVelcora\(\);/g, `const {$1} = useVelcora();\n  const { t } = useTranslation();`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed missing t in ${file}`);
  }
}
