'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ProtectedRole from '@/components/ProtectedRole';
import Link from 'next/link';
import { useState } from 'react';
import { Card, CardHeader, CardBody, CardFooter, Button, Badge, StatCard, LoadingSpinner, EmptyState } from '@/components/UI';

async function deleteDrive(driveId) {
  await api.del(`/drives/${driveId}`);
}

async function activateDrive(driveId) {
  const res = await api.put(`/drives/${driveId}`, { body: { status: 'active' } });
  return res.data || res;
}

export default function AdminDashboard() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState(null);
  const [activateError, setActivateError] = useState(null);
  const [statusChangeError, setStatusChangeError] = useState(null);

  const { data: drives, isLoading: drivesLoading } = useQuery({
    queryKey: ['allDrives'],
    queryFn: async () => {
      const res = await api.get('/drives');
      return res.data || [];
    },
    enabled: !!user
  });

  const { data: stats } = useQuery({
    queryKey: ['driveStats'],
    queryFn: async () => {
      const res = await api.get('/drives/stats');
      return res.data || {};
    },
    enabled: !!user
  });

  // Per-drive submission stats (groups submitted and status counts per type)
  const driveIds = Array.isArray(drives) ? drives.map(d => d._id) : [];
  const { data: submissionStats, isLoading: submissionStatsLoading } = useQuery({
    queryKey: ['submissionStats', driveIds],
    queryFn: async () => {
      if (!driveIds.length) return {};
      const entries = await Promise.all(
        driveIds.map(async (id) => {
          const res = await api.get(`/submissions/stats/${id}`);
          return [id, res.data?.data || res.data];
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: !!user && driveIds.length > 0
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDrive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDrives'] });
      queryClient.invalidateQueries({ queryKey: ['driveStats'] });
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(error.message || 'Failed to delete drive');
    }
  });

  const activateMutation = useMutation({
    mutationFn: activateDrive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDrives'] });
      queryClient.invalidateQueries({ queryKey: ['driveStats'] });
      setActivateError(null);
    },
    onError: (error) => {
      setActivateError(error.message || 'Failed to activate drive');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ driveId, status }) => {
      const res = await api.put(`/drives/${driveId}`, { body: { status } });
      return res.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDrives'] });
      queryClient.invalidateQueries({ queryKey: ['driveStats'] });
      setStatusChangeError(null);
    },
    onError: (error) => {
      setStatusChangeError(error.message || 'Failed to update status');
    }
  });

  const handleDelete = (driveId, driveName, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${driveName}"?\n\nThis will permanently delete:\n• The drive\n• All groups\n• All submissions\n• All evaluations\n\nThis action cannot be undone!`)) {
      deleteMutation.mutate(driveId);
    }
  };

  const handleActivate = (driveId, driveName, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Activate "${driveName}"?\n\nThis will make the drive visible to all students and allow them to submit their work.`)) {
      activateMutation.mutate(driveId);
    }
  };

  const handleStatusChange = (driveId, driveName, newStatus, currentStatus) => {
    if (newStatus === currentStatus) return;
    
    const statusMessages = {
      'draft': 'Draft - Drive will be hidden from students',
      'active': 'Active - Drive will be visible to students',
      'inactive': 'Inactive - Drive will be archived and read-only',
      'completed': 'Completed - Drive is finished'
    };

    if (confirm(`Change "${driveName}" status to ${newStatus.toUpperCase()}?\n\n${statusMessages[newStatus]}`)) {
      updateStatusMutation.mutate({ driveId, status: newStatus });
    }
  };

  if (userLoading || drivesLoading) return <LoadingSpinner />;

  const activeDrives = drives?.filter(d => d.status === 'active').length || 0;
  const completedDrives = drives?.filter(d => d.status === 'completed').length || 0;
  const totalGroups = stats?.totalGroups || 0;

  const formatSubmissionSummary = (driveId) => {
    const summary = submissionStats?.[driveId];
    if (!summary) return null;
    const total = summary.totalGroups || 0;
    const types = ['synopsis', 'logbook', 'report', 'ppt'];
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {types.map((type) => {
          const submitted = summary.groupsSubmitted?.[type] || 0;
          const statusCounts = summary.stats?.[type] || {};
          const accepted = statusCounts.accepted || 0;
          return (
            <span
              key={type}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold"
            >
              {type.toUpperCase()}: {submitted}/{total}
              {accepted > 0 && <Badge variant="success">{accepted} accepted</Badge>}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <ProtectedRole allowedRole="admin">
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-700 mt-2">Welcome back, {user?.name}</p>
              </div>
              <Link href="/admin/drives/new">
                <Button variant="primary" size="lg">
                  New Drive
                </Button>
              </Link>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                label="Total Drives" 
                value={drives?.length || 0} 
                color="blue"
              />
              <StatCard 
                label="Active" 
                value={activeDrives} 
                color="green"
              />
              <StatCard 
                label="Completed" 
                value={completedDrives} 
                color="emerald"
              />
              <StatCard 
                label="Total Groups" 
                value={totalGroups} 
                color="purple"
              />
            </div>

            {/* Error Messages */}
            {deleteError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                <p className="text-red-700 font-medium">Delete failed: {deleteError}</p>
                <button 
                  onClick={() => setDeleteError(null)}
                  className="text-sm text-red-600 underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {activateError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                <p className="text-red-700 font-medium">Activate failed: {activateError}</p>
                <button 
                  onClick={() => setActivateError(null)}
                  className="text-sm text-red-600 underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {statusChangeError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                <p className="text-red-700 font-medium">Status update failed: {statusChangeError}</p>
                <button 
                  onClick={() => setStatusChangeError(null)}
                  className="text-sm text-red-600 underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

          {/* Drives Section */}
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold text-gray-900">All Drives</h2>
              <p className="text-gray-700">Manage and monitor all active and completed drives</p>
            </CardHeader>
            <CardBody>
              {!drives?.length ? (
                <EmptyState 
                  title="No Drives Yet" 
                  message="Create your first drive to get started"
                />
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Drive Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Current Stage</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Submissions</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Year</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drives.map((drive, idx) => (
                      <tr 
                        key={drive._id} 
                        className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">{drive.name}</div>
                          <p className="text-sm text-gray-600 mt-1">{drive.description}</p>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={drive.status}
                            onChange={(e) => handleStatusChange(drive._id, drive.name, e.target.value, drive.status)}
                            disabled={updateStatusMutation.isPending}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              drive.status === 'active' 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                : drive.status === 'completed'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                : drive.status === 'inactive'
                                ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                            }`}
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {drive.currentStage?.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {submissionStatsLoading ? (
                            <span className="text-sm text-gray-500">Loading...</span>
                          ) : (
                            formatSubmissionSummary(drive._id) || <span className="text-sm text-gray-500">No submissions yet</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {drive.academicYear}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2 items-center">
                            <Link href={`/admin/drives/${drive._id}/manage`}>
                              <button className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition text-sm font-medium" title="Manage Drive">
                                ⚙️ Manage
                              </button>
                            </Link>
                            <button
                              onClick={(e) => handleDelete(drive._id, drive.name, e)}
                              disabled={deleteMutation.isPending}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              title="Delete Drive"
                            >
                              {deleteMutation.isPending && deleteMutation.variables === drive._id ? '⏳ Deleting...' : '🗑️ Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
          <CardFooter>
            <p className="text-sm text-gray-600">
              Showing {drives?.length || 0} drive{drives?.length !== 1 ? 's' : ''} • Last updated just now
            </p>
          </CardFooter>
        </Card>
          </div>
        </div>
      </div>
    </ProtectedRole>
  );
}
