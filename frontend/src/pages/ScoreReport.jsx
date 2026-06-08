import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx';
import '../App.css'

function ScoreReport({ user }) {
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [scoresData, setScoresData] = useState([])
  
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
    const { data } = await supabase.from('student_scores').select('*').eq('subject_code', selectedSubject).order('created_at', { ascending: true })
    setScoresData(data || [])
    setLoading(false)
  }

  const handleDeleteBatch = async (createdAt) => {
    if (!window.confirm(`ยืนยันการลบข้อมูลคะแนนชิ้นงานนี้ทั้งหมด?`)) return;
    const { error } = await supabase.from('student_scores').delete().eq('created_at', createdAt);
    if (error) alert("ลบไม่สำเร็จ: " + error.message);
    else { alert("ลบข้อมูลคะแนนชิ้นงานนี้เรียบร้อย"); fetchReport(); }
  };

  const exportExcel = () => {
    if (!reportData || !selectedRoomFilter) return alert("กรุณาเลือกห้องเรียนก่อน Export");
    const wb = XLSX.utils.book_new();

    const room = selectedRoomFilter;
    const roomObj = reportData.result[room];
    if (!roomObj) return;

    const dataToExport = roomObj.students.map(s => {
      // เอาคอลัมน์ระบบออกจากการ Export Excel ด้วย
      const rowData = { 
        รหัส: s.student_id, 
        ชื่อ: s.full_name
      };
      
      roomObj.assignmentCols.forEach((col, i) => {
        rowData[`${col.name} (เต็ม ${col.maxScore})`] = s.scoreColumns[i];
      });
      
      rowData['คะแนนรวม'] = s.totalEarned;
      rowData['เปอร์เซ็นต์ (%)'] = s.percentage + (s.percentage !== '-' ? '%' : '');
      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const safeSheetName = room.replace(/\//g, '-'); 
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    XLSX.writeFile(wb, `สรุปคะแนน_${selectedSubject}_${safeSheetName}.xlsx`);
  };

  const reportData = useMemo(() => {
    if (scoresData.length === 0) return null
    const activeRooms = [...new Set(students.map(s => s.class_room))].sort()
    const result = {}
    
    activeRooms.forEach(room => {
      const roomStudents = students.filter(s => s.class_room === room)
      const roomStudentIds = roomStudents.map(s => s.student_id)
      
      const roomScores = scoresData.filter(s => roomStudentIds.includes(s.student_id))
      if (roomScores.length === 0) return; 

      const roomBatches = [...new Set(roomScores.map(s => s.created_at))].sort()
      const assignmentCols = roomBatches.map(batch => {
        const sample = roomScores.find(s => s.created_at === batch)
        return {
          createdAt: batch,
          name: sample.assignment_name,
          maxScore: sample.max_score,
          date: sample.date
        }
      })
      
      const studentData = roomStudents.map(stu => {
        const stuScores = roomScores.filter(s => s.student_id === stu.student_id)
        const scoreColumns = []
        let totalEarned = 0
        let totalMax = 0

        assignmentCols.forEach(col => {
          const scoreRecord = stuScores.find(s => s.created_at === col.createdAt)
          
          if (stu.is_dual_voc) {
            scoreColumns.push('เป็นทวิภาคี')
          } else if (scoreRecord) {
            scoreColumns.push(Number(scoreRecord.score))
            totalEarned += Number(scoreRecord.score)
            totalMax += Number(col.maxScore)
          } else {
            scoreColumns.push('-') 
            totalMax += Number(col.maxScore)
          }
        })
        
        let percentage = '-';
        if (!stu.is_dual_voc) {
          percentage = totalMax > 0 ? ((totalEarned / totalMax) * 100).toFixed(0) : 0
        } else {
          totalEarned = '-'; 
        }

        return { ...stu, scoreColumns, totalEarned, totalMax, percentage }
      })

      result[room] = { assignmentCols, students: studentData }
    })

    return { rooms: Object.keys(result), result }
  }, [scoresData, students])

  const displayedRooms = reportData && selectedRoomFilter ? [selectedRoomFilter] : [];

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      
      {/* 📌 ควบคุม Layout ให้เรียงคนละบรรทัดเฉพาะบนมือถือ และจัดการตาราง */}
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

      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>รายงานสรุปคะแนน</h2>
      
      {/* แก้ไขให้จัดเรียงแนวนอนบนคอมพิวเตอร์ และใส่ mobile-stack สำหรับมือถือ */}
      <div className="glass-panel mobile-stack" style={{ padding: '25px', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="glass-input" value={selectedTeacher} onChange={(e) => { 
          setSelectedTeacher(e.target.value); 
          setSelectedSubject(''); 
          setSelectedRoomFilter('');
          setHasSearched(false);
          setScoresData([]);
        }} disabled={user?.role !== 'admin'} style={{ minWidth: '150px' }}>
            <option value="">-- เลือกอาจารย์ --</option>
            {teachers.map(t => <option key={t.teacher_code} value={t.teacher_code}>{t.full_name}</option>)}
        </select>
        
        <select className="glass-input" value={selectedSubject} onChange={(e) => {
          setSelectedSubject(e.target.value);
          setSelectedRoomFilter('');
          setHasSearched(false);
          setScoresData([]);
        }} style={{ flex: 1, minWidth: '150px' }}>
            <option value="">-- เลือกวิชา --</option>
            {filteredSubjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_name}</option>)}
        </select>

        <select className="glass-input" value={selectedRoomFilter} onChange={(e) => setSelectedRoomFilter(e.target.value)} disabled={!selectedSubject} style={{ width: 'auto', minWidth: '150px' }}>
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
      ) : hasSearched && scoresData.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: '#fff0f2', border: '1px solid #ffe4e6' }}>
          <h3 style={{ color: '#e11d48', fontSize: '1.5rem', marginBottom: '10px' }}>ยังไม่มีข้อมูล</h3>
          <p style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: 'bold' }}>วิชานี้ยังไม่เคยถูกบันทึก</p>
        </div>
      ) : reportData ? (
        !selectedRoomFilter ? (
          <p style={{ textAlign: 'center', color: '#666' }}>กรุณาเลือกห้องเรียนเพื่อดูผลคะแนน</p>
        ) : displayedRooms.length > 0 && displayedRooms.some(r => reportData.result[r]) ? (
          displayedRooms.map(room => {
            const roomObj = reportData.result[room];
            if (!roomObj) return null;

            const roomTotalMax = roomObj.assignmentCols.reduce((sum, col) => sum + Number(col.maxScore), 0);

            return (
            <div key={room} className="glass-panel" style={{ marginBottom: '30px', padding: '0', background: '#ffffff', overflow: 'hidden' }}>
              <h4 style={{ margin: '20px 20px 15px 20px', color: '#FF1493', fontSize: '1.2rem', textAlign: 'center' }}>ห้องเรียน: {room}</h4>
              <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', paddingBottom: '10px' }}>
                
                <table className="report-table" style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse', fontSize: '14px', border: '1px solid #e5e7eb' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" className="hide-on-mobile" style={{ position: 'sticky', left: 0, zIndex: 10, border: '1px solid #d1d5db', padding: '16px 20px', backgroundColor: '#f9fafb', color: '#374151', verticalAlign: 'middle', textAlign: 'center', minWidth: '100px' }}>รหัส</th>
                      <th rowSpan="2" className="th-sticky-name" style={{ border: '1px solid #d1d5db', padding: '16px 20px', backgroundColor: '#f9fafb', color: '#374151', verticalAlign: 'middle', textAlign: 'center' }}>ชื่อ-นามสกุล</th>
                      
                      {/* --- ลบคอลัมน์ 'ระบบ' ออกแล้ว --- */}

                      {roomObj.assignmentCols.map((col, i) => (
                        <th key={i} style={{ border: '1px solid #d1d5db', padding: '16px 15px', backgroundColor: '#eff6ff', color: '#1e3a8a', textAlign: 'center', minWidth: '120px' }}>
                          {col.name} <br/> <small style={{ fontWeight: 'normal', color: '#6b7280' }}>({col.date})</small>
                        </th>
                      ))}
                      <th colSpan="2" style={{ border: '1px solid #d1d5db', padding: '16px 15px', backgroundColor: '#fdf2f8', color: '#9d174d', textAlign: 'center' }}>สรุปผล</th>
                    </tr>
                    <tr>
                      {roomObj.assignmentCols.map((col, i) => (
                        <th key={i} style={{ border: '1px solid #d1d5db', padding: '12px', backgroundColor: '#ffffff', fontWeight: 'normal', fontSize: '13px', textAlign: 'center' }}>
                          <span style={{ color: '#4b5563' }}>เต็ม {col.maxScore}</span>
                          <button onClick={() => handleDeleteBatch(col.createdAt)} style={{ display: 'block', margin: '8px auto 0', padding: '6px 15px', fontSize: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            ลบ
                          </button>
                        </th>
                      ))}
                      <th style={{ border: '1px solid #d1d5db', padding: '12px', backgroundColor: '#ffffff', fontSize: '13px', textAlign: 'center', color: '#4b5563', minWidth: '80px' }}>รวม (เต็ม {roomTotalMax})</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '12px', backgroundColor: '#ffffff', fontSize: '13px', textAlign: 'center', color: '#4b5563', minWidth: '80px' }}>ร้อยละ (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomObj.students.map(s => (
                      <tr key={s.student_id} style={{ borderBottom: '1px solid #e5e7eb', background: s.is_dual_voc ? '#f8fafc' : '#ffffff' }}>
                        
                        <td className="hide-on-mobile" style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '15px 20px', textAlign: 'center', color: '#374151', fontWeight: 'bold' }}>{s.student_id}</td>
                        <td className="td-sticky-name" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '15px 20px', color: '#374151' }}>{s.full_name}</td>
                        
                        {/* --- ลบคอลัมน์ 'ระบบ' ออกแล้ว --- */}

                        {s.scoreColumns.map((val, i) => (
                          <td key={i} style={{ 
                            border: '1px solid #e5e7eb', 
                            padding: '15px', 
                            textAlign: 'center', 
                            color: val === 'เป็นทวิภาคี' ? '#0284c7' : val === '-' ? '#9ca3af' : '#111827', 
                            fontWeight: typeof val === 'number' ? 'bold' : 'normal' 
                          }}>
                            {val === 'เป็นทวิภาคี' ? (
                              <span style={{ background: '#e0f2fe', padding: '6px 10px', borderRadius: '12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                {val}
                              </span>
                            ) : val}
                          </td>
                        ))}
                        
                        <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center', fontWeight: 'bold', color: s.totalEarned === '-' ? '#9ca3af' : '#2563eb', fontSize: '14px' }}>
                          {s.totalEarned}
                        </td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center', fontWeight: 'bold', color: s.percentage === '-' ? '#9ca3af' : s.percentage >= 50 ? '#059669' : '#dc2626', fontSize: '14px' }}>
                          {s.percentage}{s.percentage !== '-' && '%'}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )})
        ) : (
          <p style={{ textAlign: 'center', color: '#ff416c', fontWeight: 'bold', padding: '20px' }}>ไม่พบข้อมูลคะแนนของห้องที่เลือกในวิชานี้</p>
        )
      ) : (
        <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>เลือกวิชาและห้องเรียน จากนั้นกดประมวลผลเพื่อดูคะแนน</p>
      )}
    </div>
  )
}

export default ScoreReport