const fs = require('fs');
let content = fs.readFileSync('src/context/VelcoraContext.tsx', 'utf8');

content = content.replace('const [ setLocaleState]', 'const [locale, setLocaleState]');

fs.writeFileSync('src/context/VelcoraContext.tsx', content);
