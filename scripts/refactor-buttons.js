const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'frontend/src/pages/admin/modules');

const files = fs.readdirSync(modulesDir).filter(f => f.endsWith('Page.tsx'));

files.forEach(file => {
  const filePath = path.join(modulesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Fix Modal Close Button:
  // <Button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
  content = content.replace(
    /<Button([^>]*onClick=\{\(\) => setIsModalOpen\(false\)\}[^>]*)className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">/g,
    '<Button variant="ghost" $1 className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">'
  );

  // 2. Fix Tabs:
  // From:
  // <Button
  //   key={...}
  //   onClick={() => setActiveTab(...)}
  //   className={`py-4 text-sm font-medium border-b-2 transition-colors ${...
  // To:
  // <button
  //   key={...}
  //   onClick={() => setActiveTab(...)}
  //   className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors focus:outline-none ${...
  content = content.replace(
    /<Button(\s+key=\{[^}]+\}\s+(?:type="button"\s+)?onClick=\{\(\) => setActiveTab\([^)]+\)\}\s+)className=\{`py-4 text-sm font-medium border-b-2 transition-colors \$\{/g,
    '<button$1className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors focus:outline-none ${'
  );
  content = content.replace(
    /<\/Button>(\s*\n\s*\}\)\)\s*\n\s*<\/div>)/g,
    '</button>$1'
  );

  // 3. Fix Print Button:
  // <Button onClick={handlePrint} className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium flex items-center justify-center space-x-2">
  content = content.replace(
    /<Button([^>]*onClick=\{handlePrint\}[^>]*)className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium flex items-center justify-center space-x-2">/g,
    '<button $1 className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium flex items-center justify-center space-x-2 transition-colors">'
  );
  content = content.replace(
    /<Button([^>]*onClick=\{handlePrint\}[^>]*)className="flex items-center space-x-2 px-6 py-2.5 bg-slate-800 text-white font-medium hover:bg-slate-900 rounded-lg transition-colors shadow-sm">/g,
    '<button $1 className="flex items-center space-x-2 px-6 py-2.5 bg-slate-800 text-white font-medium hover:bg-slate-900 rounded-lg transition-colors shadow-sm">'
  );

  // 4. Fix Footer Cancel Button:
  // <Button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
  content = content.replace(
    /<Button([^>]*onClick=\{\(\) => setIsModalOpen\(false\)\}[^>]*)className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">/g,
    '<Button variant="ghost" $1>'
  );

  // Also replace the closing </Button> tags for the buttons we changed to <button>
  // This is tricky without a proper AST parser, so we'll do it specifically around the Print buttons
  content = content.replace(
    /<span>Yazdır<\/span>\s*<\/Button>/g,
    '<span>Yazdır</span>\n                     </button>'
  );
  // Actually, wait, replacing `<span>Yazdır</span></Button>` with `</button>` is better done with a specific regex
  content = content.replace(/<span>Yazdır<\/span>\s*<\/Button>/g, '<span>Yazdır</span></button>');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
console.log('Done.');
