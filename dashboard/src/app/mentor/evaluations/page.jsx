'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ProtectedRole from '@/components/ProtectedRole';
import { Card, CardHeader, CardBody, Badge, Button, LoadingSpinner, Alert } from '@/components/UI';

const backendBase = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/api$/, '');
const buildFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return backendBase ? `${backendBase}${url}` : url;
};

export default function Evaluations() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const qc = useQueryClient();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [editingEvaluationId, setEditingEvaluationId] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [feedback, setFeedback] = useState('');
  const [publish, setPublish] = useState(true);
  const [error, setError] = useState('');

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['mentorGroups'],
    queryFn: async () => {
      const res = await api.get('/groups');
      const myId = user?._id || user?.id;
      const list = res.data?.data || res.data || [];
      return list.filter(g => (g.assignedMentor?._id || g.assignedMentor)?.toString() === (myId || '').toString());
    },
    enabled: !!user
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['mentorPendingSubmissions'],
    queryFn: async () => {
      const res = await api.get('/submissions');
      return res.data?.data || res.data || [];
    },
    enabled: !!user,
    refetchInterval: 8000,
    onError: (err) => setError(err?.data?.message || err?.message || 'Unable to load submissions')
  });

  const driveIds = useMemo(() => Array.from(new Set((groups || []).map(g => g.drive?._id || g.drive).filter(Boolean))), [groups]);

  const { data: evalHistory, isLoading: evalHistoryLoading } = useQuery({
    queryKey: ['mentorEvalHistory', driveIds],
    queryFn: async () => {
      if (!driveIds.length) return [];
      const entries = await Promise.all(
        driveIds.map(async (id) => {
          const res = await api.get(`/evaluations/drive/${id}`);
          return res.data?.data || res.data || [];
        })
      );
      return entries.flat();
    },
    enabled: !!user && driveIds.length > 0
  });

  const evaluationMap = useMemo(() => {
    const map = {};
    (evalHistory || []).forEach(ev => {
      const subId = ev.submission?._id || ev.submission;
      if (subId) {
        map[subId.toString()] = ev;
      }
    });
    return map;
  }, [evalHistory]);

  const evaluationMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        submissionId: selectedSubmissionId,
        score: Number(score),
        maxScore: Number(maxScore) || 100,
        feedback
      };

      let evalData;
      if (editingEvaluationId) {
        const res = await api.put(`/evaluations/${editingEvaluationId}`, { body: payload });
        evalData = res.data?.data || res.data;
      } else {
        const res = await api.post('/evaluations', { body: payload });
        evalData = res.data?.data || res.data;
      }

      if (publish && evalData?._id) {
        await api.put(`/evaluations/${evalData._id}/finalize`);
      }
      return evalData;
    },
    onSuccess: () => {
      setScore('');
      setMaxScore('100');
      setFeedback('');
      setSelectedSubmissionId('');
      setEditingEvaluationId('');
      qc.invalidateQueries({ queryKey: ['mentorPendingSubmissions'] });
      qc.invalidateQueries({ queryKey: ['mentorEvalHistory'] });
      alert('Evaluation saved');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to save evaluation');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSubmissionId || !score) {
      alert('Select a submission and enter score');
      return;
    }
    evaluationMutation.mutate();
  };

  if (userLoading || groupsLoading || submissionsLoading) return <LoadingSpinner />;

  const pendingList = useMemo(() => {
    return (submissions || []).filter(s => s.status === 'accepted' && !evaluationMap[s._id]);
  }, [submissions, evaluationMap]);

  const selectedSubmission = pendingList.find(s => s._id === selectedSubmissionId);

  return (
    <ProtectedRole allowedRole="mentor">
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900">Evaluations</h1>
              <p className="text-gray-700 mt-2">Enter marks and feedback for student groups</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pending Submissions - Left */}
              <div className="lg:col-span-1">
                {error && (
                  <Alert variant="danger" className="mb-4">{error}</Alert>
                )}
                {(!pendingList || pendingList.length === 0) && (
                  <Card className="border border-dashed border-gray-300">
                    <CardBody>
                      <p className="text-sm text-gray-600">No accepted submissions found. Approve submissions first, then add marks.</p>
                    </CardBody>
                  </Card>
                )}
                {pendingList && pendingList.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h2 className="text-xl font-bold">Accepted Submissions</h2>
                      <p className="text-gray-600 text-sm mt-1">{pendingList.length} ready for marks</p>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-3">
                        {pendingList.map(s => (
                          <div 
                            key={s._id}
                            onClick={() => {
                              setSelectedSubmissionId(s._id);
                              setEditingEvaluationId('');
                              setScore('');
                              setMaxScore('100');
                              setFeedback('');
                            }}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedSubmissionId === s._id
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <p className="font-semibold text-sm uppercase text-gray-700">
                              {s.submissionType ? s.submissionType.toUpperCase() : 'SUBMISSION'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{s.group?.name || 'Group'}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(s.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>

              {/* Evaluation Form - Right */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <h2 className="text-2xl font-bold text-gray-900">Enter Evaluation</h2>
                    <p className="text-gray-600 mt-1">Select a pending submission, enter score, and publish.</p>
                  </CardHeader>
                  <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Selected submission details */}
                      {selectedSubmission ? (
                            <div className="p-4 rounded-lg border bg-gray-50">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">{selectedSubmission.submissionType?.toUpperCase() || 'SUBMISSION'}</Badge>
                            <Badge variant="info">{selectedSubmission.group?.name || 'Group'}</Badge>
                          </div>
                          <p className="text-sm text-gray-700 mt-2">Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                          {selectedSubmission[selectedSubmission.submissionType]?.fileUrl && (
                            <a
                              href={buildFileUrl(selectedSubmission[selectedSubmission.submissionType].fileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-orange-600 text-sm hover:underline mt-2 inline-block"
                            >
                              View File
                            </a>
                          )}
                          {(!selectedSubmission[selectedSubmission.submissionType]?.fileUrl && selectedSubmission.additionalFiles?.length) && (
                            <div className="mt-2 space-y-1">
                              {selectedSubmission.additionalFiles.map((f, idx) => (
                                <a
                                  key={idx}
                                  href={buildFileUrl(f.fileUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-orange-600 text-sm hover:underline block"
                                >
                                  {f.fileName || 'Attachment'}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Alert variant="info">Select a submission from the left to evaluate.</Alert>
                      )}

                      {/* Marks */}
                      <div>
                        <label htmlFor="score" className="block text-sm font-semibold text-gray-900 mb-2">
                          Score *
                        </label>
                        <div className="relative">
                          <input
                            id="score"
                            type="number"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            required
                            min="0"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none"
                            placeholder="Score"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="max-score" className="block text-sm font-semibold text-gray-900 mb-2">
                          Max Score *
                        </label>
                        <div className="relative">
                          <input
                            id="max-score"
                            type="number"
                            value={maxScore}
                            onChange={(e) => setMaxScore(e.target.value)}
                            required
                            min="1"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none"
                            placeholder="Max score"
                          />
                        </div>
                        {score && maxScore && (
                          <div className="mt-2 text-sm">
                            <p className="text-gray-600">
                              Percentage: <span className="font-semibold">{((Number(score) / Number(maxScore || 100)) * 100).toFixed(2)}%</span>
                            </p>
                            <p className="text-gray-600">
                              Grade: <span className={`font-semibold ${Number(score) >= 80 ? 'text-green-600' : Number(score) >= 60 ? 'text-blue-600' : 'text-orange-600'}`}>
                                {(() => {
                                  const pct = (Number(score) / Number(maxScore || 100)) * 100;
                                  if (pct >= 90) return 'A+';
                                  if (pct >= 80) return 'A';
                                  if (pct >= 70) return 'B+';
                                  if (pct >= 60) return 'B';
                                  if (pct >= 50) return 'C+';
                                  if (pct >= 40) return 'C';
                                  if (pct >= 33) return 'D';
                                  return 'F';
                                })()}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Feedback */}
                      <div>
                        <label htmlFor="feedback" className="block text-sm font-semibold text-gray-900 mb-2">
                          Feedback
                        </label>
                        <textarea
                          id="feedback"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows="5"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none resize-none"
                          placeholder="Provide constructive feedback to the group..."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id="publish"
                          type="checkbox"
                          checked={publish}
                          onChange={(e) => setPublish(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <label htmlFor="publish" className="text-sm text-gray-700">Publish to students (finalize)</label>
                      </div>

                      {/* Submit */}
                      <Button
                        type="submit"
                        disabled={evaluationMutation.isPending}
                        variant="primary"
                        size="lg"
                        className="w-full"
                      >
                        {evaluationMutation.isPending ? 'Saving...' : 'Save Evaluation'}
                      </Button>
                    </form>
                  </CardBody>
                </Card>
              </div>
            </div>

            {/* Evaluation history */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold text-gray-900">Recent Evaluations</h2>
                  <p className="text-gray-600 text-sm">Published and draft evaluations for your groups</p>
                </CardHeader>
                <CardBody>
                  {evalHistoryLoading ? (
                    <LoadingSpinner />
                  ) : evalHistory && evalHistory.length ? (
                    <div className="grid gap-3">
                      {evalHistory
                        .slice()
                        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
                        .map(ev => (
                          <div key={ev._id} className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">{ev.submission?.submissionType?.toUpperCase() || `Checkpoint ${ev.checkpointIndex ?? ''}`}</span>
                                <Badge variant={ev.isVisible ? 'success' : 'secondary'}>{ev.isVisible ? 'Published' : 'Draft'}</Badge>
                                <Badge variant="info">{ev.group?.name || 'Group'}</Badge>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Score: {ev.totalMarks}/{ev.maxMarks} • Grade: {ev.grade || '—'} • Updated {new Date(ev.updatedAt || ev.createdAt || Date.now()).toLocaleString()}
                              </p>
                              {ev.feedback && <p className="text-sm text-gray-700 mt-1 italic">"{ev.feedback}"</p>}
                            </div>
                            {ev.submission && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const existingScore = ev.totalMarks != null ? ev.totalMarks.toString() : '';
                                    const existingMax = ev.maxMarks != null ? ev.maxMarks.toString() : '100';
                                    setSelectedSubmissionId(ev.submission?._id || ev.submission);
                                    setEditingEvaluationId(ev._id);
                                    setScore(existingScore);
                                    setMaxScore(existingMax);
                                    setFeedback(ev.feedback || '');
                                    setPublish(true);
                                  }}
                                >
                                  Re-evaluate
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No evaluations yet.</p>
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
