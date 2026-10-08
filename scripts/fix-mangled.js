const fs = require('fs');
const path = require('path');

const directories = [
  'c:/Users/zafer/OneDrive/Desktop/okuldesk-main/frontend/src/pages/admin',
  'c:/Users/zafer/OneDrive/Desktop/okuldesk-main/frontend/src/pages/admin/modules'
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
        // none
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /icon={<([a-zA-Z0-9_]+) size={(\d+)}\s*actions={\s*<>\s*}\s*\/>/g;
      // Wait, let's just use string replace since the broken pattern is predictable
      
      const brokenPattern = /icon={<([a-zA-Z0-9_]+) size={(\d+)}\s*actions={\s*<>\s*}\s*\/>/g;
      
      // Let's do a more robust regex that ignores whitespaces:
      const newContent = content.replace(/icon={<([a-zA-Z0-9_]+) size={(\d+)}\n\s*actions={\n\s*<>\n\s*}\n\s*\/>/g, 'icon={<$1 size={$2} />}\n        actions={\n          <>');
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Fixed syntax:', file);
      }
    }
  }
}

for (const d of directories) {
  processDir(d);
}
