*** Begin Patch
*** Update File: src/pages/Teams.jsx
@@
-  const { teams, myTeams, loading, refetch: refetchTeams, removeMember, addMember, deleteTeam } = useTeams()
-  const { members } = useMembers()
-  const { requests, myRequests, approveRequest, rejectRequest, requestJoin, getMyRequestStatus } = useTeamJoinRequests()
+  const { teams, myTeams, loading, refetch: refetchTeams, removeMember, addMember, deleteTeam } = useTeams()
+  const { members } = useMembers()
+  const { requests, myRequests, approveRequest, rejectRequest, requestJoin, getMyRequestStatus } = useTeamJoinRequests()
@@
-  if (loading) return (
-    <main className="flex-1 flex items-center justify-center min-h-[60vh]">
-      <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
-        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
-        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
-      </svg>
-    </main>
-  )
+  if (loading) return (
+    <main className="flex-1 px-4 md:px-8 pt-24 pb-12 max-w-7xl mx-auto w-full">
+      <div className="flex items-center justify-center min-h-[60vh]">
+        <div className="w-full">
+          {/* Use the shared skeleton for teams/cards */}
+          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
+            {[...Array(6)].map((_, i) => (
+              <div key={i} className="bg-surface-container rounded-2xl border border-outline-variant p-5 animate-pulse h-52" />
+            ))}
+          </div>
+        </div>
+      </div>
+    </main>
+  )
*** End Patch