'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Badge, LoadingSpinner, EmptyState, Button } from '@/components/UI';
import { useCurrentUser } from '@/lib/useCurrentUser';

async function fetchDrives() {
  const res = await api.get('/drives');
  return res.data || res.drives || res;
}

async function deleteDrive(driveId) {
  await api.del(`/drives/${driveId}`);
}

async function activateDrive(driveId) {
  const res = await api.put(`/drives/${driveId}`, { body: { status: 'active' } });
  return res.data || res;
}

export default function DrivesPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState(null);
  const [activateError, setActivateError] = useState(null);
  
  // Debug: log currentUser
  useEffect(() => {
    console.log('Current User:', currentUser);
  }, [currentUser]);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['drives'],
    queryFn: fetchDrives,
    staleTime: 1000 * 60 * 2
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDrive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drives'] });
      setDeleteError(null);
    },
    onError: (error) => {
      setDeleteError(error.message || 'Failed to delete drive');
    }
  });

  const activateMutation = useMutation({
    mutationFn: activateDrive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drives'] });
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

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="w-full px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Project Drives</h1>
          <p className="text-gray-700 mb-8">Browse and explore all available project drives</p>

          {isLoading && <LoadingSpinner />}
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
              <p className="text-red-700 font-medium">Error loading drives: {error.message}</p>
            </div>
          )}

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

          {data && data.length === 0 && (
            <EmptyState 
              title="No Drives Found" 
              message="Check back soon for new project drives"
            />
          )}

          {data && data.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.map(d => (
                <Card key={d._id} className="hover:shadow-lg transition-shadow h-full">
                  <CardBody>
                    <div className="flex items-start justify-between mb-3">
                      <Link href={`/drives/${d._id}`} className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 hover:text-teal-600 transition">{d.name}</h2>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant={d.status === 'active' ? 'success' : 'warning'}>
                          {d.status}
                        </Badge>
                        {currentUser?.role === 'admin' && (
                          <>
                            {d.status === 'draft' && (
                              <button
                                onClick={(e) => handleActivate(d._id, d.name, e)}
                                disabled={activateMutation.isPending}
                                className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                title="Activate Drive"
                              >
                                {activateMutation.isPending && activateMutation.variables === d._id ? (
                                  <span>⏳</span>
                                ) : (
                                  <span>✓ Activate</span>
                                )}
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(d._id, d.name, e)}
                              disabled={deleteMutation.isPending}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete Drive"
                            >
                              {deleteMutation.isPending && deleteMutation.variables === d._id ? (
                                <span className="text-xs">⏳</span>
                              ) : (
                                <span className="text-sm">🗑️</span>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <Link href={`/drives/${d._id}`}>
                      <p className="text-gray-600 text-sm mb-4">{d.description}</p>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Stage:</span>
                          <p className="font-semibold text-gray-900">{d.currentStage?.replace('-', ' ').toUpperCase()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Year:</span>
                          <p className="font-semibold text-gray-900">{d.academicYear}</p>
                        </div>
                      </div>
                    </Link>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}