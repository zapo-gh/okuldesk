const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const pagesDir = path.join(__dirname, 'frontend/src/pages/admin');
const files = walk(pagesDir);

let fixedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // The corruption looks like:
  // <Button variant="ghost"   className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Düzenle"> openEditModal(row)} className="text-blue-600 hover:text-blue-900 px-2 py-1" title="Düzenle">
  // or
  // <Button variant="ghost"  disabled className="..."> handleDelete(row.id)} className="..." title="Sil">
  // We can match:
  // <Button variant="ghost"([^>]*)> ([^}]+)\}([^>]*)>(?:[\s\S]*?)<(Edit|Pencil|Trash2)([\s\S]*?)\/>(?:[\s\S]*?)<\/Button>
  
  content = content.replace(/<Button variant="ghost"([^>]*)> ([a-zA-Z0-9_\-\(\)\.\s]+)\}([^>]*)>([\s\S]*?)<(Edit|Pencil|Trash2)([\s\S]*?)\/>([\s\S]*?)<\/Button>/g, (match, ghostProps, funcCall, oldProps, s1, icon, iconProps, s2) => {
    // Reconstruct the proper button
    const isDelete = icon === 'Trash2';
    const colorClass = isDelete ? 'text-red-600 hover:text-red-900' : 'text-blue-600 hover:text-blue-900';
    const title = isDelete ? 'Sil' : 'Düzenle';
    
    // Check if it was disabled
    const disabledMatch = oldProps.match(/disabled=\{[^}]+\}/) || oldProps.match(/disabled/);
    const disabled = disabledMatch ? ` ${disabledMatch[0]}` : '';

    return `<Button variant="ghost" onClick={() => ${funcCall.trim()}}${disabled} className="${colorClass} px-2 py-1 transition-colors" title="${title}">${s1}<${icon}${iconProps}/>${s2}</Button>`;
  });

  // There is another pattern where it wasn't broken by '=>' but just transformed normally, 
  // we should ensure it looks right, but the main issue is the '=>' breakage.

  // Also in some cases where onClick was `onClick={handleDelete}` without `=>`, it worked fine?
  // Let's also fix cases where `onClick={() => ` was parsed but not correctly?
  // Wait, if it didn't have `=>`, `btnProps` didn't have `>`, so it worked perfectly.
  // The only breakage is when `=>` was present.

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${path.relative(__dirname, file)}`);
    fixedFiles++;
  }
});

console.log(`\nTotal files fixed: ${fixedFiles}`);
