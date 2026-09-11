const fs = require('fs');

let content = fs.readFileSync('c:/Users/Huraira/Desktop/velcora (8)/src/components/FounderAdminPanel.tsx', 'utf-8');

// Add the backend API call to handleSavePlan
content = content.replace(
  /        await setDoc\(doc\(db, 'system', 'plans'\), \{\n          plans: newPlans,\n          updatedAt: new Date\(\)\.toISOString\(\),\n          updatedBy: auth\.currentUser\?\.email \|\| 'hurairahussain667@gmail\.com',\n        \}, \{ merge: true \}\);/g,
          await setDoc(doc(db, 'system', 'plans'), {\n          plans: newPlans,\n          updatedAt: new Date().toISOString(),\n          updatedBy: auth.currentUser?.email || 'hurairahussain667@gmail.com',\n        }, { merge: true });\n\n        try {\n          const headers = await getAuthHeader();\n          await fetch(getApiUrl('/api/admin/plans/update'), {\n            method: 'POST',\n            headers,\n            body: JSON.stringify({ plans: newPlans })\n          });\n        } catch (e) { console.warn('Backend sync failed', e); }
);

// Add the backend API call to handleDeletePlan
content = content.replace(
  /        await setDoc\(doc\(db, 'system', 'plans'\), \{\n          plans: newPlans,\n          updatedAt: new Date\(\)\.toISOString\(\),\n          updatedBy: auth\.currentUser\?\.email \|\| 'hurairahussain667@gmail\.com',\n        \}, \{ merge: true \}\);/g,
          await setDoc(doc(db, 'system', 'plans'), {\n          plans: newPlans,\n          updatedAt: new Date().toISOString(),\n          updatedBy: auth.currentUser?.email || 'hurairahussain667@gmail.com',\n        }, { merge: true });\n\n        try {\n          const headers = await getAuthHeader();\n          await fetch(getApiUrl('/api/admin/plans/update'), {\n            method: 'POST',\n            headers,\n            body: JSON.stringify({ plans: newPlans })\n          });\n        } catch (e) { console.warn('Backend sync failed', e); }
);

// Add the backend API call to handleResetPlansToDefault
content = content.replace(
  /        await setDoc\(doc\(db, 'system', 'plans'\), \{\n          plans: DEFAULT_SUBSCRIPTION_PLANS,\n          updatedAt: new Date\(\)\.toISOString\(\),\n          updatedBy: auth\.currentUser\?\.email \|\| 'hurairahussain667@gmail\.com',\n        \}, \{ merge: true \}\);/g,
          await setDoc(doc(db, 'system', 'plans'), {\n          plans: DEFAULT_SUBSCRIPTION_PLANS,\n          updatedAt: new Date().toISOString(),\n          updatedBy: auth.currentUser?.email || 'hurairahussain667@gmail.com',\n        }, { merge: true });\n\n        try {\n          const headers = await getAuthHeader();\n          await fetch(getApiUrl('/api/admin/plans/update'), {\n            method: 'POST',\n            headers,\n            body: JSON.stringify({ plans: DEFAULT_SUBSCRIPTION_PLANS })\n          });\n        } catch (e) { console.warn('Backend sync failed', e); }
);

fs.writeFileSync('c:/Users/Huraira/Desktop/velcora (8)/src/components/FounderAdminPanel.tsx', content);
