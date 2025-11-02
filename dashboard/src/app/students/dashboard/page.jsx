'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useRouter } from 'next/navigation';
import ProtectedRole from '@/components/ProtectedRole';

async function fetchStudentDrives(batch) {
  // try backend endpoint that returns drives filtered by batch if available
  const res = await api.get('/drives', { qs: { batch } }).catch(async () => {
    // fallback: fetch all drives
    const all = await api.get('/drives');
    return all.data || all.drives || all;
  });
  return res.data || res.drives || res;
}

export default function StudentDashboard() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();

  const batch = (user && user.batch) || undefined;
  const { data: drives, isLoading } = useQuery(['studentDrives', batch], () => fetchStudentDrives(batch), { enabled: !!user });

  // optionally fetch student's groups
  const { data: myGroups } = useQuery(['myGroups'], async () => {
    const res = await api.get('/groups'); // your backend may support /groups?me=true or /users/me/groups
    return res.data || res.groups || res;
  }, { enabled: !!user });

  if (userLoading) return <div>Loading...</div>;

  return (
    <ProtectedRole allowedRole="student">
      <div className="py-6">
        <h1 className="text-2xl font-semibold mb-3">Student Dashboard</h1>
        <div className="mb-6">
          <div className="text-sm text-gray-600">Welcome, {user?.name}</div>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-medium mb-2">Available Drives</h2>
          {isLoading && <div>Loading drives...</div>}
          <div className="grid gap-3">
            {drives && drives.length === 0 && <div>No drives available</div>}
            {drives && drives.map(d => (
              <div key={d._id} className="border p-3 rounded">
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-gray-500">Stage: {d.currentStage}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">My Groups</h2>
          <div>
            {myGroups && myGroups.length === 0 && <div>You are not in any group yet</div>}
            {myGroups && myGroups.map(g => (
              <div key={g._id} className="border p-3 rounded mb-2">
                <div className="font-medium">{g.name}</div>
                <div className="text-sm text-gray-500">Status: {g.status} — Leader: {g.leaderName || g.leader}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ProtectedRole>
  );
}