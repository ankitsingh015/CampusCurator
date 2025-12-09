'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { use, useState } from 'react';
import ProtectedRole from '@/components/ProtectedRole';
import Link from 'next/link';

export default function DriveManagement({ params }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [showAutoGroup, setShowAutoGroup] = useState(false);
  const [showAutoAllot, setShowAutoAllot] = useState(false);

  const { data: drive, isLoading: driveLoading } = useQuery({
    queryKey: ['drive', id],
    queryFn: async () => {
      const res = await api.get(`/drives/${id}`);
      return res.data;
    }
  });

  const { data: progress } = useQuery({
    queryKey: ['driveProgress', id],
    queryFn: async () => {
      const res = await api.get(`/drives/${id}/progress`);
      return res.data;
    }
  });

  const { data: remainingStudents } = useQuery({
    queryKey: ['remainingStudents', id],
    queryFn: async () => {
      const res = await api.get(`/groups/remaining/${id}`);
      return res.data || [];
    }
  });

  const { data: groups } = useQuery({
    queryKey: ['driveGroups', id],
    queryFn: async () => {
      const res = await api.get(`/groups?drive=${id}`);
      return res.data || [];
    }
  });

  const progressStageMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/drives/${id}/progress-stage`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive', id] });
      qc.invalidateQueries({ queryKey: ['driveProgress', id] });
      alert('Stage progressed successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to progress stage');
    }
  });

  const regressStageMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/drives/${id}/regress-stage`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive', id] });
      qc.invalidateQueries({ queryKey: ['driveProgress', id] });
      alert('Stage regressed successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to regress stage');
    }
  });

  const autoGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/groups/auto-group/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remainingStudents', id] });
      qc.invalidateQueries({ queryKey: ['driveGroups', id] });
      setShowAutoGroup(false);
      alert('Remaining students auto-grouped!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to auto-group');
    }
  });

  const autoAllotMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/groups/auto-allot/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driveGroups', id] });
      qc.invalidateQueries({ queryKey: ['driveProgress', id] });
      setShowAutoAllot(false);
      alert('Mentors auto-allotted based on timestamp preferences!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to auto-allot mentors');
    }
  });

  const unassignMentorMutation = useMutation({
    mutationFn: async (groupId) => {
      const res = await api.del(`/groups/${groupId}/mentor`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driveGroups', id] });
      qc.invalidateQueries({ queryKey: ['driveProgress', id] });
      alert('Mentor unassigned successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to unassign mentor');
    }
  });

  if (driveLoading) return <div className="py-8 text-center">Loading...</div>;
  if (!drive) return <div className="py-8 text-center text-red-600">Drive not found</div>;

  const stages = [
    { id: 'group-formation', name: 'Group Formation', status: drive.currentStage === 'group-formation' ? 'active' : drive.currentStage > 'group-formation' ? 'completed' : 'pending' },
    { id: 'mentor-allotment', name: 'Mentor Allotment', status: drive.currentStage === 'mentor-allotment' ? 'active' : drive.currentStage > 'mentor-allotment' ? 'completed' : 'pending' },
    { id: 'synopsis', name: 'Synopsis', status: drive.currentStage === 'synopsis' ? 'active' : drive.currentStage > 'synopsis' ? 'completed' : 'pending' },
    { id: 'checkpoints', name: 'Checkpoints', status: drive.currentStage === 'checkpoints' ? 'active' : drive.currentStage > 'checkpoints' ? 'completed' : 'pending' },
    { id: 'result', name: 'Results', status: drive.currentStage === 'result' ? 'active' : drive.currentStage > 'result' ? 'completed' : 'pending' },
    { id: 'completed', name: 'Completed', status: drive.currentStage === 'completed' ? 'active' : 'pending' }
  ];

  return (
    <ProtectedRole allowedRole="admin">
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <Link href="/admin/dashboard" className="text-orange-600 hover:text-orange-700 font-medium mb-6 inline-block">← Back to Dashboard</Link>

            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{drive.name}</h1>
              <p className="text-gray-700">{drive.description}</p>
            </div>

            {/* Stage Timeline */}
            <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Stage Progress</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-2 whitespace-nowrap">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  stage.status === 'completed' ? 'bg-green-600' : 
                  stage.status === 'active' ? 'bg-blue-600' : 
                  'bg-gray-400'
                }`}>
                  {stage.status === 'completed' ? '✓' : idx + 1}
                </div>
                <div className="text-sm font-medium text-gray-700">{stage.name}</div>
                {idx < stages.length - 1 && <div className="w-8 h-px bg-gray-300" />}
              </div>
            ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100">
                <p className="font-medium text-gray-900 mb-2">Current Stage: {drive.currentStage}</p>
                <p className="text-sm text-gray-700 mb-4">Status: {drive.status}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => regressStageMutation.mutate()}
                    disabled={regressStageMutation.isPending || drive.currentStage === 'group-formation'}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    title={drive.currentStage === 'group-formation' ? 'Already at first stage' : 'Go back to previous stage'}
                  >
                    {regressStageMutation.isPending ? '⏳ Processing...' : '⬅️ Back to Previous Stage'}
                  </button>
                  <button
                    onClick={() => progressStageMutation.mutate()}
                    disabled={progressStageMutation.isPending || drive.currentStage === 'completed'}
                    className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    title={drive.currentStage === 'completed' ? 'Already at final stage' : 'Move to next stage'}
                  >
                    {progressStageMutation.isPending ? '⏳ Processing...' : 'Progress to Next Stage ➡️'}
                  </button>
                </div>
              </div>
              </div>
            </section>        {/* Progress Metrics */}
        {progress && (
          <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Progress Metrics</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Groups Formed</div>
                <div className="text-2xl font-bold">{progress.groupsFormed}/{progress.totalStudents}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Mentors Allotted</div>
                <div className="text-2xl font-bold">{progress.mentorsAllotted}/{progress.totalGroups || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Synopses Approved</div>
                <div className="text-2xl font-bold">{progress.synopsesApproved || 0}/{progress.totalGroups || 0}</div>
              </div>
            </div>
            </div>
          </section>
        )}

        {/* Remaining Students */}
        {remainingStudents && remainingStudents.length > 0 && (
          <section className="mb-8 bg-white rounded-lg shadow-sm border border-yellow-200 border-l-4 border-l-yellow-500 overflow-hidden">
            <div className="px-6 py-4 border-b border-yellow-100 bg-yellow-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Remaining Students ({remainingStudents.length})</h2>
              <button
                onClick={() => setShowAutoGroup(!showAutoGroup)}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 font-medium"
              >
                {showAutoGroup ? 'Cancel' : 'Auto-Group Remaining'}
              </button>
              </div>
            </div>
            <div className="px-6 py-5">
              {showAutoGroup && (
              <div className="mb-4 p-4 bg-yellow-50 rounded">
                <p className="text-sm mb-3">This will automatically group remaining {remainingStudents.length} students</p>
                <button
                  onClick={() => autoGroupMutation.mutate()}
                  disabled={autoGroupMutation.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {autoGroupMutation.isPending ? 'Creating Groups...' : 'Confirm Auto-Group'}
                </button>
              </div>
              )}

              <div className="grid gap-2">
              {remainingStudents.slice(0, 10).map(s => (
                <div key={s._id} className="border p-3 rounded bg-gray-50">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-gray-600">{s.registrationNumber || s.email}</div>
                </div>
              ))}
              {remainingStudents.length > 10 && (
                <div className="text-sm text-gray-500">... and {remainingStudents.length - 10} more</div>
              )}
              </div>
            </div>
          </section>
        )}

        {/* Groups Summary */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Groups ({groups?.length || 0})</h2>
              {drive.currentStage === 'group-formation' && (
                <button
                  onClick={() => setShowAutoAllot(!showAutoAllot)}
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 font-medium"
                >
                  {showAutoAllot ? 'Cancel' : 'Auto-Allot Mentors'}
                </button>
              )}
            </div>
          </div>
          <div className="px-6 py-5">

            {showAutoAllot && (
            <div className="mb-4 p-4 bg-green-50 rounded">
              <p className="text-sm mb-3">This will allot mentors based on group creation timestamp and preferences</p>
              <button
                onClick={() => autoAllotMutation.mutate()}
                disabled={autoAllotMutation.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {autoAllotMutation.isPending ? 'Allotting...' : 'Confirm Auto-Allot'}
              </button>
            </div>
          )}

          <div className="grid gap-4">
            {groups?.map(g => (
              <div key={g._id} className="border p-4 rounded hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{g.name}</h3>
                    <p className="text-sm text-gray-600">Project: {g.projectTitle || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Members: {g.members?.length + 1 || 1}</p>
                    <p className="text-sm text-gray-600">Leader: {g.leader?.name || g.leader?.email}</p>
                    <p className="text-sm text-gray-600 font-medium">Mentor: {g.assignedMentor?.name || 'Not assigned'}</p>
                    <p className="text-xs text-gray-500 mt-1">Created: {new Date(g.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className={`text-xs font-medium px-3 py-1 rounded ${
                      g.status === 'mentor-assigned' ? 'bg-green-100 text-green-800' :
                      g.status === 'formed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {g.status === 'mentor-assigned' ? 'Mentor Assigned' : g.status === 'formed' ? 'Awaiting Mentor' : g.status}
                    </span>
                    <Link href={`/drives/${id}?group=${g._id}`}>
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium" title="View Group">
                        View
                      </button>
                    </Link>
                    {g.assignedMentor && (
                      <button
                        onClick={() => {
                          if (confirm(`Unassign mentor "${g.assignedMentor.name}" from group "${g.name}"?`)) {
                            unassignMentorMutation.mutate(g._id);
                          }
                        }}
                        disabled={unassignMentorMutation.isPending}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Unassign Mentor"
                      >
                        {unassignMentorMutation.isPending ? '⏳' : 'Unassign Mentor'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>
          </div>
        </div>
      </div>
    </ProtectedRole>
  );
}
