const fs = require('fs');
const path = require('path');
const pagesDir = path.join('src', 'pages');
const appJsxPath = path.join('src', 'App.jsx');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));
for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^export const ([A-Z][a-zA-Z0-9_]*) =/m);
  if (match) {
    const name = match[1];
    content = content.replace(/^export const /m, 'const ');
    const defaultExportRegex = new RegExp('^export default ' + name + ';?', 'm');
    if (!defaultExportRegex.test(content)) {
      content += '\n\nexport default ' + name + ';\n';
    }
    fs.writeFileSync(filePath, content);
  }
}

let appContent = fs.readFileSync(appJsxPath, 'utf-8');
appContent = appContent.replace(/import\s*\{\s*([A-Z][a-zA-Z0-9_]*)\s*\}\s*from\s*'(\.\/pages\/[^']+)'/g, 'import $1 from \'$2\'');
appContent = appContent.replace(/\.then\(\s*m\s*=>\s*\(\{\s*default:\s*m\.[a-zA-Z0-9_]+\s*\}\)\)/g, '');
fs.writeFileSync(appJsxPath, appContent);
console.log('Done!');
