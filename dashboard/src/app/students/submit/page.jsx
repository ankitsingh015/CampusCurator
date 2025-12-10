'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import ProtectedRole from '@/components/ProtectedRole';
import { Card, CardBody, Button, Alert } from '@/components/UI';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function SubmitFile() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  // Stage 4: Synopsis / general file submission states
  const [submissionType, setSubmissionType] = useState('synopsis');
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  
  // Stage 5: Checkpoint submission states
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch user's groups (can belong to multiple drives)
  const { data: myGroups } = useQuery({
    queryKey: ['myGroups'],
    queryFn: async () => {
      const res = await api.get('/groups');
      return res.data?.data || res.data || [];
    },
    enabled: !!user
  });

  // Selected group
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const selectedGroup = myGroups?.find(g => g._id === selectedGroupId);

  // Fetch drive details
  const { data: driveData } = useQuery({
    queryKey: ['driveDetails', selectedGroup?.drive?._id || selectedGroup?.drive],
    queryFn: async () => {
      const driveId = selectedGroup.drive._id || selectedGroup.drive;
      const res = await api.get(`/drives/${driveId}`);
      return res.data; // api returns { success, data }
    },
    enabled: !!selectedGroup?.drive
  });

  // Fetch existing checkpoint submissions (Stage 5)
  const { data: submissionsData } = useQuery({
    queryKey: ['myCheckpoints'],
    queryFn: async () => {
      const res = await api.get('/checkpoints/my-submissions');
      return res.data;
    },
    enabled: !!user && !!selectedGroup && driveData?.currentStage === 'checkpoints'
  });

  // Default to first group when loaded
  useEffect(() => {
    if (!selectedGroupId && myGroups?.length) {
      setSelectedGroupId(myGroups[0]._id);
    }
  }, [myGroups, selectedGroupId]);

  // Stage 4: Synopsis submission mutation
  const synopsisMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('submissionType', submissionType);
      formData.append('description', description);
      formData.append('groupId', selectedGroup._id);
      formData.append('driveId', selectedGroup.drive._id || selectedGroup.drive);

      return api.post('/submissions', { body: formData });
    },
    onSuccess: () => {
      setSuccess('Synopsis submitted successfully!');
      setTimeout(() => {
        setFile(null);
        setDescription('');
        setSuccess('');
      }, 2000);
    },
    onError: (err) => {
      setError(err?.data?.message || err?.message || 'Failed to submit synopsis');
    }
  });

  // Stage 5: Checkpoint submission mutation
  const checkpointMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('groupId', selectedGroup._id);
      formData.append('driveId', selectedGroup.drive._id || selectedGroup.drive);
      formData.append('checkpointIndex', selectedCheckpoint.index);
      formData.append('title', title);
      formData.append('description', description);
      
      files.forEach((file) => {
        formData.append('files', file);
      });

      const res = await api.post('/checkpoints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccess('Checkpoint submitted successfully!');
      queryClient.invalidateQueries(['myCheckpoints']);
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setFiles([]);
        setSelectedCheckpoint(null);
        setSuccess('');
      }, 2000);
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to submit checkpoint');
    }
  });

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSynopsisSubmit = (e) => {
    e.preventDefault();
    if (!selectedGroup) {
      setError('Please select a group');
      return;
    }
    if (!file) {
      setError('Please select a file');
      return;
    }
    setError('');
    synopsisMutation.mutate();
  };

  const handleCheckpointSubmit = (e) => {
    e.preventDefault();
    if (!selectedCheckpoint) {
      setError('Please select a checkpoint');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a submission title');
      return;
    }
    if (files.length === 0) {
      setError('Please upload at least one file');
      return;
    }
    setError('');
    checkpointMutation.mutate();
  };

  const getSubmissionStatus = (checkpointIndex) => {
    const submission = submissionsData?.data?.find(
      s => s.checkpointIndex === checkpointIndex
    );
    return submission;
  };

  // Determine which stage we're in
  const currentStage = driveData?.currentStage;
  const isCheckpointStage = currentStage === 'checkpoints';
  const isSynopsisStage = currentStage === 'synopsis';

  return (
    <ProtectedRole allowedRole="student">
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {isCheckpointStage ? 'Submit Checkpoint' : 'Submit File'}
            </h1>
            <p className="text-gray-700 mb-8">
              {isCheckpointStage 
                ? 'Upload your checkpoint submissions for evaluation'
                : 'Upload synopsis, logbook, report, or presentation for review'}
            </p>

            {error && (
              <Alert variant="danger" className="mb-6">
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" className="mb-6">
                {success}
              </Alert>
            )}

            {myGroups?.length ? (
              <Card className="mb-6">
                <CardBody>
                  <label htmlFor="group-select" className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Group
                  </label>
                  <select
                    id="group-select"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Choose your group</option>
                    {myGroups.map(g => (
                      <option key={g._id} value={g._id}>
                        {g.name} {g.drive?.name ? `(${g.drive.name})` : ''}
                      </option>
                    ))}
                  </select>
                </CardBody>
              </Card>
            ) : null}

            {!myGroups?.length ? (
              <Card>
                <CardBody>
                  <Alert variant="info">
                    You need to join a group first to make submissions.
                  </Alert>
                </CardBody>
              </Card>
            ) : !selectedGroup ? (
              <Card>
                <CardBody>
                  <Alert variant="info">
                    Select a group to continue.
                  </Alert>
                </CardBody>
              </Card>
            ) : !driveData ? (
              <Card>
                <CardBody>
                  <Alert variant="info">
                    No active drive found for your group.
                  </Alert>
                </CardBody>
              </Card>
            ) : isCheckpointStage ? (
              // ===== STAGE 5: CHECKPOINT SUBMISSION =====
              <>
                {/* Available Checkpoints */}
                <Card className="mb-6">
                  <CardBody>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Available Checkpoints</h2>
                    {driveData.checkpoints?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {driveData.checkpoints.map((checkpoint, index) => {
                          const submission = getSubmissionStatus(index);
                          return (
                            <div
                              key={index}
                              onClick={() => !submission && setSelectedCheckpoint({ ...checkpoint, index })}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedCheckpoint?.index === index
                                  ? 'border-orange-500 bg-orange-50'
                                  : submission
                                  ? 'border-green-300 bg-green-50 cursor-not-allowed'
                                  : 'border-gray-300 hover:border-orange-300'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-900">{checkpoint.name}</h3>
                                {submission && (
                                  <span className="text-xs px-2 py-1 rounded bg-green-600 text-white">
                                    Submitted
                                  </span>
                                )}
                              </div>
                              {checkpoint.deadline && (
                                <p className="text-sm text-gray-600">
                                  Deadline: {new Date(checkpoint.deadline).toLocaleDateString()}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">Max Marks: {checkpoint.maxMarks}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600">No checkpoints available yet</p>
                    )}
                  </CardBody>
                </Card>

                {/* Checkpoint Submission Form */}
                {selectedCheckpoint && (
                  <Card>
                    <CardBody>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Submit: {selectedCheckpoint.name}
                      </h2>
                      <form onSubmit={handleCheckpointSubmit} className="space-y-6">
                        <div>
                          <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
                            Submission Title *
                          </label>
                          <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none text-gray-900 placeholder-gray-500 bg-white"
                            placeholder="e.g., Checkpoint 1 Report"
                          />
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                            Description
                          </label>
                          <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none resize-none text-gray-900 placeholder-gray-500 bg-white"
                            placeholder="Add any notes or context about your submission..."
                          />
                        </div>

                        <div>
                          <label htmlFor="files" className="block text-sm font-semibold text-gray-900 mb-2">
                            Upload Files * (PDF, ZIP, PPT, etc.)
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
                            <input
                              id="files"
                              type="file"
                              multiple
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <label htmlFor="files" className="cursor-pointer">
                              <div className="text-gray-600">
                                <p className="text-lg font-medium mb-1">Upload files</p>
                                <p className="text-sm">Click to upload multiple files</p>
                              </div>
                            </label>
                          </div>
                          
                          {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <span className="text-sm text-gray-900">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4">
                          <Button
                            type="submit"
                            disabled={checkpointMutation.isPending}
                            variant="primary"
                            className="flex-1"
                          >
                            {checkpointMutation.isPending ? 'Submitting...' : 'Submit Checkpoint'}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedCheckpoint(null);
                              setTitle('');
                              setDescription('');
                              setFiles([]);
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardBody>
                  </Card>
                )}

                {/* Previous Checkpoint Submissions */}
                {submissionsData?.data?.length > 0 && (
                  <Card className="mt-6">
                    <CardBody>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Your Submissions</h2>
                      <div className="space-y-4">
                        {submissionsData.data.map((submission) => (
                          <div key={submission._id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-gray-900">{submission.title}</h3>
                                <p className="text-sm text-gray-600">{submission.checkpointName}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                submission.status === 'evaluated' ? 'bg-green-600 text-white' :
                                submission.status === 'under-evaluation' ? 'bg-yellow-600 text-white' :
                                submission.status === 'submitted' ? 'bg-blue-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                {submission.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{submission.description}</p>
                            <p className="text-xs text-gray-500">
                              Submitted: {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700">Files:</p>
                              <ul className="list-disc list-inside text-sm text-gray-600">
                                {submission.files.map((file, idx) => (
                                  <li key={idx}>{file.fileName} ({file.fileType})</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </>
            ) : (
              // ===== STAGE 4: FILE/SYNOPSIS SUBMISSION =====
              <Card>
                <CardBody>
                  <form onSubmit={handleSynopsisSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="submission-type" className="block text-sm font-semibold text-gray-900 mb-2">
                        Submission Type *
                      </label>
                      <select
                        id="submission-type"
                        value={submissionType}
                        onChange={(e) => setSubmissionType(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none text-gray-900 bg-white"
                      >
                        <option value="synopsis">Synopsis</option>
                        <option value="logbook">Logbook</option>
                        <option value="report">Report</option>
                        <option value="ppt">PPT Presentation</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="file" className="block text-sm font-semibold text-gray-900 mb-2">
                        File *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer">
                        <input
                          id="file"
                          type="file"
                          onChange={(e) => setFile(e.target.files?.[0])}
                          required
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.webp,.mp4,.avi"
                          className="hidden"
                        />
                        <label htmlFor="file" className="cursor-pointer">
                          {file ? (
                            <div className="text-orange-600">
                              <p className="text-lg font-medium mb-1">File selected</p>
                              <p className="text-sm">{file.name}</p>
                            </div>
                          ) : (
                            <div className="text-gray-600">
                              <p className="text-lg font-medium mb-1">Upload file</p>
                              <p className="text-sm">Click to upload or drag and drop</p>
                            </div>
                          )}
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Allowed: pdf, doc, docx, ppt, pptx, zip, rar, jpg, jpeg, png, webp, mp4, avi</p>
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="4"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none resize-none text-gray-900 placeholder-gray-500 bg-white"
                        placeholder="Add any notes or context about your submission..."
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        disabled={synopsisMutation.isPending}
                        variant="primary"
                        className="flex-1"
                      >
                        {synopsisMutation.isPending ? 'Submitting...' : `Submit ${submissionType === 'synopsis' ? 'Synopsis' : 'File'}`}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => router.back()}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedRole>
  );
}
