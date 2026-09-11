const fs = require('fs');
let content = fs.readFileSync('src/context/VelcoraContext.tsx', 'utf8');

// Remove locale and setLocale from VelcoraContextType
content = content.replace(/\s*locale:\s*LocaleCode;\s*/, '\n');
content = content.replace(/\s*setLocale:\s*\(loc:\s*LocaleCode\)\s*=>\s*void;\s*/, '\n');
content = content.replace(/\s*tStr:\s*\(key:\s*string\)\s*=>\s*string;\s*/, '\n');
content = content.replace(/\s*const tStr = \(key: string\) => t\(locale, key\);\s*/, '\n');
content = content.replace(/\s*tStr,\s*/g, '\n');
// Also remove them from the provider value if they are still there
// wait, we ran a script that removed them but maybe they were standalone
content = content.replace(/^\s*t,\s*$/gm, '');

fs.writeFileSync('src/context/VelcoraContext.tsx', content);
