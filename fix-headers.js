const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We are looking for:
      // <div className="print:hidden flex items-center justify-between">
      //   <PageHeader ... />
      //   <button ... > ... </button>
      // </div>
      // Or similar flex wrappers.
      
      // This regex is tricky. Let's do a simple one:
      // Match the opening <div className="print:hidden flex items-center justify-between"> or similar.
      const regex = /<div className="[^"]*flex[^"]*items-center[^"]*justify-between[^"]*">\s*<PageHeader\s+title="([^"]+)"\s+description="([^"]+)"\s+icon={([^}]+)}[\s\S]*?\/>\s*([\s\S]*?)\s*<\/div>/g;
      
      let modified = false;
      content = content.replace(regex, (match, title, desc, icon, buttonContent) => {
        // If buttonContent contains </div> inside it (nested divs), this regex will fail. 
        // We need a more robust parsing. 
        return match;
      });
      
    }
  }
}
