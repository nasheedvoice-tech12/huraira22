const fs = require('fs');
let content = fs.readFileSync('src/components/ReferralPartnerDashboard.tsx', 'utf8');

content = content.replace(/\s*t\s*}\s*=\s*useVelcora\(\);/g, '\n  } = useVelcora();');

if (!content.includes('useTranslation')) {
  content = content.replace("import { useVelcora }", "import { useTranslation } from '../context/TranslationContext';\nimport { useVelcora }");
  content = content.replace("} = useVelcora();", "} = useVelcora();\n  const { t } = useTranslation();");
}

fs.writeFileSync('src/components/ReferralPartnerDashboard.tsx', content);
