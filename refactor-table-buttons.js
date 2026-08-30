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

let updatedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // We want to replace <Button ...> ... <Trash2 .../> ... </Button>
  // Because onClick={() => ...} contains '>', we cannot just use [^>]*.
  // But we can match the whole block since buttons with Trash2 are usually small.
  // Let's use a non-greedy match that doesn't cross another <Button tag.
  
  // For Edit/Pencil
  content = content.replace(/<Button((?:(?!<Button)[\s\S])*?)>([\s\S]*?)<(Edit|Pencil)([\s\S]*?)\/>([\s\S]*?)<\/Button>/g, (match, btnProps, s1, iconName, iconProps, s2) => {
    // Check if it already has variant="ghost"
    if (btnProps.includes('variant="ghost"')) {
      // Still update the classes to be standard
      const onClickMatch = btnProps.match(/onClick=\{[^}]+\}/);
      const onClick = onClickMatch ? onClickMatch[0] : '';
      const disabledMatch = btnProps.match(/disabled=\{[^}]+\}/) || btnProps.match(/disabled/);
      const disabled = disabledMatch ? disabledMatch[0] : '';
      return `<Button variant="ghost" ${onClick} ${disabled} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">${s1}<${iconName}${iconProps}/>${s2}</Button>`;
    }

    const onClickMatch = btnProps.match(/onClick=\{[^}]+\}/);
    const onClick = onClickMatch ? onClickMatch[0] : '';
    const titleMatch = btnProps.match(/title="[^"]+"/);
    const title = titleMatch ? titleMatch[0] : 'title="Düzenle"';
    const disabledMatch = btnProps.match(/disabled=\{[^}]+\}/) || btnProps.match(/disabled/);
    const disabled = disabledMatch ? disabledMatch[0] : '';

    return `<Button variant="ghost" ${onClick} ${disabled} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" ${title}>${s1}<${iconName}${iconProps}/>${s2}</Button>`;
  });

  // For Trash2
  content = content.replace(/<Button((?:(?!<Button)[\s\S])*?)>([\s\S]*?)<Trash2([\s\S]*?)\/>([\s\S]*?)<\/Button>/g, (match, btnProps, s1, iconProps, s2) => {
    // Exclude Bulk Delete button (it has text inside usually, so length of s1/s2 would be long, or check if btnProps has specific classes)
    if (match.includes("Öğrenciyi Sil") || match.includes("Eski raporu sil")) return match;

    const onClickMatch = btnProps.match(/onClick=\{[^}]+\}/);
    const onClick = onClickMatch ? onClickMatch[0] : '';
    const titleMatch = btnProps.match(/title="[^"]+"/);
    const title = titleMatch ? titleMatch[0] : 'title="Sil"';
    const disabledMatch = btnProps.match(/disabled=\{[^}]+\}/) || btnProps.match(/disabled/);
    const disabled = disabledMatch ? disabledMatch[0] : '';

    return `<Button variant="ghost" ${onClick} ${disabled} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" ${title}>${s1}<Trash2${iconProps}/>${s2}</Button>`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${path.relative(__dirname, file)}`);
    updatedFiles++;
  }
});

console.log(`\nTotal files updated: ${updatedFiles}`);
