'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ProtectedRole from '@/components/ProtectedRole';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Badge, StatCard, LoadingSpinner, EmptyState, Alert, Button } from '@/components/UI';
import { use, useState, useEffect } from 'react';

export default function GroupDetail({ params }) {
  const { id } = use(params);
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const qc = useQueryClient();
  const router = useRouter();
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState('');
  const [projectTitleInput, setProjectTitleInput] = useState('');
  const [projectDescriptionInput, setProjectDescriptionInput] = useState('');
  const [mentorChoices, setMentorChoices] = useState(['', '', '']);
  const [editing, setEditing] = useState(false);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const res = await api.get(`/groups/${id}`);
      return res.data || res;
    },
    enabled: !!id
  });

  useEffect(() => {
    if (group) {
      setProjectTitleInput(group.projectTitle || '');
      setProjectDescriptionInput(group.projectDescription || '');
      if (group.mentorPreferences && group.mentorPreferences.length > 0) {
        const sorted = [...group.mentorPreferences].sort((a, b) => (a.rank || 0) - (b.rank || 0));
        const seeds = sorted.slice(0, 3).map(p => p.mentor?._id || p.mentor || '');
        setMentorChoices([seeds[0] || '', seeds[1] || '', seeds[2] || '']);
      } else if (group.assignedMentor?._id) {
        setMentorChoices([group.assignedMentor._id, '', '']);
      } else {
        setMentorChoices(['', '', '']);
      }
      setEditing(false);
    }
  }, [group]);

  const { data: myGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['myGroups'],
    queryFn: async () => {
      const res = await api.get('/groups');
      return res.data || [];
    },
    enabled: !!user
  });

  const { data: mySubmissions } = useQuery({
    queryKey: ['mySubmissions'],
    queryFn: async () => {
      const res = await api.get('/submissions');
      return res.data || [];
    },
    enabled: !!user
  });

  const { data: myResults } = useQuery({
    queryKey: ['myResults'],
    queryFn: async () => {
      const res = await api.get('/results');
      return res.data || [];
    },
    enabled: !!user
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/groups/${id}/leave`);
      return res.data || res;
    },
    onSuccess: () => {
      setLeaveSuccess('You have left the group.');
      setLeaveError('');
      qc.invalidateQueries({ queryKey: ['group', id] });
      qc.invalidateQueries({ queryKey: ['myGroups'] });
      setTimeout(() => router.push('/drives'), 1200);
    },
    onError: (err) => {
      setLeaveSuccess('');
      setLeaveError(err.response?.data?.message || 'Unable to leave this group right now.');
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put(`/groups/${id}`, { body: payload });
      return res.data || res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', id] });
      alert('Group details updated');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Unable to update group');
    }
  });

  const manageRequestMutation = useMutation({
    mutationFn: async ({ memberId, action }) => {
      const res = await api.put(`/groups/${id}/members/${memberId}`, { body: { action } });
      return res.data || res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', id] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Unable to update member request');
    }
  });

  if (userLoading || groupLoading) return <LoadingSpinner />;
  if (!group) return <div className="w-full bg-gray-50 min-h-screen flex items-center justify-center"><p className="text-gray-600">Group not found</p></div>;

  const drives = [];
  const activeDrives = drives?.filter(d => d.status === 'active').length || 0;
  const userId = user?._id || user?.id;
  const isLeader = userId && group.leader?._id?.toString() === userId.toString();
  const isMember = userId && (group.members || []).some(m => (m.student?._id || m.student)?.toString() === userId.toString());
  const pendingMembers = (group.members || []).filter(m => m.status === 'pending');
  const mentorOptions = group.drive?.mentors || [];

  const filteredMentorsFor = (index) => {
    // Exclude only earlier selections so the current selection remains visible
    const taken = mentorChoices.slice(0, index).filter(Boolean).map(id => id.toString());
    return mentorOptions.filter(m => {
      const mid = (m._id || m.id || '').toString();
      return !taken.includes(mid);
    });
  };

  const updateMentorChoice = (index, value) => {
    const next = [...mentorChoices];
    next[index] = value;
    // Clear downstream duplicates
    for (let i = index + 1; i < next.length; i += 1) {
      if (next[i] && next.slice(0, i).includes(next[i])) {
        next[i] = '';
      }
    }
    setMentorChoices(next);
  };

  return (
    <ProtectedRole allowedRole="student">
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Back Link */}
            <Link href="/drives" className="text-orange-600 hover:text-orange-700 font-medium mb-6 inline-block">
              ← Back to Drives
            </Link>

            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{group.name}</h1>
              <p className="text-gray-700">{group.projectTitle || 'Project details not set'}</p>
            </div>

            {(leaveError || leaveSuccess) && (
              <div className="mb-6">
                {leaveError && <Alert variant="danger">{leaveError}</Alert>}
                {leaveSuccess && <Alert variant="success">{leaveSuccess}</Alert>}
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard 
                label="Group Members" 
                value={(group.members?.filter(m => m.status === 'accepted').length || 0) + 1} 
                color="blue"
              />
              <StatCard 
                label="Submissions" 
                value={mySubmissions?.filter(s => s.group === id)?.length || 0} 
                color="green"
              />
              <StatCard 
                label="Mentor" 
                value={group.assignedMentor?.name ? 'Assigned' : 'Pending'} 
                color="purple"
              />
              <StatCard 
                label="Results" 
                value={myResults?.filter(r => r.group === id)?.length || 0} 
                color="orange"
              />
            </div>

            {/* Group Details Section */}
            <Card className="mb-10">
              <CardHeader>
                <h2 className="text-2xl font-bold text-gray-900">Group Information</h2>
                <p className="text-gray-600">Team details and members</p>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Group Name</p>
                    <p className="text-lg font-semibold text-gray-900">{group.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Group Status</p>
                    <Badge variant={group.status === 'formed' ? 'success' : 'info'}>
                      {group.status || 'pending'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Project Title</p>
                    <p className="text-lg font-semibold text-gray-900">{group.projectTitle || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Assigned Mentor</p>
                    <p className="text-lg font-semibold text-gray-900">{group.assignedMentor?.name || 'Pending Assignment'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Project Description</p>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">{group.projectDescription || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Preferences Updated At</p>
                    <p className="text-sm text-gray-900">{group.preferenceUpdatedAt ? new Date(group.preferenceUpdatedAt).toLocaleString() : 'Not updated'}</p>
                  </div>
                </div>

                {isLeader && (
                  <div className="mt-6 flex items-center gap-3">
                    {!editing && (
                      <Button variant="outline" onClick={() => setEditing(true)}>Edit Details</Button>
                    )}
                    {editing && (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={() => {
                            updateGroupMutation.mutate({
                              projectTitle: projectTitleInput,
                              projectDescription: projectDescriptionInput,
                              mentorIds: mentorChoices.filter(Boolean)
                            });
                            setEditing(false);
                          }}
                          disabled={updateGroupMutation.isPending}
                        >
                          {updateGroupMutation.isPending ? 'Saving...' : 'Save Details'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setProjectTitleInput(group.projectTitle || '');
                            setProjectDescriptionInput(group.projectDescription || '');
                            if (group.mentorPreferences && group.mentorPreferences.length > 0) {
                              const sorted = [...group.mentorPreferences].sort((a, b) => (a.rank || 0) - (b.rank || 0));
                              const seeds = sorted.slice(0, 3).map(p => p.mentor?._id || p.mentor || '');
                              setMentorChoices([seeds[0] || '', seeds[1] || '', seeds[2] || '']);
                            } else if (group.assignedMentor?._id) {
                              setMentorChoices([group.assignedMentor._id, '', '']);
                            } else {
                              setMentorChoices(['', '', '']);
                            }
                            setEditing(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {isLeader && editing && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Set project title & mentor</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-700" htmlFor="project-title">Project Title</label>
                        <input
                          id="project-title"
                          value={projectTitleInput}
                          onChange={(e) => setProjectTitleInput(e.target.value)}
                          placeholder="Enter project title"
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <label className="text-sm text-gray-700" htmlFor="project-description">Project Description</label>
                        <textarea
                          id="project-description"
                          value={projectDescriptionInput}
                          onChange={(e) => setProjectDescriptionInput(e.target.value)}
                          placeholder="Short description (optional)"
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          rows={3}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-700" htmlFor="mentor-select">Select Mentor (from this drive)</label>
                        <select
                          id="mentor-select"
                          value={mentorChoices[0]}
                          onChange={(e) => updateMentorChoice(0, e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">Choose a mentor</option>
                          {filteredMentorsFor(0).map((m) => (
                            <option key={m._id || m.id} value={m._id || m.id}>
                              {m.name} {m.department ? `(${m.department})` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500">Mentor choice is stored as preference; final allotment may still be handled by admin.</p>
                        <label className="text-sm text-gray-700" htmlFor="mentor-select-2">2nd Preference (optional)</label>
                        <select
                          id="mentor-select-2"
                          value={mentorChoices[1]}
                          onChange={(e) => updateMentorChoice(1, e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">Choose a mentor</option>
                          {filteredMentorsFor(1).map((m) => (
                            <option key={m._id || m.id} value={m._id || m.id}>
                              {m.name} {m.department ? `(${m.department})` : ''}
                            </option>
                          ))}
                        </select>
                        <label className="text-sm text-gray-700" htmlFor="mentor-select-3">3rd Preference (optional)</label>
                        <select
                          id="mentor-select-3"
                          value={mentorChoices[2]}
                          onChange={(e) => updateMentorChoice(2, e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">Choose a mentor</option>
                          {filteredMentorsFor(2).map((m) => (
                            <option key={m._id || m.id} value={m._id || m.id}>
                              {m.name} {m.department ? `(${m.department})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(isLeader || isMember) && (
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => leaveMutation.mutate()}
                      disabled={leaveMutation.isPending}
                      className="text-red-600 border-red-300 hover:border-red-400 hover:bg-red-50"
                    >
                      {leaveMutation.isPending ? 'Leaving...' : isLeader ? 'Leave group (promote next leader)' : 'Leave group'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">You cannot leave after mentor allotment.</p>
                  </div>
                )}

                {/* Members List */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Team Members</h3>
                    {(group.invitationCode || group.inviteCode) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                        <p className="text-xs text-blue-600 font-semibold mb-1">Invite Code:</p>
                        <p className="text-sm font-mono text-blue-900">{group.invitationCode || group.inviteCode}</p>
                      </div>
                    )}
                  </div>

                  {isLeader && pendingMembers.length > 0 && (
                    <div className="mb-6 p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                      <p className="font-semibold text-yellow-800 mb-3">Pending join requests</p>
                      <div className="space-y-3">
                        {pendingMembers.map((m) => (
                          <div key={m._id} className="flex items-center justify-between gap-3 p-3 bg-white rounded border border-yellow-100">
                            <div>
                              <p className="font-semibold text-gray-900">{m.student?.name || 'Member'}</p>
                              <p className="text-sm text-gray-600">{m.student?.email || 'No email'}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => manageRequestMutation.mutate({ memberId: m._id, action: 'accept' })}
                                disabled={manageRequestMutation.isPending}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => manageRequestMutation.mutate({ memberId: m._id, action: 'reject' })}
                                disabled={manageRequestMutation.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">{group.leader?.name || 'Leader'}</p>
                        <p className="text-sm text-gray-600">{group.leader?.email}</p>
                      </div>
                      <Badge variant="success">Leader</Badge>
                    </div>
                    {group.members && group.members.length > 0 ? (
                      group.members.map((m, idx) => (
                        <div key={m._id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-900">{m.student?.name || m.name || 'Member'}</p>
                            <p className="text-sm text-gray-600">{m.student?.email || m.email}</p>
                          </div>
                          <Badge variant={m.status === 'accepted' ? 'success' : m.status === 'rejected' ? 'danger' : 'warning'}>
                            {m.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600 italic">No other members yet. Share the invite code above!</p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Submissions Section */}
            {mySubmissions && mySubmissions.filter(s => s.group === id).length > 0 && (
              <Card className="mb-10">
                <CardHeader>
                  <h2 className="text-2xl font-bold text-gray-900">Submissions</h2>
                  <p className="text-gray-600">Your checkpoint submissions and feedback</p>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4">
                    {mySubmissions.filter(s => s.group === id).map(s => (
                      <div 
                        key={s._id} 
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold uppercase text-sm text-gray-700">
                              {s.submissionType === 'logbook' && 'Logbook'}
                              {s.submissionType === 'report' && 'Report'}
                              {s.submissionType === 'ppt' && 'Presentation'}
                              {s.submissionType === 'synopsis' && 'Synopsis'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Submitted: {new Date(s.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={s.status === 'accepted' ? 'success' : s.status === 'rejected' ? 'danger' : 'warning'}>
                            {s.status}
                          </Badge>
                        </div>
                        {s.feedback && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-600 font-semibold mb-1">Feedback:</p>
                            <p className="text-sm text-blue-800">{s.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Results Section */}
            {myResults && myResults.filter(r => r.group === id).length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-2xl font-bold text-gray-900">Results</h2>
                  <p className="text-gray-600">Your evaluation results and marks</p>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4">
                    {myResults.filter(r => r.group === id).map(r => (
                      <div 
                        key={r._id} 
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{r.evaluationType || 'Evaluation'}</p>
                            <p className="text-sm text-gray-600 mt-1">By: {r.mentorName || 'Mentor'}</p>
                            {r.comments && (
                              <p className="text-sm text-gray-600 mt-2 italic">"{r.comments}"</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-orange-600">{r.marks || 'N/A'}</p>
                            <p className="text-xs text-gray-500">out of {r.totalMarks || 100}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRole>
  );
}
