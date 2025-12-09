'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Alert } from '@/components/UI';
import ProtectedRole from '@/components/ProtectedRole';

export default function NewDrivePage() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    academicYear: '',
    participatingBatches: '',
    maxGroupSize: 4,
    minGroupSize: 1,
    maxGroupsPerMentor: 6,
    participatingStudents: [],
    mentors: []
  });
  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableMentors, setAvailableMentors] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [mentorSearchTerm, setMentorSearchTerm] = useState('');
  const [manualStudentInput, setManualStudentInput] = useState('');
  const [manualMentorInput, setManualMentorInput] = useState('');
  const [err, setErr] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ students: '', mentors: '' });
  const router = useRouter();

  // Load available students and mentors
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load students from batch 2025 (you can make this dynamic based on participatingBatches)
        const studentsRes = await api.get('/users/students/batch/2025');
        setAvailableStudents(studentsRes.data || []);
        
        // Load mentors from Computer Science department
        const mentorsRes = await api.get('/users/mentors/department/Computer%20Science');
        setAvailableMentors(mentorsRes.data || []);
      } catch (error) {
        console.error('Failed to load data:', error);
        setErr('Failed to load students and mentors');
      }
    };
    loadData();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description,
        academicYear: form.academicYear,
        participatingBatches: form.participatingBatches.split(',').map(s => s.trim()),
        maxGroupSize: Number(form.maxGroupSize),
        minGroupSize: Number(form.minGroupSize),
        maxGroupsPerMentor: Number(form.maxGroupsPerMentor),
        participatingStudents: form.participatingStudents, // Array of student emails
        mentors: form.mentors // Array of mentor emails
      };
      const result = await api.post('/drives', { body: payload });
      console.log('Drive created:', result);
      router.push('/drives');
    } catch (error) {
      setErr(error.message || 'Failed to create drive');
    }
  };

  const toggleStudent = (studentEmail) => {
    setForm(prev => ({
      ...prev,
      participatingStudents: prev.participatingStudents.includes(studentEmail)
        ? prev.participatingStudents.filter(e => e !== studentEmail)
        : [...prev.participatingStudents, studentEmail]
    }));
  };

  const toggleMentor = (mentorEmail) => {
    setForm(prev => ({
      ...prev,
      mentors: prev.mentors.includes(mentorEmail)
        ? prev.mentors.filter(e => e !== mentorEmail)
        : [...prev.mentors, mentorEmail]
    }));
  };

  const selectAllStudents = () => {
    const filtered = filteredStudents;
    setForm(prev => ({
      ...prev,
      participatingStudents: [...new Set([...prev.participatingStudents, ...filtered.map(s => s.email)])]
    }));
  };

  const deselectAllStudents = () => {
    const filtered = filteredStudents;
    const filteredEmails = filtered.map(s => s.email);
    setForm(prev => ({
      ...prev,
      participatingStudents: prev.participatingStudents.filter(e => !filteredEmails.includes(e))
    }));
  };

  const selectAllMentors = () => {
    const filtered = filteredMentors;
    setForm(prev => ({
      ...prev,
      mentors: [...new Set([...prev.mentors, ...filtered.map(m => m.email)])]
    }));
  };

  const deselectAllMentors = () => {
    const filtered = filteredMentors;
    const filteredEmails = filtered.map(m => m.email);
    setForm(prev => ({
      ...prev,
      mentors: prev.mentors.filter(e => !filteredEmails.includes(e))
    }));
  };

  const handleStudentFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus(prev => ({ ...prev, students: 'Processing...' }));

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header if present
      const dataLines = lines[0].toLowerCase().includes('email') ? lines.slice(1) : lines;
      
      const parsedData = dataLines
        .map(line => {
          // Support CSV: email or name,email or email,name,batch
          const parts = line.split(',').map(p => p.trim());
          // Find email (contains @)
          const email = parts.find(p => p.includes('@'));
          const name = parts.find(p => !p.includes('@') && p.length > 0) || email?.split('@')[0];
          return email ? { email, name } : null;
        })
        .filter(item => item && item.email.includes('@'));

      if (parsedData.length === 0) {
        setUploadStatus(prev => ({ ...prev, students: '❌ No valid emails found in file' }));
        return;
      }

      // Add parsed data to available students (so they show up in the list)
      const newStudents = parsedData.map(item => ({
        _id: `uploaded-${item.email}`,
        email: item.email,
        name: item.name,
        registrationNumber: item.email.split('@')[0],
        batch: '2022',
        isUploaded: true
      }));

      setAvailableStudents(prev => {
        const existingEmails = prev.map(s => s.email);
        const uniqueNew = newStudents.filter(s => !existingEmails.includes(s.email));
        return [...prev, ...uniqueNew];
      });

      // Add to selected students
      setForm(prev => ({
        ...prev,
        participatingStudents: [...new Set([...prev.participatingStudents, ...parsedData.map(d => d.email)])]
      }));

      setUploadStatus(prev => ({ 
        ...prev, 
        students: `✅ ${parsedData.length} student(s) added from file` 
      }));

      // Clear after 3 seconds
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, students: '' }));
      }, 3000);

    } catch (error) {
      console.error('File upload error:', error);
      setUploadStatus(prev => ({ ...prev, students: '❌ Failed to process file' }));
    }
  };

  const handleMentorFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus(prev => ({ ...prev, mentors: 'Processing...' }));

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header if present
      const dataLines = lines[0].toLowerCase().includes('email') ? lines.slice(1) : lines;
      
      const parsedData = dataLines
        .map(line => {
          const parts = line.split(',').map(p => p.trim());
          const email = parts.find(p => p.includes('@'));
          const name = parts.find(p => !p.includes('@') && p.length > 0) || email?.split('@')[0];
          return email ? { email, name } : null;
        })
        .filter(item => item && item.email.includes('@'));

      if (parsedData.length === 0) {
        setUploadStatus(prev => ({ ...prev, mentors: '❌ No valid emails found in file' }));
        return;
      }

      // Add parsed data to available mentors
      const newMentors = parsedData.map(item => ({
        _id: `uploaded-${item.email}`,
        email: item.email,
        name: item.name,
        department: 'Uploaded',
        isUploaded: true
      }));

      setAvailableMentors(prev => {
        const existingEmails = prev.map(m => m.email);
        const uniqueNew = newMentors.filter(m => !existingEmails.includes(m.email));
        return [...prev, ...uniqueNew];
      });

      setForm(prev => ({
        ...prev,
        mentors: [...new Set([...prev.mentors, ...parsedData.map(d => d.email)])]
      }));

      setUploadStatus(prev => ({ 
        ...prev, 
        mentors: `✅ ${parsedData.length} mentor(s) added from file` 
      }));

      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, mentors: '' }));
      }, 3000);

    } catch (error) {
      console.error('File upload error:', error);
      setUploadStatus(prev => ({ ...prev, mentors: '❌ Failed to process file' }));
    }
  };

  // Filter students and mentors based on search
  const filteredStudents = availableStudents.filter(student => {
    const searchLower = studentSearchTerm.toLowerCase();
    return (
      student.name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.registrationNumber?.toLowerCase().includes(searchLower)
    );
  });

  const filteredMentors = availableMentors.filter(mentor => {
    const searchLower = mentorSearchTerm.toLowerCase();
    return (
      mentor.name?.toLowerCase().includes(searchLower) ||
      mentor.email?.toLowerCase().includes(searchLower) ||
      mentor.department?.toLowerCase().includes(searchLower)
    );
  });

  const addManualStudent = () => {
    const email = manualStudentInput.trim();
    if (!email || !email.includes('@')) {
      setUploadStatus(prev => ({ ...prev, students: '❌ Please enter a valid email' }));
      setTimeout(() => setUploadStatus(prev => ({ ...prev, students: '' })), 2000);
      return;
    }

    // Check if already exists
    if (availableStudents.some(s => s.email === email)) {
      setUploadStatus(prev => ({ ...prev, students: '⚠️ Student already in list' }));
      setTimeout(() => setUploadStatus(prev => ({ ...prev, students: '' })), 2000);
      return;
    }

    // Add to available students
    const newStudent = {
      _id: `manual-${email}`,
      email: email,
      name: email.split('@')[0],
      registrationNumber: email.split('@')[0],
      batch: '2022',
      isManual: true
    };

    setAvailableStudents(prev => [...prev, newStudent]);
    setForm(prev => ({
      ...prev,
      participatingStudents: [...prev.participatingStudents, email]
    }));

    setManualStudentInput('');
    setUploadStatus(prev => ({ ...prev, students: '✅ Student added manually' }));
    setTimeout(() => setUploadStatus(prev => ({ ...prev, students: '' })), 2000);
  };

  const addManualMentor = () => {
    const email = manualMentorInput.trim();
    if (!email || !email.includes('@')) {
      setUploadStatus(prev => ({ ...prev, mentors: '❌ Please enter a valid email' }));
      setTimeout(() => setUploadStatus(prev => ({ ...prev, mentors: '' })), 2000);
      return;
    }

    // Check if already exists
    if (availableMentors.some(m => m.email === email)) {
      setUploadStatus(prev => ({ ...prev, mentors: '⚠️ Mentor already in list' }));
      setTimeout(() => setUploadStatus(prev => ({ ...prev, mentors: '' })), 2000);
      return;
    }

    // Add to available mentors
    const newMentor = {
      _id: `manual-${email}`,
      email: email,
      name: email.split('@')[0],
      department: 'Manual',
      isManual: true
    };

    setAvailableMentors(prev => [...prev, newMentor]);
    setForm(prev => ({
      ...prev,
      mentors: [...prev.mentors, email]
    }));

    setManualMentorInput('');
    setUploadStatus(prev => ({ ...prev, mentors: '✅ Mentor added manually' }));
    setTimeout(() => setUploadStatus(prev => ({ ...prev, mentors: '' })), 2000);
  };

  const deleteStudent = (studentEmail) => {
    // Remove from available list
    setAvailableStudents(prev => prev.filter(s => s.email !== studentEmail));
    // Remove from selected list
    setForm(prev => ({
      ...prev,
      participatingStudents: prev.participatingStudents.filter(e => e !== studentEmail)
    }));
  };

  const deleteMentor = (mentorEmail) => {
    // Remove from available list
    setAvailableMentors(prev => prev.filter(m => m.email !== mentorEmail));
    // Remove from selected list
    setForm(prev => ({
      ...prev,
      mentors: prev.mentors.filter(e => e !== mentorEmail)
    }));
  };

  return (
    <ProtectedRole allowedRole="admin">
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="w-full px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Create New Drive</h1>
            <p className="text-gray-600 mb-8">Set up a new project drive with participants and configuration</p>

            {err && (
              <Alert variant="danger" className="mb-6">
                {err}
              </Alert>
            )}

            <form onSubmit={onSubmit} className="space-y-6">
              
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="drive-name" className="block text-sm font-semibold text-gray-900 mb-2">
                        Drive Name *
                      </label>
                      <input 
                        id="drive-name"
                        value={form.name} 
                        onChange={e=>setForm({...form, name:e.target.value})} 
                        placeholder="e.g., Mini Project Drive 2025" 
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" 
                        required 
                      />
                    </div>

                    <div>
                      <label htmlFor="academic-year" className="block text-sm font-semibold text-gray-900 mb-2">
                        Academic Year *
                      </label>
                      <input 
                        id="academic-year"
                        value={form.academicYear} 
                        onChange={e=>setForm({...form, academicYear:e.target.value})} 
                        placeholder="e.g., 2024-2025" 
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" 
                        required 
                      />
                    </div>

                    <div>
                      <label htmlFor="batches" className="block text-sm font-semibold text-gray-900 mb-2">
                        Participating Batches *
                      </label>
                      <input 
                        id="batches"
                        value={form.participatingBatches} 
                        onChange={e=>setForm({...form, participatingBatches:e.target.value})} 
                        placeholder="Comma-separated, e.g., 2025, 2026" 
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" 
                        required 
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                        Description *
                      </label>
                      <textarea 
                        id="description"
                        value={form.description} 
                        onChange={e=>setForm({...form, description:e.target.value})} 
                        placeholder="Describe the drive objectives and expectations" 
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none h-24" 
                        required 
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Configuration */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold text-gray-900">Configuration</h2>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="max-size" className="block text-sm font-semibold text-gray-900 mb-2">Max Group Size</label>
                      <input 
                        id="max-size"
                        type="number" 
                        value={form.maxGroupSize} 
                        onChange={e=>setForm({...form, maxGroupSize:e.target.value})} 
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" 
                        min="1" 
                        required 
                      />
                    </div>
                    <div>
                      <label htmlFor="min-size" className="block text-sm font-semibold text-gray-900 mb-2">Min Group Size</label>
                      <input 
                        id="min-size"
                        type="number" 
                        value={form.minGroupSize} 
                        onChange={e=>setForm({...form, minGroupSize:e.target.value})} 
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" 
                        min="1" 
                        required 
                      />
                    </div>
                    <div>
                      <label htmlFor="max-groups" className="block text-sm font-semibold text-gray-900 mb-2">Max Groups Per Mentor</label>
                      <input 
                        id="max-groups"
                        type="number" 
                        value={form.maxGroupsPerMentor} 
                        onChange={e=>setForm({...form, maxGroupsPerMentor:e.target.value})} 
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" 
                        min="1" 
                        required 
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Participating Students */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                      Participating Students 
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({form.participatingStudents.length} selected)
                      </span>
                    </h2>
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleStudentFileUpload}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition">
                          📄 Upload CSV
                        </span>
                      </label>
                    </div>
                  </div>
                  {uploadStatus.students && (
                    <div className="mt-2 text-sm text-gray-700 bg-blue-50 px-3 py-2 rounded">
                      {uploadStatus.students}
                    </div>
                  )}
                </CardHeader>
                <CardBody>
                  {/* Manual Add Student */}
                  <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      ➕ Add Student Manually
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Enter student email (e.g., 22bcs015@smvdu.ac.in)"
                        value={manualStudentInput}
                        onChange={(e) => setManualStudentInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addManualStudent()}
                        className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                      />
                      <Button
                        type="button"
                        onClick={addManualStudent}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-6"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Search and Actions */}
                  <div className="mb-4 space-y-3">
                    <input
                      type="text"
                      placeholder="🔍 Search by name, email, or registration number..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={selectAllStudents}
                        className="text-sm"
                      >
                        ✓ Select All {studentSearchTerm && `(${filteredStudents.length})`}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={deselectAllStudents}
                        className="text-sm"
                      >
                        ✗ Deselect All {studentSearchTerm && `(${filteredStudents.length})`}
                      </Button>
                      <div className="text-sm text-gray-600 flex items-center ml-auto">
                        Showing {filteredStudents.length} of {availableStudents.length} students
                      </div>
                    </div>
                  </div>

                  {/* Student List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border-2 border-gray-100 rounded-lg p-3">
                    {filteredStudents.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        {studentSearchTerm ? 'No students found matching your search' : 'No students available'}
                      </div>
                    ) : (
                      filteredStudents.map(student => (
                        <div key={student._id} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 transition">
                          <input
                            type="checkbox"
                            checked={form.participatingStudents.includes(student.email)}
                            onChange={() => toggleStudent(student.email)}
                            className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {student.name}
                              {student.isUploaded && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">CSV</span>}
                              {student.isManual && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Manual</span>}
                            </div>
                            <div className="text-sm text-gray-600">{student.email}</div>
                            <div className="text-xs text-gray-500">{student.registrationNumber}</div>
                          </div>
                          <div className="flex gap-1">
                            {form.participatingStudents.includes(student.email) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStudent(student.email);
                                }}
                                className="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded text-xs font-semibold transition"
                                title="Deselect"
                              >
                                ✓
                              </button>
                            )}
                            {(student.isUploaded || student.isManual) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete ${student.name} from the list permanently?`)) {
                                    deleteStudent(student.email);
                                  }
                                }}
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition"
                                title="Delete from list"
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* CSV Format Help */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-teal-600 hover:text-teal-700 font-semibold">
                      📋 CSV File Format Help
                    </summary>
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="font-semibold mb-2">Your CSV file should contain student emails. Supported formats:</p>
                      <pre className="bg-white p-2 rounded border text-xs">
<strong>Format 1: Email only</strong><br/>
email<br/>
22bcs015@smvdu.ac.in<br/>
22bcs016@smvdu.ac.in<br/>
<br/>
<strong>Format 2: Full details (SMVDU format)</strong><br/>
name,entryNo,email,batch<br/>
Ankit Kumar Singh,22bcs015,22bcs015@smvdu.ac.in,2022<br/>
Rahul Sharma,22bcs016,22bcs016@smvdu.ac.in,2022<br/>
<br/>
<strong>Format 3: Simplified</strong><br/>
name,email<br/>
Ankit Kumar Singh,22bcs015@smvdu.ac.in<br/>
Rahul Sharma,22bcs016@smvdu.ac.in
                      </pre>
                      <p className="text-xs text-gray-500 mt-2">💡 The system automatically extracts emails (text containing @) from any column</p>
                    </div>
                  </details>
                </CardBody>
              </Card>

              {/* Mentors */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                      Mentors 
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({form.mentors.length} selected)
                      </span>
                    </h2>
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleMentorFileUpload}
                          className="hidden"
                        />
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition">
                          📄 Upload CSV
                        </span>
                      </label>
                    </div>
                  </div>
                  {uploadStatus.mentors && (
                    <div className="mt-2 text-sm text-gray-700 bg-blue-50 px-3 py-2 rounded">
                      {uploadStatus.mentors}
                    </div>
                  )}
                </CardHeader>
                <CardBody>
                  {/* Manual Add Mentor */}
                  <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      ➕ Add Mentor Manually
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Enter mentor email (e.g., john.smith@smvdu.ac.in)"
                        value={manualMentorInput}
                        onChange={(e) => setManualMentorInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addManualMentor()}
                        className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                      />
                      <Button
                        type="button"
                        onClick={addManualMentor}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-6"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Search and Actions */}
                  <div className="mb-4 space-y-3">
                    <input
                      type="text"
                      placeholder="🔍 Search by name, email, or department..."
                      value={mentorSearchTerm}
                      onChange={(e) => setMentorSearchTerm(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={selectAllMentors}
                        className="text-sm"
                      >
                        ✓ Select All {mentorSearchTerm && `(${filteredMentors.length})`}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={deselectAllMentors}
                        className="text-sm"
                      >
                        ✗ Deselect All {mentorSearchTerm && `(${filteredMentors.length})`}
                      </Button>
                      <div className="text-sm text-gray-600 flex items-center ml-auto">
                        Showing {filteredMentors.length} of {availableMentors.length} mentors
                      </div>
                    </div>
                  </div>

                  {/* Mentor List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border-2 border-gray-100 rounded-lg p-3">
                    {filteredMentors.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        {mentorSearchTerm ? 'No mentors found matching your search' : 'No mentors available'}
                      </div>
                    ) : (
                      filteredMentors.map(mentor => (
                        <div key={mentor._id} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 transition">
                          <input
                            type="checkbox"
                            checked={form.mentors.includes(mentor.email)}
                            onChange={() => toggleMentor(mentor.email)}
                            className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {mentor.name}
                              {mentor.isUploaded && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">CSV</span>}
                              {mentor.isManual && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Manual</span>}
                            </div>
                            <div className="text-sm text-gray-600">{mentor.email}</div>
                            <div className="text-xs text-gray-500">{mentor.department}</div>
                          </div>
                          <div className="flex gap-1">
                            {form.mentors.includes(mentor.email) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMentor(mentor.email);
                                }}
                                className="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded text-xs font-semibold transition"
                                title="Deselect"
                              >
                                ✓
                              </button>
                            )}
                            {(mentor.isUploaded || mentor.isManual) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete ${mentor.name} from the list permanently?`)) {
                                    deleteMentor(mentor.email);
                                  }
                                }}
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition"
                                title="Delete from list"
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* CSV Format Help */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-teal-600 hover:text-teal-700 font-semibold">
                      📋 CSV File Format Help
                    </summary>
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="font-semibold mb-2">Your CSV file should contain mentor emails. Supported formats:</p>
                      <pre className="bg-white p-2 rounded border text-xs">
<strong>Format 1: Email only</strong><br/>
email<br/>
john.smith@smvdu.ac.in<br/>
sarah.jones@smvdu.ac.in<br/>
<br/>
<strong>Format 2: Full details</strong><br/>
name,email,department<br/>
Dr. John Smith,john.smith@smvdu.ac.in,Computer Science<br/>
Dr. Sarah Jones,sarah.jones@smvdu.ac.in,Mathematics<br/>
<br/>
<strong>Format 3: Simplified</strong><br/>
name,email<br/>
Dr. John Smith,john.smith@smvdu.ac.in<br/>
Dr. Sarah Jones,sarah.jones@smvdu.ac.in
                      </pre>
                      <p className="text-xs text-gray-500 mt-2">💡 The system automatically extracts emails (text containing @) from any column</p>
                    </div>
                  </details>
                </CardBody>
              </Card>
              
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={form.participatingStudents.length === 0 || form.mentors.length === 0}
                >
                  Create Drive
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRole>
  );
}