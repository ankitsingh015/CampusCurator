'use client';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, use } from 'react';
import Link from 'next/link';
import { Card, CardBody, Button, LoadingSpinner } from '@/components/UI';
import { useCurrentUser } from '@/lib/useCurrentUser';

async function fetchDrive(id) {
  const res = await api.get(`/drives/${id}`);
  return res.data || res.drive || res;
}

export default function DriveDetail({ params }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  
  const { data, isLoading } = useQuery({
    queryKey: ['drive', id],
    queryFn: () => fetchDrive(id)
  });

  const { data: myGroups } = useQuery({
    queryKey: ['myGroups'],
    queryFn: async () => {
      const res = await api.get('/groups');
      return res.data || [];
    },
    enabled: !!user
  });

  const { data: driveGroups } = useQuery({
    queryKey: ['driveGroups', id],
    queryFn: async () => {
      const res = await api.get(`/groups?drive=${id}`);
      return res.data || [];
    }
  });

  const { data: remainingStudents } = useQuery({
    queryKey: ['remainingStudents', id],
    queryFn: async () => {
      const res = await api.get(`/groups/remaining/${id}`);
      return res.data || [];
    },
    enabled: user?.role === 'admin'
  });

  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedGroupForMentor, setSelectedGroupForMentor] = useState(null);
  const [selectedMentor, setSelectedMentor] = useState('');
  const router = useRouter();

  const createGroupMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/groups`, { body: payload });
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drive', id] })
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/groups/join', { body: payload });
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drive', id] })
  });

  const allotMentorMutation = useMutation({
    mutationFn: async ({ groupId, mentorId }) => {
      const res = await api.put(`/groups/${groupId}/mentor`, { body: { mentorId } });
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driveGroups', id] });
      setSelectedGroupForMentor(null);
      setSelectedMentor('');
      alert('Mentor assigned successfully!');
    },
    onError: (err) => {
      alert('Error: ' + (err.message || 'Failed to assign mentor'));
    }
  });

  const handleAssignMentor = async () => {
    if (!selectedGroupForMentor || !selectedMentor) {
      alert('Please select both group and mentor');
      return;
    }
    await allotMentorMutation.mutateAsync({ groupId: selectedGroupForMentor, mentorId: selectedMentor });
  };

  if (isLoading) return <div className="w-full bg-gray-50 min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!data) return <div className="w-full bg-gray-50 min-h-screen flex items-center justify-center"><p className="text-gray-600">Drive not found</p></div>;

  const drive = data.data || data.drive || data;
  const isAlreadyInGroup = myGroups?.some(g => (g.drive?._id || g.drive) === id);

  const onCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await createGroupMutation.mutateAsync({ driveId: id, name, maxMembers: drive.maxGroupSize });
      setName('');
      router.push('/drives');
    } catch (err) {
      alert(err.message || 'Failed to create group');
    }
  };

  const onJoin = async (e) => {
    e.preventDefault();
    try {
      await joinGroupMutation.mutateAsync({ inviteCode, driveId: id });
      setInviteCode('');
      alert('Join request submitted');
    } catch (err) {
      alert(err.message || 'Failed to join group');
    }
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="w-full px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{drive.name}</h1>
              <p className="text-gray-700 mb-4">{drive.description}</p>
              <div className="text-sm text-gray-500">Current Stage: <span className="font-semibold text-gray-700">{drive.currentStage?.replace('-', ' ').toUpperCase()}</span></div>
            </div>
            <Link href="/drives" className="text-orange-500 hover:text-orange-600 font-medium">Back to Drives</Link>
          </div>

          {/* ADMIN VIEW */}
          {user?.role === 'admin' ? (
            <div className="space-y-8 mb-8">
              {/* Formed Groups */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Formed Groups ({(driveGroups || []).length})</h2>
                {(driveGroups || []).length === 0 ? (
                  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800">No groups formed yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {(driveGroups || []).map((g, idx) => (
                      <Card key={g._id} className="border-l-4 border-green-500">
                        <CardBody>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-900">Group {idx + 1}: {g.name}</h3>
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-gray-600">Members: <span className="font-semibold">{(g.members?.length || 0) + 1}/{drive.maxGroupSize}</span></p>
                                <p className="text-sm text-gray-600">Leader: <span className="font-semibold">{g.leader?.name || g.leaderName || 'Unknown'}</span></p>
                                <p className="text-sm text-gray-600">Status: <span className={`font-semibold ${g.assignedMentor ? 'text-green-600' : 'text-yellow-600'}`}>{g.assignedMentor ? 'Mentor Assigned' : 'Awaiting Mentor'}</span></p>
                                {g.assignedMentor && <p className="text-sm text-gray-600">Mentor: <span className="font-semibold">{g.assignedMentor?.name || 'N/A'}</span></p>}
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-600 font-semibold mb-2">Members:</p>
                                <ul className="space-y-1">
                                  <li className="text-sm text-gray-700">• {g.leader?.name || g.leaderName || 'Unknown'} (Leader)</li>
                                  {g.members?.map(m => <li key={m._id} className="text-sm text-gray-700">• {m.student?.name || m.name || 'Member'}</li>)}
                                </ul>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-col items-end">
                              <Link href={`/groups/${g._id}`} className="text-orange-500 hover:text-orange-600 font-medium whitespace-nowrap">View →</Link>
                              {!g.assignedMentor && (
                                <button 
                                  onClick={() => setSelectedGroupForMentor(g._id)}
                                  className="text-white bg-orange-500 hover:bg-orange-600 font-medium px-3 py-1 rounded text-sm whitespace-nowrap transition"
                                >
                                  Assign Mentor
                                </button>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Remaining Students */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Remaining Students ({(remainingStudents || []).length})</h2>
                  {(remainingStudents || []).length > 0 && (
                    <Button variant="primary" onClick={() => {
                      api.post(`/groups/auto-group/${id}`, { body: {} })
                        .then(() => {
                          alert('Students auto-grouped successfully!');
                          qc.invalidateQueries({ queryKey: ['driveGroups', id] });
                          qc.invalidateQueries({ queryKey: ['remainingStudents', id] });
                        })
                        .catch(err => alert('Error: ' + (err.message || 'Failed to auto-group')));
                    }}>
                      Auto-Group Remaining
                    </Button>
                  )}
                </div>
                {(remainingStudents || []).length === 0 ? (
                  <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">All students have been grouped!</p>
                  </div>
                ) : (
                  <Card>
                    <CardBody>
                      <div className="space-y-2">
                        {(remainingStudents || []).map(s => (
                          <div key={s._id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                            <div>
                              <p className="font-medium text-gray-900">{s.name}</p>
                              <p className="text-sm text-gray-600">{s.email}</p>
                            </div>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">No Group</span>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* STUDENT VIEW */}
              {!isAlreadyInGroup ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Card>
                    <CardBody>
                      <h2 className="text-lg font-bold text-gray-900 mb-4">Create Group</h2>
                      <form onSubmit={onCreateGroup} className="space-y-4">
                        <div>
                          <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                          <input id="group-name" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Enter group name" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none" />
                          <p className="text-xs text-gray-500 mt-1">Max members: {drive.maxGroupSize}</p>
                        </div>
                        <Button type="submit" variant="primary" className="w-full">Create Group</Button>
                      </form>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody>
                      <h2 className="text-lg font-bold text-gray-900 mb-4">Join Group</h2>
                      <form onSubmit={onJoin} className="space-y-4">
                        <div>
                          <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700 mb-1">Invitation Code</label>
                          <input id="invite-code" value={inviteCode} onChange={(e)=>setInviteCode(e.target.value)} placeholder="Enter invite code" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none" />
                        </div>
                        <Button type="submit" variant="primary" className="w-full">Request to Join</Button>
                      </form>
                    </CardBody>
                  </Card>
                </div>
              ) : (
                <div className="mb-8 p-6 bg-green-50 border-l-4 border-green-500 rounded-lg">
                  <p className="text-green-800 font-medium">You are already part of a group in this drive. You can view your group details in the "My Groups" section.</p>
                </div>
              )}

              {/* Existing Groups for Students */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Existing Groups</h2>
                {(driveGroups || []).length === 0 ? (
                  <p className="text-gray-500">No groups yet. Create one or join an existing group!</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {(driveGroups || []).map(g => (
                      <Card key={g._id}>
                        <CardBody>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900">{g.name}</h3>
                              <p className="text-sm text-gray-600">Project: {g.projectTitle || 'N/A'}</p>
                              <p className="text-sm text-gray-600">Members: {(g.members?.length || 0) + 1} / {g.maxMembers || 4}</p>
                              <p className="text-sm text-gray-600">Leader: {g.leaderName || g.leader?.name || 'Unknown'}</p>
                              {(g.invitationCode || g.inviteCode) && (
                                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                  <p className="text-xs text-blue-600 font-semibold mb-1">Invite Code:</p>
                                  <p className="text-sm font-mono text-blue-900">{g.invitationCode || g.inviteCode}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 flex-col">
                              <Link href={`/groups/${g._id}`} className="text-orange-500 hover:text-orange-600 font-medium text-sm">View Details</Link>
                              {(g.invitationCode || g.inviteCode) && (
                                <button onClick={() => {
                                  navigator.clipboard.writeText(g.invitationCode || g.inviteCode);
                                  alert('Invite code copied to clipboard!');
                                }} className="text-blue-500 hover:text-blue-600 font-medium text-sm">
                                  Copy Code
                                </button>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* MENTOR ASSIGNMENT MODAL */}
          {selectedGroupForMentor && user?.role === 'admin' && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md">
                <CardBody>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Assign Mentor to Group</h3>
                    <p className="text-sm text-gray-600 mt-1">Select a mentor for this group</p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mentors Available
                    </label>
                    <select 
                      value={selectedMentor}
                      onChange={(e) => setSelectedMentor(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none"
                    >
                      <option value="">Select a mentor...</option>
                      {drive.mentors?.map(mentor => (
                        <option key={mentor._id} value={mentor._id}>
                          {mentor.name} ({mentor.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => {
                        setSelectedGroupForMentor(null);
                        setSelectedMentor('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <Button 
                      variant="primary"
                      onClick={handleAssignMentor}
                      disabled={!selectedMentor || allotMentorMutation.isPending}
                    >
                      {allotMentorMutation.isPending ? 'Assigning...' : 'Assign'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}