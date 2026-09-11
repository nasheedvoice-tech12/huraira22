const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// We are inside VelcoraAppContent component.
// Find const { activeBusiness, ... } = useVelcora();
// or const { t, locale, setLocale } = useTranslation();

const injectCode = `
  // Sync language from cloud business profile on login
  useEffect(() => {
    if (activeBusiness?.language && activeBusiness.language !== locale) {
      setLocale(activeBusiness.language);
    }
  }, [activeBusiness?.language]);
`;

// Insert after const { t, locale, setLocale } = useTranslation();
if (content.includes('const { t, locale, setLocale } = useTranslation();')) {
  content = content.replace('const { t, locale, setLocale } = useTranslation();', 'const { t, locale, setLocale } = useTranslation();\n' + injectCode);
}

fs.writeFileSync('src/App.tsx', content);
