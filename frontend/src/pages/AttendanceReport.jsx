import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx';
import '../App.css'

function AttendanceReport({ user }) {
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [logs, setLogs] = useState([])
  
  const [selectedTeacher, setSelectedTeacher] = useState(user?.role !== 'admin' && user?.teacher_code ? user.teacher_code : '')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('')
  
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: t } = await supabase.from('teachers').select('*').order('full_name')
      const { data: s } = await supabase.from('subjects').select('*')
      const { data: st } = await supabase.from('students').select('*').order('class_room')
      setTeachers(t || []); setSubjects(s || []); setStudents(st || [])
    }
    fetchData()
  }, [])

  const filteredSubjects = useMemo(() => subjects.filter(s => selectedTeacher === '' || s.teacher_code === selectedTeacher), [subjects, selectedTeacher])

  // ดึงรายชื่อห้องทั้งหมดสำรองไว้
  const allAvailableRooms = useMemo(() => {
    return [...new Set(students.map(s => s.class_room).filter(Boolean))].sort()
  }, [students])

  // ดึงรายชื่อห้องเฉพาะวิชาที่เลือก
  const availableRoomsForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    const subject = subjects.find(s => s.subject_code === selectedSubject);
    
    // ถ้าวิชานั้นมีการระบุห้องเรียนไว้ ให้ตัดคำด้วย , แล้วนำมาแสดง
    if (subject && subject.class_rooms) {
       return subject.class_rooms.split(',').map(r => r.trim()).filter(Boolean).sort();
    }
    // ถ้าไม่ได้ระบุห้องเรียนในวิชา ให้แสดงห้องทั้งหมดแทน
    return allAvailableRooms;
  }, [selectedSubject, subjects, allAvailableRooms]);

  const fetchReport = async () => {
    if (!selectedSubject) return alert("กรุณาเลือกวิชา")
    if (!selectedRoomFilter) return alert("กรุณาเลือกห้องเรียน")
    
    setLoading(true)
    setHasSearched(true)
    const { data } = await supabase.from('attendance_logs').select('*, created_at').eq('subject_code', selectedSubject).order('created_at', { ascending: true })
    setLogs(data || [])
    setLoading(false)
  }

  const handleDeleteBatch = async (date, createdAt) => {
    if (!window.confirm(`ยืนยันการลบข้อมูลการเช็คชื่อของวันที่ ${date}?`)) return;
    const { error } = await supabase.from('attendance_logs').delete().eq('date', date).eq('created_at', createdAt);
    if (error) alert("ลบไม่สำเร็จ: " + error.message);
    else { alert("ลบข้อมูลเรียบร้อย"); fetchReport(); }
  };

  const exportExcel = () => {
    if (!reportData || !selectedRoomFilter) return alert("กรุณาเลือกห้องเรียนก่อน Export");
    const wb = XLSX.utils.book_new();

    const room = selectedRoomFilter;
    const roomObj = reportData.result[room];
    if (!roomObj) return;

    const wsData = roomObj.students.map(s => {
      let row = { รหัส: s.student_id, ชื่อ: s.full_name };
      
      roomObj.dates.forEach((date, i) => {
        row[date] = s.dateColumns[i] ? s.dateColumns[i].text : '-';
      });
      
      row['มา/ลา (%)'] = s.presentPercent + '%';
      row['ขาด (%)'] = s.absentPercent + '%';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const safeSheetName = room.replace(/\//g, '-'); 
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName); 

    XLSX.writeFile(wb, `สรุปเวลาเรียน_${selectedSubject}_${safeSheetName}.xlsx`);
  };

  const reportData = useMemo(() => {
    if (logs.length === 0) return null
    const activeRooms = [...new Set(students.map(s => s.class_room))].sort()
    const result = {}
    
    activeRooms.forEach(room => {
      const roomStudents = students.filter(s => s.class_room === room)
      const roomStudentIds = roomStudents.map(s => s.student_id)
      
      const roomLogs = logs.filter(l => roomStudentIds.includes(l.student_id))
      if (roomLogs.length === 0) return; 
      
      const roomDates = [...new Set(roomLogs.map(l => l.date))].sort()
      
      const studentData = roomStudents.map(stu => {
        const stuLogs = roomLogs.filter(l => l.student_id === stu.student_id)
        const dateColumns = []
        let present = 0, absent = 0, totalCount = 0
        
        roomDates.forEach(d => {
          const dLogs = stuLogs.filter(l => l.date === d)
          const latestLog = dLogs[dLogs.length - 1]
          
          if (latestLog) { 
            totalCount++; 
            if (latestLog.status !== 'ขาด') present++; else absent++; 
            dateColumns.push({ 
              text: latestLog.status, 
              batchTime: new Date(latestLog.created_at).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}), 
              createdAt: latestLog.created_at 
            });
          } else {
            dateColumns.push({ 
              text: stu.is_dual_voc ? 'เป็นทวิภาคี' : '-', 
              batchTime: null, 
              createdAt: null 
            });
          }
        })
        
        return { 
          ...stu, 
          dateColumns, 
          presentPercent: totalCount > 0 ? ((present/totalCount)*100).toFixed(0) : 0, 
          absentPercent: totalCount > 0 ? ((absent/totalCount)*100).toFixed(0) : 0 
        }
      })
      result[room] = { dates: roomDates, students: studentData }
    })
    return { rooms: Object.keys(result), result }
  }, [logs, students])

  const displayedRooms = reportData && selectedRoomFilter ? [selectedRoomFilter] : [];

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>สรุปผลการเช็คชื่อ</h2>
      
      <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="glass-input" value={selectedTeacher} onChange={(e) => { 
          setSelectedTeacher(e.target.value); 
          setSelectedSubject(''); 
          setSelectedRoomFilter('');
          setHasSearched(false);
          setLogs([]);
        }} disabled={user?.role !== 'admin'}>
            <option value="">-- เลือกอาจารย์ --</option>
            {teachers.map(t => <option key={t.teacher_code} value={t.teacher_code}>{t.full_name}</option>)}
        </select>
        
        <select className="glass-input" value={selectedSubject} onChange={(e) => {
          setSelectedSubject(e.target.value);
          setSelectedRoomFilter(''); // รีเซ็ตห้องเรียนเมื่อเปลี่ยนวิชา
          setHasSearched(false);
          setLogs([]);
        }} style={{ flex: 1 }}>
            <option value="">-- เลือกวิชา --</option>
            {filteredSubjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_name}</option>)}
        </select>

        {/* ห้องเรียนจะถูกกรองตามวิชาที่เลือก */}
        <select className="glass-input" value={selectedRoomFilter} onChange={(e) => setSelectedRoomFilter(e.target.value)} style={{ width: 'auto', minWidth: '150px' }} disabled={!selectedSubject}>
          <option value="">-- เลือกห้องเรียน --</option>
          {availableRoomsForSubject.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        
        <button onClick={fetchReport} className="btn-primary" style={{ padding: '10px 20px' }}>ประมวลผล</button>
        
        {reportData && selectedRoomFilter && (
            <div style={{ marginLeft: 'auto' }}>
                <button onClick={exportExcel} className="btn-success" style={{ backgroundColor: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  Export Excel
                </button>
            </div>
        )}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#0056b3', fontWeight: 'bold' }}>กำลังโหลดข้อมูล...</p>
      ) : hasSearched && logs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: '#fff0f2', border: '1px solid #ffe4e6' }}>
          <h3 style={{ color: '#e11d48', fontSize: '1.5rem', marginBottom: '10px' }}>ยังไม่มีข้อมูล</h3>
          <p style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: 'bold' }}>วิชานี้ยังไม่เคยถูกบันทึก</p>
        </div>
      ) : reportData ? (
        !selectedRoomFilter ? (
          <p style={{ textAlign: 'center', color: '#666' }}>กรุณาเลือกห้องเรียนเพื่อดูรายงาน</p>
        ) : displayedRooms.length > 0 && displayedRooms.some(r => reportData.result[r]) ? (
          displayedRooms.map(room => {
            const roomObj = reportData.result[room];
            if (!roomObj) return null;

            return (
            <div key={room} className="glass-panel" style={{ marginBottom: '30px', padding: '0', background: '#ffffff', overflow: 'hidden' }}>
              <h4 style={{ margin: '20px 20px 15px 20px', color: '#FF1493', fontSize: '1.2rem', textAlign: 'center' }}>ห้องเรียน: {room}</h4>
              <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', paddingBottom: '10px' }}>
                
                <table className="report-table" style={{ minWidth: '1000px', width: '100%', borderCollapse: 'collapse', fontSize: '14px', border: '1px solid #e5e7eb' }}>
                  <thead>
                    <tr>
                      {/* ปรับขนาดและ Padding ส่วนหัวตารางให้กว้างขึ้นและไม่อึดอัด */}
                      <th rowSpan="2" style={{ position: 'sticky', left: 0, zIndex: 10, border: '1px solid #d1d5db', padding: '16px 20px', backgroundColor: '#f9fafb', color: '#374151', verticalAlign: 'middle', textAlign: 'center', minWidth: '100px' }}>รหัส</th>
                      <th rowSpan="2" style={{ position: 'sticky', left: '100px', zIndex: 10, border: '1px solid #d1d5db', padding: '16px 20px', backgroundColor: '#f9fafb', color: '#374151', verticalAlign: 'middle', textAlign: 'center', minWidth: '220px' }}>ชื่อ-นามสกุล</th>
                      
                      {roomObj.dates.map((d, i) => {
                        const sampleLog = roomObj.students.find(s => s.dateColumns[i].createdAt)?.dateColumns[i];
                        return (
                          <th key={d} rowSpan="2" style={{ border: '1px solid #d1d5db', padding: '16px 15px', backgroundColor: '#eff6ff', color: '#1e3a8a', textAlign: 'center', minWidth: '100px' }}>
                            {d} <br/>
                            <small style={{ fontWeight: 'normal', color: '#6b7280' }}>({sampleLog?.batchTime || '-'})</small>
                            {sampleLog?.createdAt && (
                              <button onClick={() => handleDeleteBatch(d, sampleLog.createdAt)} style={{ display: 'block', margin: '8px auto 0', padding: '6px 15px', fontSize: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                ลบ
                              </button>
                            )}
                          </th>
                        )
                      })}
                      <th colSpan="2" style={{ border: '1px solid #d1d5db', padding: '15px', backgroundColor: '#fdf2f8', color: '#9d174d', textAlign: 'center' }}>สรุปผล</th>
                    </tr>
                    <tr>
                      <th style={{ border: '1px solid #d1d5db', padding: '12px', backgroundColor: '#ffffff', fontSize: '13px', textAlign: 'center', color: '#4b5563' }}>มา/ลา</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '12px', backgroundColor: '#ffffff', fontSize: '13px', textAlign: 'center', color: '#4b5563' }}>ขาด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomObj.students.map(s => (
                      <tr key={s.student_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        {/* ปรับ Padding ในเซลล์ให้กว้างขึ้นและไม่อึดอัด */}
                        <td style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '15px 20px', textAlign: 'center', color: '#374151', fontWeight: 'bold' }}>{s.student_id}</td>
                        <td style={{ position: 'sticky', left: '100px', zIndex: 5, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '15px 20px', color: '#374151' }}>{s.full_name}</td>
                        
                        {s.dateColumns.map((val, i) => (
                          <td key={i} style={{ 
                            border: '1px solid #e5e7eb', 
                            padding: '15px', 
                            textAlign: 'center',
                            color: val.text === 'มา' ? '#059669' : val.text === 'ขาด' ? '#dc2626' : val.text === 'ลา' ? '#d97706' : val.text === 'เป็นทวิภาคี' ? '#0284c7' : '#9ca3af',
                            fontWeight: val.text === 'ขาด' || val.text === 'เป็นทวิภาคี' ? 'bold' : 'normal'
                          }}>
                            {val.text === 'เป็นทวิภาคี' ? (
                              <span style={{ background: '#e0f2fe', padding: '6px 10px', borderRadius: '12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                {val.text}
                              </span>
                            ) : (
                              val.text
                            )}
                          </td>
                        ))}
                        
                        <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#059669', fontSize: '14px' }}>{s.presentPercent}%</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626', fontSize: '14px' }}>{s.absentPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )})
        ) : (
          <p style={{ textAlign: 'center', color: '#ff416c', fontWeight: 'bold', padding: '20px' }}>ไม่พบข้อมูลการเช็คชื่อของห้องที่เลือกในวิชานี้</p>
        )
      ) : (
        <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>เลือกวิชาและห้องเรียน จากนั้นกดประมวลผลเพื่อดูรายงาน</p>
      )}
    </div>
  )
}

export default AttendanceReport