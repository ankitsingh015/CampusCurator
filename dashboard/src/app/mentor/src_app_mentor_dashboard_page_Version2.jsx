'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ProtectedRole from '@/components/ProtectedRole';

export default function MentorDashboard() {
  const { data: user, isLoading } = useCurrentUser();

  const { data: assignedGroups, isLoading: groupsLoading } = useQuery(['mentorGroups'], async () => {
    // backend may support /groups?mentorId=me or /mentors/me/groups - using /groups and filtering is fallback
    const res = await api.get('/groups'); // ideally change to endpoint that returns only assigned groups
    const groups = res.data || res.groups || res;
    // filter groups assigned to current mentor
    const myId = user && user.id ? user.id : (user && user._id);
    return Array.isArray(groups) ? groups.filter(g => g.assignedMentor === myId || g.assignedMentor?._id === myId) : [];
  }, { enabled: !!user });

  const { data: pendingSynopses } = useQuery(['pendingSynopses'], async () => {
    const res = await api.get('/synopsis');
    return res.data || res.synopses || res;
  }, { enabled: !!user });

  if (isLoading) return <div>Loading...</div>;

  return (
    <ProtectedRole allowedRole="mentor">
      <div className="py-6">
        <h1 className="text-2xl font-semibold mb-3">Mentor Dashboard</h1>
        <div className="text-sm text-gray-600 mb-4">Welcome, {user?.name}</div>

        <section className="mb-6">
          <h2 className="text-lg font-medium mb-2">Assigned Groups</h2>
          {groupsLoading && <div>Loading groups...</div>}
          <div className="space-y-3">
            {assignedGroups && assignedGroups.length === 0 && <div>No assigned groups yet</div>}
            {assignedGroups && assignedGroups.map(g => (
              <div key={g._id} className="border p-3 rounded">
                <div className="font-medium">{g.name}</div>
                <div className="text-xs text-gray-500">Drive: {g.driveName || g.drive}</div>
                <div className="text-sm text-gray-600">Leader: {g.leaderName || g.leader}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Pending Items</h2>
          <div>
            {pendingSynopses && pendingSynopses.length === 0 && <div>No pending synopsis reviews</div>}
            {pendingSynopses && pendingSynopses.map(s => (
              <div key={s._id} className="border p-3 rounded mb-2">
                <div className="font-medium">{s.title} — Group: {s.groupName || s.group}</div>
                <div className="text-xs text-gray-500">Status: {s.status}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ProtectedRole>
  );
}