const fs = require('fs');
let content = fs.readFileSync('src/components/AskVelcoraChat.tsx', 'utf8');

// fix chatContainerRef
content = content.replace('const [searchQuery, setSearchQuery] = useState(\'\');', 'const [searchQuery, setSearchQuery] = useState(\'\');\n  const chatContainerRef = useRef<HTMLDivElement>(null);');

// fix handleSendMessage in onSubmit
content = content.replace('onSubmit={handleSendMessage}', 'onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}');

// fix attachedFile usages
content = content.replace('attachedFile.type.startsWith(\'image/\')', 'attachedFile.mimeType.startsWith(\'image/\')');
content = content.replace('URL.createObjectURL(attachedFile)', 'attachedFile.base64');
content = content.replace('handleSendMessage(e as any);', 'handleSendMessage();');

fs.writeFileSync('src/components/AskVelcoraChat.tsx', content);
