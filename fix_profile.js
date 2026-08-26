const fs = require('fs');
const p = 'src/pages/MemberProfile.jsx';
let content = fs.readFileSync(p, 'utf-8');

// 1. Add residence_type to initial state
content = content.replace(
  /year: '',\s+bio: '',/,
  "year: '',\n      residence_type: '',\n      bio: '',"
);

// 2. Add residence_type to setEditForm
content = content.replace(
  /year: prof\.year \|\| '',/,
  "year: prof.year || '',\n          residence_type: prof.residence_type || '',"
);

// 3. Add to update query
content = content.replace(
  /year: editForm\.year,/,
  "year: editForm.year,\n            residence_type: editForm.residence_type,"
);

// 4. Add the JSX input block
content = content.replace(
  /<div className="grid grid-cols-2 gap-4">\s*<div>\s*<label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Academic Year<\/label>[\s\S]*?placeholder="React, PyTorch, C\+\+"\s*\/>\s*<\/div>\s*<\/div>/,
  \<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Academic Year</label>
                    <input 
                      type="text" 
                      value={editForm.year}
                      onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                      className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Residence Type</label>
                    <select
                      value={editForm.residence_type}
                      onChange={(e) => setEditForm({ ...editForm, residence_type: e.target.value })}
                      className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                    >
                      <option value="">Select...</option>
                      <option value="hosteller">Hosteller</option>
                      <option value="day_scholar">Day Scholar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Skills</label>
                    <input 
                      type="text" 
                      value={editForm.skills}
                      onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                      className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary"
                      placeholder="React, PyTorch, C++"
                    />
                  </div>
                </div>\
);

// 5. Add to display
content = content.replace(
  /\{member\?\.department \|\| 'Department N\/A'\} • \{member\?\.year \|\| 'Year N\/A'\}/,
  "{member?.department || 'Department N/A'} • {member?.year || 'Year N/A'} {member?.residence_type ? •  : ''}"
);

fs.writeFileSync(p, content);
console.log('Profile updated');
