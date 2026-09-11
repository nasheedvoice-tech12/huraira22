const fs = require('fs');
let content = fs.readFileSync('src/context/TranslationContext.tsx', 'utf8');

content = content.replace('const [ setLocaleState]', 'const [locale, setLocaleState]');
content = content.replace('value={{   t }}', 'value={{ locale, setLocale, t }}');

fs.writeFileSync('src/context/TranslationContext.tsx', content);
