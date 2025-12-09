'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ProtectedRole from '@/components/ProtectedRole';
import { Card, CardHeader, CardBody, CardFooter, Badge, StatCard, LoadingSpinner, EmptyState, Button } from '@/components/UI';

export default function MentorDashboard() {
  const { data: user, isLoading: userLoading } = useCurrentUser();

  const { data: assignedGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['mentorGroups', user?._id],
    queryFn: async () => {
      const res = await api.get('/groups');
      const groups = res.data || res.groups || res;
      const myId = user?._id || user?.id;
      return Array.isArray(groups)
        ? groups.filter(g => g.assignedMentor?._id === myId || g.assignedMentor === myId)
        : [];
    },
    enabled: !!user,
    refetchInterval: 5000, // Auto-refetch every 5 seconds to catch new assignments
    refetchOnWindowFocus: true
  });

  const { data: pendingSynopses } = useQuery({
    queryKey: ['pendingSynopses'],
    queryFn: async () => {
      const res = await api.get('/synopsis?status=under-review');
      return res.data || [];
    },
    enabled: !!user
  });

  const { data: allSubmissions } = useQuery({
    queryKey: ['mentorSubmissions'],
    queryFn: async () => {
      const res = await api.get('/submissions');
      return res.data || [];
    },
    enabled: !!user
  });

  if (userLoading || groupsLoading) return <LoadingSpinner />;

  // Filter submissions to only show those from mentor's assigned groups
  const groupIds = assignedGroups?.map(g => g._id?.toString()) || [];
  const filteredSubmissions = allSubmissions?.filter(s => {
    const sg = (s.group && s.group._id) ? s.group._id.toString() : s.group?.toString?.() || s.groupId?.toString?.();
    return sg && groupIds.includes(sg);
  }) || [];
  const acceptedSubmissions = filteredSubmissions.filter(s => s.status === 'accepted').length || 0;
  const submittedCount = filteredSubmissions.filter(s => s.status === 'submitted').length || 0;
  const pendingReviews = pendingSynopses?.length || 0;

  return (
    <ProtectedRole allowedRole="mentor">
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
              <p className="text-gray-700 mt-2">Department: <span className="font-semibold">{user?.department}</span></p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard
                label="Assigned Groups"
                value={assignedGroups?.length || 0}
                color="blue"
              />
              <StatCard
                label="Pending Reviews"
                value={pendingReviews}
                color="yellow"
              />
              <StatCard
                label="Submitted Files"
                value={submittedCount}
                color="green"
              />
              <StatCard
                label="Evaluations"
                value={assignedGroups?.length || 0}
                color="purple"
              />
            </div>

            {/* Assigned Groups Section */}
            <Card className="mb-10">
              <CardHeader>
                <h2 className="text-2xl font-bold text-gray-900">My Assigned Groups</h2>
                <p className="text-gray-600">Groups you are mentoring</p>
              </CardHeader>
              <CardBody>
                {!assignedGroups?.length ? (
                  <EmptyState
                    title="No Assigned Groups"
                    message="You will be assigned groups during the mentor allotment stage"
                  />
                ) : (
                  <div className="grid gap-6">
                    {assignedGroups.map(g => (
                      <div
                        key={g._id}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900">{g.name}</h3>
                            <p className="text-gray-600 text-sm mt-1">{g.projectTitle || 'Project title not set'}</p>
                          </div>
                          <Badge variant="success">Assigned</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-600">Members</p>
                            <p className="font-semibold text-gray-900">{(g.members?.filter(m => m.status === 'accepted').length || 0) + 1}/${g.maxMembers || 4}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Status</p>
                            <p className="font-semibold text-gray-900 capitalize">{g.status}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Allotted</p>
                            <p className="font-semibold text-gray-900">{new Date(g.mentorAllottedAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Created</p>
                            <p className="font-semibold text-gray-900">{new Date(g.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link href={`/mentor/evaluations?group=${g._id}`}>
                            <Button variant="secondary" size="sm">Enter Marks</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Pending Reviews Section */}
            {pendingReviews > 0 && (
              <Card className="mb-10">
                <CardHeader>
                  <h2 className="text-2xl font-bold text-gray-900">Pending Synopsis Reviews</h2>
                  <p className="text-gray-600">{pendingReviews} synopsis awaiting your review</p>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4">
                    {pendingSynopses?.map(s => (
                      <div
                        key={s._id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{s.title}</p>
                            <p className="text-sm text-gray-600 mt-1">Group: <span className="font-medium">{s.groupName || s.group}</span></p>
                            <p className="text-xs text-gray-500 mt-1">
                              Submitted: {new Date(s.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="warning">Under Review</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
                <CardFooter>
                  <Link href="/mentor/reviews">
                    <Button variant="primary" size="sm">Review All</Button>
                  </Link>
                </CardFooter>
              </Card>
            )}

            {/* Recent Submissions Section */}
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold text-gray-900">Recent Submissions</h2>
                <p className="text-gray-600">File submissions from your groups</p>
              </CardHeader>
              <CardBody>
                {filteredSubmissions && filteredSubmissions.length > 0 ? (
                  <div className="grid gap-4">
                    {filteredSubmissions.slice(0, 8).map(s => (
                      <div
                        key={s._id}
                        className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-semibold uppercase text-sm text-gray-700">
                            {s.submissionType ? s.submissionType.toUpperCase() : 'SUBMISSION'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—'}
                          </p>
                          {s.feedback && <p className="text-sm text-gray-600 mt-2 italic">"{s.feedback}"</p>}
                        </div>
                        <Badge variant={s.status === 'accepted' ? 'success' : s.status === 'rejected' ? 'danger' : 'warning'}>
                          {s.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No Recent Submissions"
                    message="Your assigned groups haven't submitted any files yet"
                  />
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRole>
  );
}