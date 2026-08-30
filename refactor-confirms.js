const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const pagesDir = path.join(__dirname, 'frontend/src/pages/admin');
const files = walk(pagesDir);

let updatedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // 1. Check if the file uses confirm or window.confirm
  // We exclude `const confirm = useConfirm` and `import { useConfirm`
  const hasConfirm = /(window\.confirm\(|[^a-zA-Z0-9]confirm\([^)]*\))/.test(content);
  
  if (hasConfirm) {
    // 2. Add import if it doesn't exist
    if (!content.includes('import { useConfirm }')) {
      // Calculate relative path to hooks
      // from pages/admin/StaffPage.tsx (depth 3) -> ../../../hooks/useConfirm
      // from pages/admin/modules/TravelAllowancePage.tsx (depth 4) -> ../../../../hooks/useConfirm
      const relativeToHooks = path.relative(path.dirname(file), path.join(__dirname, 'frontend/src/hooks/useConfirm'));
      // relativeToHooks might be ..\..\..\hooks\useConfirm, replace \ with /
      const importPath = relativeToHooks.replace(/\\/g, '/');
      
      const importStatement = `import { useConfirm } from '${importPath}';\n`;
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex + 1) + importStatement + content.slice(nextLineIndex + 1);
      } else {
        content = importStatement + content;
      }
    }

    // 3. Inject `const confirm = useConfirm();` if it doesn't exist
    if (!content.includes('useConfirm();')) {
      // Find the main component body
      // We look for `export default function Name` or `export function Name` or `const Name = () => {`
      const componentRegex = /(?:export\s+(?:default\s+)?function\s+[A-Z][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{|const\s+[A-Z][a-zA-Z0-9_]*\s*=\s*(?:[^=]+)?\([^)]*\)\s*=>\s*\{)/;
      const match = content.match(componentRegex);
      if (match) {
        const insertPos = match.index + match[0].length;
        content = content.slice(0, insertPos) + '\n  const confirm = useConfirm();' + content.slice(insertPos);
      } else {
        console.warn(`Could not find component body to inject useConfirm in ${file}`);
      }
    }

    // 4. Replace `window.confirm(` and `confirm(` with `await confirm(`
    // For `window.confirm`, it's easy:
    content = content.replace(/window\.confirm\(/g, 'await confirm(');
    
    // For `confirm(`, we must be careful not to replace `await confirm(` with `await await confirm(`
    // Also skip `const confirm = useConfirm` (which doesn't have open paren anyway).
    // Let's replace `!confirm(` with `!await confirm(`
    content = content.replace(/!confirm\(/g, '!await confirm(');
    // Let's replace `if (confirm(` with `if (await confirm(`
    content = content.replace(/if\s*\(confirm\(/g, 'if (await confirm(');
    // Let's replace `await await confirm` just in case
    content = content.replace(/await\s+await\s+confirm/g, 'await confirm');
  }

  // Also fix Student360Page which has an inline arrow function that needs to be async
  // Actually, in Student360Page: `const resetPassword = async (...) => { if (!window.confirm(...))`
  // It's already async!

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${path.relative(__dirname, file)}`);
    updatedFiles++;
  }
});

console.log(`\nTotal files updated: ${updatedFiles}`);
