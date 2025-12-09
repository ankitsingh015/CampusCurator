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

  if (userLoading || drivesLoading) return <LoadingSpinner />;

  const activeDrives = drives?.filter(d => d.status === 'active').length || 0;
  const completedDrives = drives?.filter(d => d.status === 'completed').length || 0;
  const totalGroups = stats?.totalGroups || 0;

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
                          <Badge variant={drive.status === 'active' ? 'success' : drive.status === 'completed' ? 'info' : 'warning'}>
                            {drive.status.charAt(0).toUpperCase() + drive.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {drive.currentStage?.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {drive.academicYear}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            {drive.status === 'draft' && (
                              <button
                                onClick={(e) => handleActivate(drive._id, drive.name, e)}
                                disabled={activateMutation.isPending}
                                className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                title="Activate Drive"
                              >
                                {activateMutation.isPending && activateMutation.variables === drive._id ? '⏳' : '✓ Activate'}
                              </button>
                            )}
                            <Link href={`/admin/drives/${drive._id}/manage`}>
                              <Button variant="outline" size="sm">Manage</Button>
                            </Link>
                            <Link href={`/drives/${drive._id}`}>
                              <Button variant="secondary" size="sm">View</Button>
                            </Link>
                            <button
                              onClick={(e) => handleDelete(drive._id, drive.name, e)}
                              disabled={deleteMutation.isPending}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Drive"
                            >
                              {deleteMutation.isPending && deleteMutation.variables === drive._id ? '⏳' : '🗑️'}
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
