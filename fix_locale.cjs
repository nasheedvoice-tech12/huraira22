const fs = require('fs');
let content = fs.readFileSync('src/context/VelcoraContext.tsx', 'utf8');

content = content.replace(
  'const [locale, setLocale] = useState<LocaleCode>(activeBusiness.language || \'en\');',
  `const [locale, setLocaleState] = useState<LocaleCode>(activeBusiness.language || 'en');
  
  const setLocale = (loc: LocaleCode) => {
    setLocaleState(loc);
    updateBusinessProfile({ language: loc });
  };`
);

fs.writeFileSync('src/context/VelcoraContext.tsx', content);
