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

let fixedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // 1. Fix the destructuring
  if (content.includes('const confirm = useConfirm();')) {
    content = content.replace('const confirm = useConfirm();', 'const { confirm, confirmModal } = useConfirm();');
    
    // 2. Inject {confirmModal} before the final closing tag of the return statement
    // Usually the file ends with something like:
    //     </div>
    //   );
    // }
    // Or </Layout>
    // We can just find `\n  );\n}` and the closing tag right before it.
    
    const endReturnIndex = content.lastIndexOf(');');
    if (endReturnIndex !== -1) {
      // Find the last closing tag before `);`
      const lastClosingBracket = content.lastIndexOf('>', endReturnIndex);
      if (lastClosingBracket !== -1) {
        // Insert `{confirmModal}` right before the closing tag? No, inside the closing tag!
        // e.g. </div> -> insert before `</div>`
        const lastClosingTagStart = content.lastIndexOf('</', endReturnIndex);
        if (lastClosingTagStart !== -1 && lastClosingTagStart < lastClosingBracket) {
          content = content.slice(0, lastClosingTagStart) + '\n      {confirmModal}\n    ' + content.slice(lastClosingTagStart);
        } else {
          // If it ends with a self-closing tag or something else, just put it before `);`
          // Wait, if it's `<></>`, `</>` is matched by `</`.
          const emptyClosingTagStart = content.lastIndexOf('</>', endReturnIndex);
          if (emptyClosingTagStart !== -1) {
            content = content.slice(0, emptyClosingTagStart) + '\n      {confirmModal}\n    ' + content.slice(emptyClosingTagStart);
          }
        }
      }
    }
  }

  // Also check if any file already has `const { confirm } = useConfirm();` but no `confirmModal`
  if (content.includes('const { confirm } = useConfirm();')) {
    content = content.replace('const { confirm } = useConfirm();', 'const { confirm, confirmModal } = useConfirm();');
    
    const endReturnIndex = content.lastIndexOf(');');
    if (endReturnIndex !== -1) {
      const lastClosingTagStart = content.lastIndexOf('</', endReturnIndex);
      if (lastClosingTagStart !== -1) {
        content = content.slice(0, lastClosingTagStart) + '\n      {confirmModal}\n    ' + content.slice(lastClosingTagStart);
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${path.relative(__dirname, file)}`);
    fixedFiles++;
  }
});

console.log(`\nTotal files fixed: ${fixedFiles}`);
