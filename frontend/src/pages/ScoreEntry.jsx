import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import '../App.css'

function ScoreEntry({ user }) {
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  
  const [selectedTeacher, setSelectedTeacher] = useState(user?.teacher_code || '')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoom, setSelectedRoom] = useState('') 
  
  const [assignmentName, setAssignmentName] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [scores, setScores] = useState({}) 
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: teaData } = await supabase.from('teachers').select('*')
      const { data: subData } = await supabase.from('subjects').select('*')
      const { data: stuData } = await supabase.from('students').select('*').order('class_room')
      setTeachers(teaData || []); setSubjects(subData || []); setStudents(stuData || [])
    }
    fetchData()
  }, [])

  const filteredSubjects = useMemo(() => subjects.filter(s => selectedTeacher === '' || s.teacher_code === selectedTeacher), [subjects, selectedTeacher])
  const allRooms = useMemo(() => [...new Set(students.map(s => s.class_room))], [students])
  
  const filteredStudents = useMemo(() => selectedRoom === '' ? [] : students.filter(s => s.class_room === selectedRoom), [students, selectedRoom])

  // คำนวณจำนวนเด็กที่ "ต้องกรอกคะแนน" (ไม่รวมทวิภาคี)
  const scorableStudentsCount = useMemo(() => {
    return filteredStudents.filter(s => !s.is_dual_voc).length;
  }, [filteredStudents])

  // กรองห้องเรียนตาม "วิชาที่ถูกเลือก"
  const allowedRoomsForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    
    const activeSubject = subjects.find(s => s.subject_code === selectedSubject);
    if (!activeSubject) return [];
    
    if (!activeSubject.class_rooms) return allRooms;

    const allowed = activeSubject.class_rooms.split(',').map(r => r.trim().replace(/\s+/g, ''));
    return allRooms.filter(room => allowed.includes(room.replace(/\s+/g, '')));
  }, [selectedSubject, subjects, allRooms]);

  const handleScoreChange = (studentId, value) => {
    if (value === '') {
      setScores(prev => { const n = { ...prev }; delete n[studentId]; return n; }); return;
    }
    if (Number(value) > Number(maxScore)) return alert(`เกินคะแนนเต็ม (${maxScore})`);
    if (Number(value) < 0) return;
    setScores(prev => ({ ...prev, [studentId]: value }));
  }

  const handleSave = async () => {
    if (!selectedSubject || !selectedRoom || !assignmentName || !maxScore) return alert("กรุณากรอกข้อมูลให้ครบ");
    
    const logs = Object.keys(scores).map(studentId => ({
      date: selectedDate, 
      subject_code: selectedSubject, 
      student_id: studentId, 
      assignment_name: assignmentName, 
      score: Number(scores[studentId]), 
      max_score: Number(maxScore),
      recorded_by: user?.teacher_code || 'admin'
    }))
    
    if (logs.length === 0) return alert("ยังไม่ได้กรอกคะแนน");

    setLoading(true)
    const { error } = await supabase.from('student_scores').insert(logs)
    if (error) alert('Error: ' + error.message)
    else { 
      alert('บันทึกคะแนนเรียบร้อย!'); 
      setScores({}); 
      setAssignmentName(''); 
      setMaxScore(''); 
      setSelectedRoom(''); 
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      
      {/* 📌 CSS สำหรับแก้ปัญหา Dropdown และ Input ล้นกรอบบนมือถือ */}
      <style>{`
        @media (max-width: 600px) {
          .mobile-stack {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .mobile-stack > * {
            width: 100% !important;
            max-width: 100% !important; /* ป้องกันไม่ให้เกินขนาดของกรอบ */
            box-sizing: border-box !important; /* ให้คำนวณขนาดเส้นขอบรวมอยู่ใน 100% ด้วย */
            margin-left: 0 !important;
          }
        }
      `}</style>

      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>ระบบบันทึกคะแนน</h2>

      {/* ใช้คลาส mobile-stack เพื่อควบคุม Layout มือถือ */}
      <div className="glass-panel mobile-stack" style={{ padding: '25px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" className="glass-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        
        <select className="glass-input" value={selectedTeacher} onChange={(e) => { setSelectedTeacher(e.target.value); setSelectedSubject(''); setSelectedRoom(''); setScores({}); }} disabled={user?.role !== 'admin'}>
          <option value="">-- เลือกอาจารย์ --</option>
          {teachers.map(t => <option key={t.teacher_code} value={t.teacher_code}>{t.full_name}</option>)}
        </select>
        
        <select className="glass-input" value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedRoom(''); setScores({}); }} style={{ flex: 1 }}>
          <option value="">-- เลือกวิชา --</option>
          {filteredSubjects.map(sub => <option key={sub.subject_code} value={sub.subject_code}>{sub.subject_name}</option>)}
        </select>

        <select 
          className="glass-input" 
          value={selectedRoom} 
          onChange={(e) => { setSelectedRoom(e.target.value); setScores({}); }} 
          style={{ width: 'auto', minWidth: '150px' }}
          disabled={!selectedSubject}
        >
          <option value="">-- เลือกห้องเรียน --</option>
          {allowedRoomsForSubject.map(room => (
            <option key={room} value={room}>{room}</option>
          ))}
        </select>
      </div>

      {selectedRoom && (
        <div className="glass-card mobile-stack" style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#FF1493' }}>รายละเอียดชิ้นงาน:</span>
          <input className="glass-input" placeholder="ชื่อชิ้นงาน (เช่น สอบกลางภาค)" value={assignmentName} onChange={e => setAssignmentName(e.target.value)} style={{ flex: 1, minWidth: '200px' }} />
          <input type="number" className="glass-input" placeholder="คะแนนเต็ม" value={maxScore} onChange={e => setMaxScore(e.target.value)} style={{ width: '120px' }} />
        </div>
      )}

      {selectedRoom && assignmentName && maxScore && (
        <div className="glass-panel" style={{ padding: '20px', marginTop: '20px', background: '#ffffff', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            {/* แสดงยอดคนที่ต้องกรอก โดยหักคนที่เป็นทวิภาคีออกไปแล้ว */}
            <span style={{ fontWeight: 'bold', color: '#0056b3', fontSize: '16px' }}>กรอกแล้ว: {Object.keys(scores).length} / {scorableStudentsCount} คน</span>
            <span style={{ color: '#666', fontSize: '14px', fontWeight: '500' }}>ผู้บันทึก: {user?.full_name || 'Admin'}</span>
          </div>
          
          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', border: '1px solid #e5e7eb', minWidth: '400px' }}>
              <thead>
                <tr>
                  {/* ซ่อนรหัส และ ห้อง บนมือถือ (hide-on-mobile) */}
                  <th className="hide-on-mobile" style={{ padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', border: '1px solid #e5e7eb', width: '20%' }}>รหัส</th>
                  <th style={{ padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', border: '1px solid #e5e7eb', width: '35%' }}>ชื่อ-นามสกุล</th>
                  <th className="hide-on-mobile" style={{ padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', border: '1px solid #e5e7eb', width: '20%' }}>ห้อง</th>
                  
                  {/* ลบคอลัมน์ 'ระบบ' ออกไปแล้ว */}
                  
                  <th style={{ padding: '15px', backgroundColor: '#fdf2f8', color: '#9d174d', textAlign: 'center', border: '1px solid #e5e7eb', width: '25%' }}>คะแนน (เต็ม {maxScore})</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(stu => (
                  <tr key={stu.student_id} style={{ borderBottom: '1px solid #e5e7eb', background: stu.is_dual_voc ? '#f8fafc' : '#ffffff' }}>
                    <td className="hide-on-mobile" style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>{stu.student_id}</td>
                    <td style={{ padding: '15px', fontWeight: '500', border: '1px solid #e5e7eb' }}>{stu.full_name}</td>
                    <td className="hide-on-mobile" style={{ padding: '15px', textAlign: 'center', color: '#FF1493', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>{stu.class_room}</td>
                    
                    {/* ลบคอลัมน์ 'ระบบ' ออกไปแล้ว */}
                    
                    <td style={{ padding: '15px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                      {/* เช็คว่าเป็นทวิภาคีหรือไม่ ถ้าเป็นให้ซ่อนช่องกรอกคะแนน แล้วโชว์ข้อความแทน */}
                      {stu.is_dual_voc ? (
                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>ทวิภาคี (ไม่ต้องกรอก)</span>
                      ) : (
                        <input 
                          type="number" className="glass-input"
                          value={scores[stu.student_id] !== undefined ? scores[stu.student_id] : ''}
                          onChange={(e) => handleScoreChange(stu.student_id, e.target.value)}
                          style={{ width: '80px', textAlign: 'center', borderColor: scores[stu.student_id] !== undefined ? '#FF1493' : '#d1d5db', padding: '8px' }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ marginTop: '25px', width: '100%', fontSize: '18px', padding: '15px' }}>
            {loading ? 'กำลังบันทึก...' : '💾 บันทึกคะแนนทั้งหมด'}
          </button>
        </div>
      )}
    </div>
  )
}
export default ScoreEntry