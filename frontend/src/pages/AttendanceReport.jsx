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

  const allAvailableRooms = useMemo(() => {
    return [...new Set(students.map(s => s.class_room).filter(Boolean))].sort()
  }, [students])

  const availableRoomsForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    const subject = subjects.find(s => s.subject_code === selectedSubject);
    
    if (subject && subject.class_rooms) {
       return subject.class_rooms.split(',').map(r => r.trim()).filter(Boolean).sort();
    }
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

  // 📌 ฟังก์ชันจัดการแก้ไข พร้อมระบบแจ้งเตือนยืนยัน (Confirm)
  const handleStatusChange = async (studentId, date, newStatus) => {
    // 📌 แจ้งเตือนก่อนเซฟ
    if (!window.confirm(`ยืนยันการเปลี่ยนสถานะเป็น "${newStatus}" ใช่หรือไม่?`)) {
      return; // ออกจากการทำงาน ถ้ายกเลิก
    }

    const existingLogs = logs.filter(l => l.student_id === studentId && l.date === date);
    const existingLog = existingLogs[existingLogs.length - 1]; 

    if (existingLog) {
      const { error } = await supabase.from('attendance_logs')
        .update({ status: newStatus })
        .eq('student_id', studentId)
        .eq('date', date)
        .eq('subject_code', selectedSubject)
        .eq('created_at', existingLog.created_at);

      if (!error) {
         setLogs(prev => prev.map(l => (l === existingLog ? { ...l, status: newStatus } : l)));
      } else {
         alert("อัปเดตไม่สำเร็จ: " + error.message);
      }
    } else {
      const batchLog = logs.find(l => l.date === date);
      const createdAtToUse = batchLog ? batchLog.created_at : new Date().toISOString();

      const newEntry = {
        student_id: studentId,
        date: date,
        subject_code: selectedSubject,
        status: newStatus,
        created_at: createdAtToUse,
        recorded_by: user?.teacher_code || 'admin'
      };

      const { data, error } = await supabase.from('attendance_logs').insert([newEntry]).select();

      if (!error && data) {
         setLogs(prev => [...prev, data[0]]);
      } else {
         alert("เกิดข้อผิดพลาดในการเพิ่มข้อมูล: " + (error?.message || ''));
      }
    }
  };

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
      
      row['มา/ลา (วัน)'] = s.presentCount;
      row['ขาด (วัน)'] = s.absentCount;
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
              date: d,
              text: latestLog.status, 
              batchTime: new Date(latestLog.created_at).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}), 
              createdAt: latestLog.created_at 
            });
          } else {
            dateColumns.push({ 
              date: d,
              text: stu.is_dual_voc ? 'เป็นทวิภาคี' : '-', 
              batchTime: null, 
              createdAt: null 
            });
          }
        })
        
        return { 
          ...stu, 
          dateColumns, 
          presentCount: present,
          absentCount: absent,
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
      
      <style>{`
        .th-sticky-name {
          position: sticky;
          left: 100px;
          z-index: 10;
          min-width: 220px;
        }
        .td-sticky-name {
          position: sticky;
          left: 100px;
          z-index: 5;
        }

        .report-table th, 
        .report-table td {
          border: 1px solid #9ca3af !important; 
        }
        .report-table thead th {
          border-bottom: 2px solid #6b7280 !important; 
        }

        .editable-cell {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: transparent;
          border: none;
          text-align: center;
          text-align-last: center;
          width: 100%;
          cursor: pointer;
          outline: none;
        }

        @media (max-width: 600px) {
          .mobile-stack {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .mobile-stack > * {
            width: 100% !important;
            margin-left: 0 !important;
          }
          .export-container button {
            width: 100% !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .th-sticky-name, .td-sticky-name {
            left: 0 !important;
            min-width: 140px !important;
            width: 140px !important;
            white-space: normal;
          }
        }
      `}</style>

      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>สรุปผลการเช็คชื่อ</h2>
      
      <div className="glass-panel mobile-stack" style={{ padding: '25px', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="glass-input" value={selectedTeacher} onChange={(e) => { 
          setSelectedTeacher(e.target.value); 
          setSelectedSubject(''); 
          setSelectedRoomFilter('');
          setHasSearched(false);
          setLogs([]);
        }}>
            <option value="">-- เลือกอาจารย์ --</option>
            {teachers.map(t => <option key={t.teacher_code} value={t.teacher_code}>{t.full_name}</option>)}
        </select>
        
        <select className="glass-input" value={selectedSubject} onChange={(e) => {
          setSelectedSubject(e.target.value);
          setSelectedRoomFilter(''); 
          setHasSearched(false);
          setLogs([]);
        }} style={{ flex: 1 }}>
            <option value="">-- เลือกวิชา --</option>
            {filteredSubjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_name}</option>)}
        </select>

        <select className="glass-input" value={selectedRoomFilter} onChange={(e) => setSelectedRoomFilter(e.target.value)} style={{ width: 'auto', minWidth: '150px' }} disabled={!selectedSubject}>
          <option value="">-- เลือกห้องเรียน --</option>
          {availableRoomsForSubject.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        
        <button onClick={fetchReport} className="btn-primary" style={{ padding: '10px 20px', fontSize: '1rem' }}>ประมวลผล</button>
        
        {reportData && selectedRoomFilter && (
          <div className="export-container" style={{ marginLeft: 'auto' }}>
            <button onClick={exportExcel} className="btn-success" style={{ backgroundColor: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
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
                
                <table className="report-table" style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" className="hide-on-mobile" style={{ position: 'sticky', left: 0, zIndex: 10, minWidth: '100px', padding: '16px 20px', backgroundColor: '#f9fafb', color: '#374151', verticalAlign: 'middle', textAlign: 'center' }}>รหัส</th>
                      
                      <th rowSpan="2" className="th-sticky-name" style={{ padding: '16px 20px', backgroundColor: '#f9fafb', color: '#374151', verticalAlign: 'middle', textAlign: 'center' }}>ชื่อ-นามสกุล</th>
                      
                      {roomObj.dates.map((d, i) => {
                        const sampleLog = roomObj.students.find(s => s.dateColumns[i].createdAt)?.dateColumns[i];
                        return (
                          <th key={d} rowSpan="2" style={{ padding: '16px 15px', backgroundColor: '#eff6ff', color: '#1e3a8a', textAlign: 'center', minWidth: '90px' }}>
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
                      <th colSpan="4" style={{ padding: '15px', backgroundColor: '#fdf2f8', color: '#9d174d', textAlign: 'center' }}>สรุปผล</th>
                    </tr>
                    <tr>
                      <th style={{ padding: '12px', backgroundColor: '#ffffff', fontSize: '12px', textAlign: 'center', color: '#4b5563', minWidth: '70px' }}>มา/ลา (วัน)</th>
                      <th style={{ padding: '12px', backgroundColor: '#ffffff', fontSize: '12px', textAlign: 'center', color: '#4b5563', minWidth: '70px' }}>ขาด (วัน)</th>
                      <th style={{ padding: '12px', backgroundColor: '#ffffff', fontSize: '12px', textAlign: 'center', color: '#4b5563', minWidth: '70px' }}>มา/ลา (%)</th>
                      <th style={{ padding: '12px', backgroundColor: '#ffffff', fontSize: '12px', textAlign: 'center', color: '#4b5563', minWidth: '70px' }}>ขาด (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomObj.students.map(s => (
                      <tr key={s.student_id} style={{ background: s.is_dual_voc ? '#f8fafc' : '#ffffff' }}>
                        <td className="hide-on-mobile" style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: s.is_dual_voc ? '#f8fafc' : '#ffffff', padding: '15px 20px', textAlign: 'center', color: '#374151', fontWeight: 'bold' }}>{s.student_id}</td>
                        
                        <td className="td-sticky-name" style={{ backgroundColor: s.is_dual_voc ? '#f8fafc' : '#ffffff', padding: '15px 20px', color: '#374151' }}>{s.full_name}</td>
                        
                        {s.dateColumns.map((val, i) => (
                          <td key={i} style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {s.is_dual_voc ? (
                              <span style={{ background: '#e0f2fe', padding: '6px 10px', borderRadius: '12px', fontSize: '12px', whiteSpace: 'nowrap', color: '#0284c7' }}>
                                ทวิภาคี
                              </span>
                            ) : val.text === 'ไม่มีเรียน' ? (
                              <span style={{ background: '#ede9fe', padding: '6px 10px', borderRadius: '12px', fontSize: '12px', whiteSpace: 'nowrap', color: '#8b5cf6', fontWeight: 'bold' }}>
                                ไม่มีเรียน
                              </span>
                            ) : (
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30px' }}>
                                <select
                                  className="editable-cell"
                                  value={val.text === '-' ? '' : val.text}
                                  onChange={(e) => handleStatusChange(s.student_id, val.date, e.target.value)}
                                  style={{
                                    paddingRight: '12px', 
                                    fontSize: val.text === 'ขาด' ? '18px' : '14px', 
                                    fontWeight: val.text === 'ขาด' ? '900' : 'bold', 
                                    color: val.text === 'มา' ? '#059669' : val.text === 'ขาด' ? '#dc2626' : val.text === 'ลา' ? '#d97706' : val.text === 'ละเว้น' ? '#434343' : '#9ca3af'
                                  }}
                                >
                                  <option value="" disabled>-</option>
                                  <option value="มา">มา</option>
                                  <option value="ลา">ลา</option>
                                  <option value="ขาด">ขาด</option>
                                  <option value="ละเว้น">ละเว้น</option>
                                </select>
                                <span style={{ position: 'absolute', right: '2px', top: '2px', fontSize: '11px', color: '#000000', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>✎</span>
                              </div>
                            )}
                          </td>
                        ))}
                        
                        <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#059669', fontSize: '14px' }}>{s.presentCount}</td>
                        <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626', fontSize: '14px' }}>{s.absentCount}</td>
                        <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#059669', fontSize: '14px' }}>{s.presentPercent}%</td>
                        <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626', fontSize: '14px' }}>{s.absentPercent}%</td>
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