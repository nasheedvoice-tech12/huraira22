const fs = require('fs');
let content = fs.readFileSync('src/context/VelcoraContext.tsx', 'utf8');

content = content.replace(
  'updateBusinessProfile({ language: loc });',
  `setBusinesses(prev => prev.map(b => b.id === activeBusinessId ? { ...b, language: loc } : b));
    if (activeBusinessId) {
      setDoc(doc(db, 'businesses', activeBusinessId), { language: loc }, { merge: true })
        .catch(err => console.error('Failed to update language', err));
    }`
);

fs.writeFileSync('src/context/VelcoraContext.tsx', content);
