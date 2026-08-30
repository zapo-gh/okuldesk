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
      if (file !== 'print' && file !== 'students' && file !== 'absenteeism') {
          // not going too deep
      }
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /<div className="print:hidden flex items-center justify-between">\s*<PageHeader\s+title="([^"]+)"\s+description=("[^"]+"|{`[^`]+`})\s+icon={([^}]+)}\s*\/>\s*([\s\S]*?)<\/div>/g;
      
      const newContent = content.replace(regex, (match, title, desc, icon, buttonHTML) => {
        // Double check if the buttonHTML actually contains a button or not
        return `<PageHeader \n        title="${title}" \n        description=${desc} \n        icon={${icon}}\n        actions={\n          <>\n            ${buttonHTML.trim().split('\n').join('\n            ')}\n          </>\n        }\n      />`;
      });
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Fixed:', file);
      }
    }
  }
}

for (const d of directories) {
  processDir(d);
}
