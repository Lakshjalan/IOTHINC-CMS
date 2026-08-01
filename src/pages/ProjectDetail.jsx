*** Begin Patch
*** Update File: src/pages/ProjectDetail.jsx
@@
-  const [project, setProject] = useState(null)
-  const [tasks, setTasks] = useState([])
-  const [subtasks, setSubtasks] = useState([])
-  const [contributions, setContributions] = useState([])
-  const [departments, setDepartments] = useState([])
-  const [loading, setLoading] = useState(true)
+  const [project, setProject] = useState(null)
+  const [tasks, setTasks] = useState([])
+  const [subtasks, setSubtasks] = useState([])
+  const [contributions, setContributions] = useState([])
+  const [departments, setDepartments] = useState([])
+  const [loading, setLoading] = useState(true)
@@
-  const fetchProjectDetails = async () => {
-    setLoading(true)
-    try {
-      const { data: proj, error: projErr } = await supabase
-        .from('projects')
-        .select('*, teams(id, name)')
-        .eq('id', id)
-        .single()
-
-      if (projErr) throw projErr
-      setProject(proj)
-      document.title = `${proj.title} | IOTHINC`
-
-      // Regular tasks
-      const { data: tsk } = await supabase
-        .from('tasks')
-        .select('*, assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)')
-        .eq('project_id', id)
-        .is('admin_comment', null)   // regular tasks have no admin_comment marker
-      setTasks(tsk || [])
-
-      // Sub-tasks: stored in tasks table, identified by admin_comment = 'subtask'
-      // weightage stored in progress field (0-100), department stored in due_date workaround
-      // We use admin_comment field to tag subtasks and store metadata as JSON in it
-      const { data: st } = await supabase
-        .from('tasks')
-        .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)')
-        .eq('project_id', id)
-        .like('admin_comment', 'subtask:%')
-      setSubtasks(
-        (st || []).map(t => {
-          let meta = {}
-          try { meta = JSON.parse(t.admin_comment?.replace('subtask:', '')) } catch {}
-          return { ...t, meta }
-        })
-      )
-
-      // Contributions
-      const { data: contr } = await supabase
-        .from('contributions')
-        .select('*, member:profiles!contributions_member_id_fkey(full_name, avatar_url)')
-        .eq('project_id', id)
-      setContributions(contr || [])
-
-      // Distinct departments from profiles
-      const { data: depts } = await supabase
-        .from('profiles')
-        .select('department')
-        .not('department', 'is', null)
-      const unique = [...new Set((depts || []).map(d => d.department).filter(Boolean))]
-      setDepartments(unique)
-
-    } catch (err) {
-      console.error(err)
-    } finally {
-      setLoading(false)
-    }
-  }
+  const fetchProjectDetails = async () => {
+    setLoading(true)
+    try {
+      const { data: proj, error: projErr } = await supabase
+        .from('projects')
+        .select('*, teams(id, name)')
+        .eq('id', id)
+        .single()
+
+      if (projErr) throw projErr
+      setProject(proj)
+      document.title = `${proj.title} | IOTHINC`
+
+      // Regular tasks
+      const { data: tsk } = await supabase
+        .from('tasks')
+        .select('*, assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)')
+        .eq('project_id', id)
+        .is('admin_comment', null)
+      setTasks(tsk || [])
+
+      // Sub-tasks
+      const { data: st } = await supabase
+        .from('tasks')
+        .select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)')
+        .eq('project_id', id)
+        .like('admin_comment', 'subtask:%')
+      setSubtasks(
+        (st || []).map(t => {
+          let meta = {}
+          try { meta = JSON.parse(t.admin_comment?.replace('subtask:', '')) } catch {}
+          return { ...t, meta }
+        })
+      )
+
+      // Contributions
+      const { data: contr } = await supabase
+        .from('contributions')
+        .select('*, member:profiles!contributions_member_id_fkey(full_name, avatar_url)')
+        .eq('project_id', id)
+      setContributions(contr || [])
+
+      // Distinct departments
+      const { data: depts } = await supabase
+        .from('profiles')
+        .select('department')
+        .not('department', 'is', null)
+      const unique = [...new Set((depts || []).map(d => d.department).filter(Boolean))]
+      setDepartments(unique)
+
+    } catch (err) {
+      console.error(err)
+    } finally {
+      setLoading(false)
+    }
+  }
*** End Patch