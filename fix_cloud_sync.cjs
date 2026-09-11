const fs = require('fs');
let content = fs.readFileSync('src/components/CloudAndSettings.tsx', 'utf8');

// Ensure updateActiveBusiness is destructured
if (!content.includes('updateActiveBusiness,')) {
  content = content.replace('activeBusiness,', 'activeBusiness,\n    updateActiveBusiness,');
}

const oldSelect = `onChange={e => {
                const loc = e.target.value as any;
                setLocale(loc);
                if (activeBusiness) {
                  // Optionally sync to cloud if they want it persistent across devices
                  // For now, it's just saving via TranslationContext's localstorage
                }
              }}`;

const newSelect = `onChange={e => {
                const loc = e.target.value as any;
                setLocale(loc);
                if (activeBusiness) {
                  updateActiveBusiness({ language: loc });
                }
              }}`;

content = content.replace(oldSelect, newSelect);
fs.writeFileSync('src/components/CloudAndSettings.tsx', content);
