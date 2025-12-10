'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ProtectedRole from '@/components/ProtectedRole';
import { Card, CardHeader, CardBody, CardFooter, Badge, Button, Alert, LoadingSpinner } from '@/components/UI';

const backendBase = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/api$/, '');
const buildFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return backendBase ? `${backendBase}${url}` : url;
};

export default function SynopsisReview() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [selectedSource, setSelectedSource] = useState('submission'); // unify around submissions
  const [feedback, setFeedback] = useState('');
  const [actionType, setActionType] = useState('approve');
  const [pendingError, setPendingError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: assignedGroups } = useQuery({
    queryKey: ['mentorGroups'],
    queryFn: async () => {
      const res = await api.get('/groups');
      const myId = user?._id || user?.id;
      const groups = res.data?.data || res.data || [];
      return groups.filter(g => (g.assignedMentor?._id || g.assignedMentor)?.toString() === (myId || '').toString());
    },
    enabled: !!user
  });

  // Pending submissions of any type for this mentor's groups
  const { data: pendingSubmissions } = useQuery({
    queryKey: ['pendingSubmissions'],
    queryFn: async () => {
      const res = await api.get('/submissions');
      const items = res.data?.data || res.data || [];
      return items.filter(s => ['submitted', 'under-review', 'revision-requested'].includes(s.status));
    },
    enabled: !!user,
    onError: (err) => {
      setPendingError(err?.data?.message || err?.message || 'Unable to load submissions');
    }
  });

  // History of all submissions (accepted/rejected etc.)
  const { data: historySubmissions } = useQuery({
    queryKey: ['historySubmissions'],
    queryFn: async () => {
      const res = await api.get('/submissions');
      return res.data?.data || res.data || [];
    },
    enabled: !!user
  });

  const { data: submissionData } = useQuery({
    queryKey: ['submissionDetail', selectedSubmissionId],
    queryFn: async () => {
      if (!selectedSubmissionId) return null;
      const res = await api.get(`/submissions/${selectedSubmissionId}`);
      return res.data?.data || res.data;
    },
    enabled: !!selectedSubmissionId
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/submissions/${selectedSubmissionId}/review`, {
        body: {
          status: actionType === 'approve' ? 'accepted' : 'rejected',
          feedback
        }
      });
    },
    onSuccess: () => {
      setFeedback('');
      setActionType('approve');
      setSelectedGroup('');
      setSelectedSubmissionId('');
      setSelectedSource('submission');
      qc.invalidateQueries({ queryKey: ['pendingSubmissions'] });
      qc.invalidateQueries({ queryKey: ['historySubmissions'] });
      qc.invalidateQueries({ queryKey: ['submissionDetail'] });
      alert('Review submitted successfully!');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to submit review');
    }
  });

  const handleReview = (e) => {
    e.preventDefault();
    if (!selectedGroup) {
      alert('Please select a group');
      return;
    }
    if (!submissionData) {
      alert('No submission loaded');
      return;
    }
    reviewMutation.mutate();
  };

  if (userLoading) return <LoadingSpinner />;

  const pendingFiltered = useMemo(() => {
    const items = pendingSubmissions || [];
    if (typeFilter === 'all') return items;
    return items.filter(s => s.submissionType === typeFilter);
  }, [pendingSubmissions, typeFilter]);

  const historyFiltered = useMemo(() => {
    const items = historySubmissions || [];
    if (typeFilter === 'all') return items;
    return items.filter(s => s.submissionType === typeFilter);
  }, [historySubmissions, typeFilter]);

  const selectedFiles = submissionData?.[submissionData?.submissionType] ? [submissionData[submissionData.submissionType]] : [];

  const statusVariant = (status) => {
    if (status === 'accepted' || status === 'approved') return 'success';
    if (status === 'rejected' || status === 'revision-requested' || status === 'changes_requested') return 'warning';
    if (status === 'submitted' || status === 'under-review' || status === 'under_review') return 'info';
    return 'secondary';
  };

  return (
    <ProtectedRole allowedRole="mentor">
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900">Submission Reviews</h1>
              <p className="text-gray-700 mt-2">Review and approve all student submissions (synopsis, logbook, report, ppt)</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pending List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-bold">Pending Reviews</h2>
                    <p className="text-gray-600 text-sm mt-1">{pendingFiltered?.length || 0} waiting</p>
                    <div className="mt-3">
                      <label className="text-xs text-gray-600">Filter by type</label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="all">All</option>
                        <option value="synopsis">Synopsis</option>
                        <option value="logbook">Logbook</option>
                        <option value="report">Report</option>
                        <option value="ppt">PPT</option>
                      </select>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {pendingError && (
                      <Alert variant="danger" className="mb-4">
                        {pendingError}
                      </Alert>
                    )}
                    {pendingFiltered && pendingFiltered.length > 0 ? (
                      <div className="space-y-3">
                        {pendingFiltered.map(s => (
                          <button
                            key={s._id}
                            onClick={() => {
                              setSelectedGroup(s.group?._id || s.group);
                              setSelectedSubmissionId(s._id);
                              setSelectedSource('submission');
                            }}
                            className={`w-full text-left p-4 rounded-lg border-l-4 transition-all ${
                              selectedSubmissionId === s._id
                                ? 'bg-orange-50 border-orange-500 shadow-md'
                                : 'bg-yellow-50 border-yellow-400 hover:shadow'
                            }`}
                          >
                            <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                              <span>{s.title || s.submissionType?.toUpperCase() || 'Submission'}</span>
                              <Badge variant={statusVariant(s.status)}>
                                {s.submissionType ? s.submissionType.toUpperCase() : 'FILE'}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">{s.group?.name || 'Group'}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{s.description || s.abstract || 'No description provided'}</div>
                            <div className="text-xs text-gray-500 mt-2">
                              {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—'}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No pending reviews</p>
                        <p className="text-xs text-gray-400 mt-2">All submissions have been reviewed</p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* Review Form */}
              <div className="lg:col-span-2">
                {submissionData ? (
                  <Card>
                    <CardHeader>
                      <h3 className="text-2xl font-bold text-gray-900">{submissionData?.title || submissionData?.submissionType?.toUpperCase() || 'Submission'}</h3>
                      <Badge variant={statusVariant(submissionData?.status)} className="mt-2 inline-block">{submissionData?.status || 'Under Review'}</Badge>
                    </CardHeader>
                    <CardBody>
                      <div className="mb-6 pb-6 border-b">
                        <p className="text-gray-700 leading-relaxed">{submissionData?.description || submissionData?.abstract || 'No description provided'}</p>
                        <div className="text-sm text-gray-500 mt-4 flex items-center gap-4">
                          <span>Submitted: {new Date(submissionData?.submittedAt || Date.now()).toLocaleDateString()}</span>
                          <span>Group: {submissionData?.group?.name || '—'}</span>
                          <span>Type: {submissionData?.submissionType?.toUpperCase?.() || '—'}</span>
                        </div>
                        {selectedFiles?.length > 0 && selectedFiles.map((file, idx) => (
                          <div className="mt-3" key={idx}>
                            <a
                              href={buildFileUrl(file.fileUrl)}
                              className="text-orange-600 text-sm hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open submitted file ({file.fileName || 'file'})
                            </a>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleReview}>
                        {/* Decision Radio */}
                        <div className="mb-6">
                          <label className="block text-sm font-semibold text-gray-900 mb-3">Your Decision *</label>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all" style={{borderColor: actionType === 'approve' ? '#10b981' : '#e5e7eb', backgroundColor: actionType === 'approve' ? '#f0fdf4' : '#f9fafb'}}>
                              <input
                                type="radio"
                                value="approve"
                                checked={actionType === 'approve'}
                                onChange={(e) => setActionType(e.target.value)}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium text-gray-900">Approve</p>
                                <p className="text-xs text-gray-600">Accept synopsis</p>
                              </div>
                            </label>
                            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all" style={{borderColor: actionType === 'reject' ? '#f97316' : '#e5e7eb', backgroundColor: actionType === 'reject' ? '#fff7ed' : '#f9fafb'}}>
                              <input
                                type="radio"
                                value="reject"
                                checked={actionType === 'reject'}
                                onChange={(e) => setActionType(e.target.value)}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium text-gray-900">Reject</p>
                                <p className="text-xs text-gray-600">Request revision</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Feedback */}
                        <div className="mb-6">
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Feedback {actionType === 'reject' && '*'}
                          </label>
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows="4"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none resize-none"
                            placeholder={actionType === 'reject' ? 'Provide specific feedback for revision...' : 'Optional feedback (suggestions, improvements)...'}
                            required={actionType === 'reject'}
                          />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                          <Button
                            type="submit"
                            disabled={reviewMutation.isPending}
                            variant={actionType === 'approve' ? 'success' : 'warning'}
                            size="md"
                            className="flex-1"
                          >
                            {reviewMutation.isPending ? 'Submitting...' : `${actionType === 'approve' ? 'Approve' : 'Reject'} & Submit`}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedGroup('');
                              setFeedback('');
                              setSelectedSubmissionId('');
                            }}
                            variant="outline"
                            size="md"
                            className="flex-1"
                          >
                            Clear
                          </Button>
                        </div>
                      </form>
                    </CardBody>
                  </Card>
                ) : (
                  <Card>
                    <CardBody>
                      <div className="text-center py-12">
                        <p className="text-lg text-gray-600 font-medium">No Submission Selected</p>
                        <p className="text-gray-500 mt-2">Select a pending review from the list to get started</p>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </div>

            {/* History */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-bold text-gray-900">Submission History</h3>
                  <p className="text-gray-600 text-sm">All submissions from your groups</p>
                </CardHeader>
                <CardBody>
                  {historyFiltered && historyFiltered.length > 0 ? (
                    <div className="grid gap-3">
                      {historyFiltered
                        .slice()
                        .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
                        .map(item => (
                          <div
                            key={item._id}
                            className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{item.title || item.submissionType?.toUpperCase() || 'Submission'}</span>
                                <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                                <Badge variant="secondary">{item.submissionType?.toUpperCase() || 'N/A'}</Badge>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.group?.name || 'Group'} • Submitted {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '—'}
                              </div>
                              {item.feedback && (
                                <div className="text-sm text-gray-700 mt-1 italic">"{item.feedback}"</div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {item[item.submissionType]?.fileUrl && (
                                <a
                                  href={buildFileUrl(item[item.submissionType].fileUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-orange-600 text-sm hover:underline"
                                >
                                  View File
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No submission history yet</div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRole>
  );
}
