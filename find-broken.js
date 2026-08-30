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

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Find broken buttons
  // They start with <Button variant="ghost" onClick={() 
  // Then have some classes, title, >
  // Then have some text ending with }
  
  const matches = content.match(/<Button variant="ghost" onClick=\{\(\) [^>]*>([^<]*\}[^<]*>)/g);
  if (matches) {
    console.log(`File: ${file}`);
    matches.forEach(m => console.log(m));
  }
});
