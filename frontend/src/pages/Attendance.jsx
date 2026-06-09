import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import '../App.css'

function Attendance({ user }) {
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  
  const [selectedTeacher, setSelectedTeacher] = useState(user?.teacher_code || '')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoom, setSelectedRoom] = useState('') 
  
  const [attendance, setAttendance] = useState({})
  const [isPreview, setIsPreview] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: teaData } = await supabase.from('teachers').select('*').order('full_name')
      const { data: subData } = await supabase.from('subjects').select('*')
      const { data: stuData } = await supabase.from('students').select('*').order('class_room')
      setTeachers(teaData || []); setSubjects(subData || []); setStudents(stuData || [])
    }
    fetchData()
  }, [])

  const filteredSubjects = useMemo(() => subjects.filter(s => selectedTeacher === '' || s.teacher_code === selectedTeacher), [subjects, selectedTeacher])
  const allRooms = useMemo(() => [...new Set(students.map(s => s.class_room))], [students])
  
  const filteredStudents = useMemo(() => selectedRoom === '' ? [] : students.filter(s => s.class_room === selectedRoom), [students, selectedRoom])

  const allowedRoomsForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    
    const activeSubject = subjects.find(s => s.subject_code === selectedSubject);
    if (!activeSubject) return [];
    
    if (!activeSubject.class_rooms) return allRooms;

    const allowed = activeSubject.class_rooms.split(',').map(r => r.trim().replace(/\s+/g, ''));
    return allRooms.filter(room => allowed.includes(room.replace(/\s+/g, '')));
  }, [selectedSubject, subjects, allRooms]);

  const handlePreview = () => {
    if (!selectedDate || !selectedTeacher || !selectedSubject) return alert("กรุณาเลือกข้อมูลให้ครบ")
    if (!selectedRoom) return alert("กรุณาเลือกห้องเรียน")
    
    const studentsToAttend = filteredStudents.filter(s => !s.is_dual_voc);
    if (Object.keys(attendance).length < studentsToAttend.length) return alert(`เช็คชื่อยังไม่ครบ!`)
    
    setIsPreview(true)
  }

  const handleSave = async () => {
    setLoading(true)
    const logs = Object.keys(attendance).map(studentId => ({ 
      date: selectedDate, 
      subject_code: selectedSubject, 
      student_id: studentId, 
      status: attendance[studentId],
      recorded_by: user?.teacher_code || 'admin'
    }))
    
    if (logs.length > 0) {
      const { error } = await supabase.from('attendance_logs').insert(logs)
      if (error) alert(error.message)
      else { 
        alert('บันทึกสำเร็จ!'); 
        setAttendance({}); 
        setSelectedRoom(''); 
        setIsPreview(false) 
      }
    } else {
      alert('บันทึกสำเร็จ! (ไม่มีข้อมูลให้บันทึก)');
      setAttendance({}); 
      setSelectedRoom(''); 
      setIsPreview(false);
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      
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
          }
        }
      `}</style>

      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>ระบบเช็คชื่อเข้าเรียน</h2>
      
      {!isPreview && (
        <div className="glass-panel mobile-stack" style={{ padding: '25px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" className="glass-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          
          <select className="glass-input" value={selectedTeacher} onChange={(e) => { setSelectedTeacher(e.target.value); setSelectedSubject(''); setSelectedRoom(''); setAttendance({}); }} disabled={user?.role !== 'admin'}>
            <option value="">-- เลือกอาจารย์ --</option>
            {teachers.map(t => <option key={t.teacher_code} value={t.teacher_code}>{t.full_name}</option>)}
          </select>

          <select className="glass-input" value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedRoom(''); setAttendance({}); }} style={{ flex: 1 }}>
            <option value="">-- เลือกวิชา --</option>
            {filteredSubjects.map(sub => <option key={sub.subject_code} value={sub.subject_code}>{sub.subject_name}</option>)}
          </select>

          <select 
            className="glass-input" 
            value={selectedRoom} 
            onChange={(e) => { setSelectedRoom(e.target.value); setAttendance({}); }} 
            style={{ width: 'auto', minWidth: '150px' }}
            disabled={!selectedSubject}
          >
            <option value="">-- เลือกห้องเรียน --</option>
            {allowedRoomsForSubject.map(room => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        </div>
      )}

      {selectedRoom && !isPreview && (
        <div className="glass-panel" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontWeight: 'bold', color: '#FF1493' }}>
              เช็คชื่อแล้ว: {Object.keys(attendance).length} / {filteredStudents.filter(s => !s.is_dual_voc).length} คน
            </span>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px', fontSize: '13.5px', background: '#f8fafc', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#11998e' }}></span> 
              <strong>มา:</strong> นักเรียนเข้าเรียนตามปกติ
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#f39c12' }}></span> 
              <strong>ลา:</strong> นักเรียนลากิจหรือลาป่วย
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#ff416c' }}></span> 
              <strong>ขาด:</strong> นักเรียนไม่ได้เข้าเรียน
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#333333' }}></span> 
              <strong>ละเว้น:</strong> นักเรียนที่จบ ปวช. มา ไม่ต้องเรียนวิชานี้
            </div>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
            <table className="glass-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="hide-on-mobile">รหัส</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th className="hide-on-mobile" style={{textAlign: 'center'}}>ห้อง</th>
                  <th style={{textAlign: 'center'}}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(stu => (
                  <tr key={stu.student_id} style={{ background: stu.is_dual_voc ? '#f1f5f9' : 'transparent', opacity: stu.is_dual_voc ? 0.7 : 1 }}>
                    <td className="hide-on-mobile">{stu.student_id}</td>
                    <td style={{ fontWeight: '500' }}>{stu.full_name}</td>
                    <td className="hide-on-mobile" style={{ textAlign: 'center', color: '#FF1493', fontWeight: 'bold' }}>{stu.class_room}</td>
                    <td style={{ textAlign: 'center' }}>
                      {stu.is_dual_voc ? (
                        <span style={{ color: '#64748b', fontStyle: 'italic', fontWeight: 'bold', fontSize: '13px' }}>นักเรียนทวิภาคี (ไม่ต้องเช็ค)</span>
                      ) : (
                        <div className="status-btn-container">
                          {['มา', 'ลา', 'ขาด', 'ละเว้น'].map(s => {
                            const isActive = attendance[stu.student_id] === s;
                            let activeStyle = {};
                            
                            if (isActive) {
                              if (s === 'มา') activeStyle = { background: 'linear-gradient(45deg, #11998e, #38ef7d)', color: 'white', border: 'none' };
                              if (s === 'ลา') activeStyle = { background: 'linear-gradient(45deg, #f39c12, #f1c40f)', color: 'white', border: 'none' };
                              if (s === 'ขาด') activeStyle = { background: 'linear-gradient(45deg, #ff416c, #ff4b2b)', color: 'white', border: 'none' };
                              if (s === 'ละเว้น') activeStyle = { background: 'linear-gradient(45deg, #434343, #000000)', color: 'white', border: 'none' };
                            }

                            return (
                              <button key={s} onClick={() => setAttendance({...attendance, [stu.student_id]: s})} 
                                className="btn-outline" 
                                style={{ ...activeStyle }}>
                                {s}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handlePreview} className="btn-primary" style={{ marginTop: '20px', width: '100%', fontSize: '18px' }}>
            ตรวจสอบก่อนส่ง
          </button>
        </div>
      )}

      {isPreview && (
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 className="text-gradient" style={{ textAlign: 'center' }}>พรีวิวการเช็คชื่อ</h3>
          <div className="glass-card">
            <p><strong>วันที่:</strong> {selectedDate}</p>
            <p><strong>วิชา:</strong> {subjects.find(s => s.subject_code === selectedSubject)?.subject_name}</p>
            <p><strong>ผู้บันทึก:</strong> {user?.full_name || 'Admin'}</p>
          </div>
          
          {Object.entries(filteredStudents.filter(s => !s.is_dual_voc).reduce((acc, stu) => {
             if (attendance[stu.student_id]) {
               if (!acc[stu.class_room]) acc[stu.class_room] = [];
               acc[stu.class_room].push({ ...stu, status: attendance[stu.student_id] });
             }
             return acc;
          }, {})).map(([room, stus]) => (
            <div key={room} className="glass-card" style={{ marginTop: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#FF1493' }}>ห้อง: {room}</h4>
              {stus.map(s => (
                <div key={s.student_id} style={{ borderBottom: '1px dashed rgba(0,0,0,0.1)', padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.student_id} {s.full_name}</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: s.status === 'มา' ? '#11998e' : s.status === 'ขาด' ? '#ff416c' : s.status === 'ละเว้น' ? '#434343' : '#f39c12' 
                  }}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
            <button onClick={() => setIsPreview(false)} className="btn-outline" style={{ flex: 1, padding: '12px' }}>ย้อนกลับไปแก้ไข</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ flex: 1, padding: '12px' }}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเข้าสู่ระบบ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default Attendance