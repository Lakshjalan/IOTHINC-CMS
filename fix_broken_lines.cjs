const fs = require('fs');
let content = fs.readFileSync('C:/Users/laksh/Desktop/IOTHINC/IOTHINC/src/pages/EventDetail.jsx', 'utf8');
const lines = content.split('\\n');

[281, 294, 698].forEach(lineNum => {
    lines[lineNum - 1] = lines[lineNum - 1].replace(/canManageTask/g, 'canManage');
});

fs.writeFileSync('C:/Users/laksh/Desktop/IOTHINC/IOTHINC/src/pages/EventDetail.jsx', lines.join('\\n'));
console.log('Fixed lines');
