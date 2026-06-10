import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx';
import '../App.css'

// 📌 ข้อมูลวันที่ทั้งหมด
const LINEUP_DATES = [
  // --- เดือนพฤษภาคม 2569 ---
  { date: '18/5/69', label: '18/5', full: 'จันทร์ 18/5/69', isHoliday: false },
  { date: '19/5/69', label: '19/5', full: 'อังคาร 19/5/69', isHoliday: false },
  { date: '20/5/69', label: '20/5', full: 'พุธ 20/5/69', isHoliday: false },
  { date: '21/5/69', label: '21/5', full: 'พฤหัสบดี 21/5/69', isHoliday: false },
  { date: '22/5/69', label: '22/5', full: 'ศุกร์ 22/5/69', isHoliday: false },
  { date: '25/5/69', label: '25/5', full: 'จันทร์ 25/5/69', isHoliday: false },
  { date: '26/5/69', label: '26/5', full: 'อังคาร 26/5/69', isHoliday: false },
  { date: '27/5/69', label: '27/5', full: 'พุธ 27/5/69', isHoliday: false },
  { date: '28/5/69', label: '28/5', full: 'พฤหัสบดี 28/5/69', isHoliday: false },
  { date: '29/5/69', label: '29/5', full: 'ศุกร์ 29/5/69', isHoliday: false },

  // --- เดือนมิถุนายน 2569 ---
  { date: '1/6/69', label: '1/6', full: 'จันทร์ 1/6/69', isHoliday: true, note: 'ชดเชยวิสาขฯ' },
  { date: '2/6/69', label: '2/6', full: 'อังคาร 2/6/69', isHoliday: false },
  { date: '3/6/69', label: '3/6', full: 'พุธ 3/6/69', isHoliday: true, note: 'วันเฉลิมฯ ควีน' },
  { date: '4/6/69', label: '4/6', full: 'พฤหัสบดี 4/6/69', isHoliday: false },
  { date: '5/6/69', label: '5/6', full: 'ศุกร์ 5/6/69', isHoliday: false },
  { date: '8/6/69', label: '8/6', full: 'จันทร์ 8/6/69', isHoliday: false }, 
  { date: '9/6/69', label: '9/6', full: 'อังคาร 9/6/69', isHoliday: false }, 
  { date: '10/6/69', label: '10/6', full: 'พุธ 10/6/69', isHoliday: false }, 
  { date: '11/6/69', label: '11/6', full: 'พฤหัสบดี 11/6/69', isHoliday: false }, 
  { date: '12/6/69', label: '12/6', full: 'ศุกร์ 12/6/69', isHoliday: false },
  { date: '15/6/69', label: '15/6', full: 'จันทร์ 15/6/69', isHoliday: false }, 
  { date: '16/6/69', label: '16/6', full: 'อังคาร 16/6/69', isHoliday: false }, 
  { date: '17/6/69', label: '17/6', full: 'พุธ 17/6/69', isHoliday: false }, 
  { date: '18/6/69', label: '18/6', full: 'พฤหัสบดี 18/6/69', isHoliday: false }, 
  { date: '19/6/69', label: '19/6', full: 'ศุกร์ 19/6/69', isHoliday: false },
  { date: '22/6/69', label: '22/6', full: 'จันทร์ 22/6/69', isHoliday: false }, 
  { date: '23/6/69', label: '23/6', full: 'อังคาร 23/6/69', isHoliday: false }, 
  { date: '24/6/69', label: '24/6', full: 'พุธ 24/6/69', isHoliday: false }, 
  { date: '25/6/69', label: '25/6', full: 'พฤหัสบดี 25/6/69', isHoliday: false }, 
  { date: '26/6/69', label: '26/6', full: 'ศุกร์ 26/6/69', isHoliday: false },
  { date: '29/6/69', label: '29/6', full: 'จันทร์ 29/6/69', isHoliday: false }, 
  { date: '30/6/69', label: '30/6', full: 'อังคาร 30/6/69', isHoliday: false }, 

  // --- เดือนกรกฎาคม 2569 ---
  { date: '1/7/69', label: '1/7', full: 'พุธ 1/7/69', isHoliday: false }, 
  { date: '2/7/69', label: '2/7', full: 'พฤหัสบดี 2/7/69', isHoliday: false }, 
  { date: '3/7/69', label: '3/7', full: 'ศุกร์ 3/7/69', isHoliday: false },
  { date: '6/7/69', label: '6/7', full: 'จันทร์ 6/7/69', isHoliday: false }, 
  { date: '7/7/69', label: '7/7', full: 'อังคาร 7/7/69', isHoliday: false }, 
  { date: '8/7/69', label: '8/7', full: 'พุธ 8/7/69', isHoliday: false }, 
  { date: '9/7/69', label: '9/7', full: 'พฤหัสบดี 9/7/69', isHoliday: false }, 
  { date: '10/7/69', label: '10/7', full: 'ศุกร์ 10/7/69', isHoliday: false },
  { date: '13/7/69', label: '13/7', full: 'จันทร์ 13/7/69', isHoliday: false }, 
  { date: '14/7/69', label: '14/7', full: 'อังคาร 14/7/69', isHoliday: false }, 
  { date: '15/7/69', label: '15/7', full: 'พุธ 15/7/69', isHoliday: false }, 
  { date: '16/7/69', label: '16/7', full: 'พฤหัสบดี 16/7/69', isHoliday: false }, 
  { date: '17/7/69', label: '17/7', full: 'ศุกร์ 17/7/69', isHoliday: false },
  { date: '20/7/69', label: '20/7', full: 'จันทร์ 20/7/69', isHoliday: false }, 
  { date: '21/7/69', label: '21/7', full: 'อังคาร 21/7/69', isHoliday: false }, 
  { date: '22/7/69', label: '22/7', full: 'พุธ 22/7/69', isHoliday: false }, 
  { date: '23/7/69', label: '23/7', full: 'พฤหัสบดี 23/7/69', isHoliday: false }, 
  { date: '24/7/69', label: '24/7', full: 'ศุกร์ 24/7/69', isHoliday: false },
  { date: '27/7/69', label: '27/7', full: 'จันทร์ 27/7/69', isHoliday: false }, 
  { date: '28/7/69', label: '28/7', full: 'อังคาร 28/7/69', isHoliday: true, note: 'วันเฉลิมฯ' }, 
  { date: '29/7/69', label: '29/7', full: 'พุธ 29/7/69', isHoliday: true, note: 'อาสาฬหบูชา' }, 
  { date: '30/7/69', label: '30/7', full: 'พฤหัสบดี 30/7/69', isHoliday: false }, 
  { date: '31/7/69', label: '31/7', full: 'ศุกร์ 31/7/69', isHoliday: false },

  // --- เดือนสิงหาคม 2569 ---
  { date: '3/8/69', label: '3/8', full: 'จันทร์ 3/8/69', isHoliday: false }, 
  { date: '4/8/69', label: '4/8', full: 'อังคาร 4/8/69', isHoliday: false }, 
  { date: '5/8/69', label: '5/8', full: 'พุธ 5/8/69', isHoliday: false }, 
  { date: '6/8/69', label: '6/8', full: 'พฤหัสบดี 6/8/69', isHoliday: false }, 
  { date: '7/8/69', label: '7/8', full: 'ศุกร์ 7/8/69', isHoliday: false },
  { date: '10/8/69', label: '10/8', full: 'จันทร์ 10/8/69', isHoliday: false }, 
  { date: '11/8/69', label: '11/8', full: 'อังคาร 11/8/69', isHoliday: false }, 
  { date: '12/8/69', label: '12/8', full: 'พุธ 12/8/69', isHoliday: true, note: 'วันแม่' }, 
  { date: '13/8/69', label: '13/8', full: 'พฤหัสบดี 13/8/69', isHoliday: false }, 
  { date: '14/8/69', label: '14/8', full: 'ศุกร์ 14/8/69', isHoliday: false },
  { date: '17/8/69', label: '17/8', full: 'จันทร์ 17/8/69', isHoliday: false }, 
  { date: '18/8/69', label: '18/8', full: 'อังคาร 18/8/69', isHoliday: false }, 
  { date: '19/8/69', label: '19/8', full: 'พุธ 19/8/69', isHoliday: false }, 
  { date: '20/8/69', label: '20/8', full: 'พฤหัสบดี 20/8/69', isHoliday: false }, 
  { date: '21/8/69', label: '21/8', full: 'ศุกร์ 21/8/69', isHoliday: false },
  { date: '24/8/69', label: '24/8', full: 'จันทร์ 24/8/69', isHoliday: false }, 
  { date: '25/8/69', label: '25/8', full: 'อังคาร 25/8/69', isHoliday: false }, 
  { date: '26/8/69', label: '26/8', full: 'พุธ 26/8/69', isHoliday: false }, 
  { date: '27/8/69', label: '27/8', full: 'พฤหัสบดี 27/8/69', isHoliday: false }, 
  { date: '28/8/69', label: '28/8', full: 'ศุกร์ 28/8/69', isHoliday: false },
  { date: '31/8/69', label: '31/8', full: 'จันทร์ 31/8/69', isHoliday: false }, 

  // --- เดือนกันยายน 2569 ---
  { date: '1/9/69', label: '1/9', full: 'อังคาร 1/9/69', isHoliday: false }, 
  { date: '2/9/69', label: '2/9', full: 'พุธ 2/9/69', isHoliday: false }, 
  { date: '3/9/69', label: '3/9', full: 'พฤหัสบดี 3/9/69', isHoliday: false }, 
  { date: '4/9/69', label: '4/9', full: 'ศุกร์ 4/9/69', isHoliday: false },
  { date: '7/9/69', label: '7/9', full: 'จันทร์ 7/9/69', isHoliday: false }, 
  { date: '8/9/69', label: '8/9', full: 'อังคาร 8/9/69', isHoliday: false }, 
  { date: '9/9/69', label: '9/9', full: 'พุธ 9/9/69', isHoliday: false }, 
  { date: '10/9/69', label: '10/9', full: 'พฤหัสบดี 10/9/69', isHoliday: false }, 
  { date: '11/9/69', label: '11/9', full: 'ศุกร์ 11/9/69', isHoliday: false },
];

const TOTAL_WORK_DAYS = LINEUP_DATES.filter(d => !d.isHoliday).length;

function LineUpAttendance({ user }) {
  const [students, setStudents] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [attendanceData, setAttendanceData] = useState({}); 
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase.from('students').select('*').order('class_room').order('student_id');
      setStudents(data || []);
    };
    fetchStudents();
  }, []);

  const allRooms = useMemo(() => [...new Set(students.map(s => s.class_room).filter(Boolean))], [students]);
  const filteredStudents = useMemo(() => selectedRoom === '' ? [] : students.filter(s => s.class_room === selectedRoom), [students, selectedRoom]);

  const allowedRooms = useMemo(() => {
    if (user?.role === 'admin') return allRooms;
    if (!user?.advisory_room) return [];
    const myRooms = user.advisory_room
      .split(',')
      .map(r => r.trim().replace(/\s+/g, ''));
    return allRooms.filter(room => myRooms.includes(room.replace(/\s+/g, '')));
  }, [allRooms, user]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedRoom) { setAttendanceData({}); return; }
      setFetching(true);
      
      const studentIds = filteredStudents.map(s => s.student_id);
      if (studentIds.length === 0) { setFetching(false); return; }

      const { data } = await supabase.from('lineup_attendance_logs').select('*').in('student_id', studentIds);
      
      const formattedData = {};
      (data || []).forEach(log => {
        if (!formattedData[log.student_id]) formattedData[log.student_id] = {};
        formattedData[log.student_id][log.date] = log.status;
      });
      
      setAttendanceData(formattedData);
      setFetching(false);
    };
    fetchLogs();
  }, [selectedRoom, filteredStudents]);

  const handleStatusChange = (studentId, date, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [date]: value
      }
    }));
  };

  // 📌 ฟังก์ชันจัดการ Check All ของแต่ละคอลัมน์ (วัน) พร้อมรองรับตัวเลือก '-' เพื่อรีเซ็ต
  const handleColumnCheckAll = (date, status) => {
    if (!status) return;

    if (status === 'ไม่มีเรียน') {
      if (!window.confirm(`ยืนยันการตั้งค่า "ไม่มีเรียน" ให้ทุกคนในวันที่ ${date} ใช่หรือไม่?`)) return;
    }
    
    // 📌 ยืนยันก่อนรีเซ็ตสถานะทั้งหมดในวันนั้น
    if (status === '-') {
      if (!window.confirm(`ยืนยันการล้างข้อมูล (รีเซ็ตเป็น -) ให้ทุกคนในวันที่ ${date} ใช่หรือไม่?`)) return;
    }

    setAttendanceData(prev => {
      const newData = { ...prev };
      filteredStudents.forEach(stu => {
        if (!stu.is_dual_voc) {
          if (!newData[stu.student_id]) newData[stu.student_id] = {};
          // ถ้าเลือก '-' ให้ปรับเป็นค่าว่าง
          newData[stu.student_id][date] = status === '-' ? '' : status;
        }
      });
      return newData;
    });
  };

  const handleSave = async () => {
    if (!selectedRoom) return alert("กรุณาเลือกห้องเรียน");
    setLoading(true);

    const logsToSave = [];
    filteredStudents.forEach(stu => {
      if (stu.is_dual_voc) return;

      LINEUP_DATES.forEach(d => {
        if (!d.isHoliday && attendanceData[stu.student_id]?.[d.date]) {
          logsToSave.push({
            student_id: stu.student_id,
            date: d.date,
            status: attendanceData[stu.student_id][d.date],
            recorded_by: user?.teacher_code || 'admin'
          });
        }
      });
    });

    const studentIds = filteredStudents.map(s => s.student_id);
    await supabase.from('lineup_attendance_logs').delete().in('student_id', studentIds);
    
    if (logsToSave.length > 0) {
      const { error } = await supabase.from('lineup_attendance_logs').insert(logsToSave);
      if (error) alert('Error: ' + error.message);
      else alert('บันทึกข้อมูลเช็คแถวเรียบร้อย!');
    } else {
      alert('บันทึกสำเร็จ (ล้างข้อมูลเข้าแถว)');
    }
    
    setLoading(false);
  };

  const handleExportExcel = () => {
    if (!selectedRoom || filteredStudents.length === 0) return alert("ไม่มีข้อมูลสำหรับ Export");
    const wb = XLSX.utils.book_new();
    
    const wsData = filteredStudents.map(stu => {
      let row = { 'รหัส': stu.student_id, 'ชื่อ-นามสกุล': stu.full_name };
      
      if (stu.is_dual_voc) {
        LINEUP_DATES.forEach(d => {
          row[d.date] = '-';
        });
        row['มา (วัน)'] = '-';
        row['ขาด (วัน)'] = '-';
        row['ร้อยละ (%)'] = 'ทวิภาคี';
      } else {
        let present = 0, absent = 0;
        LINEUP_DATES.forEach(d => {
          if (d.isHoliday) {
            row[d.date] = 'หยุด';
          } else {
            const status = attendanceData[stu.student_id]?.[d.date] || '';
            row[d.date] = status || '-';
            if (status === 'มา' || status === 'ไม่มีเรียน') present++;
            if (status === 'ขาด') absent++;
          }
        });
        
        row['มา (วัน)'] = present;
        row['ขาด (วัน)'] = absent;
        row['ร้อยละ (%)'] = Math.round((present / TOTAL_WORK_DAYS) * 100) + '%';
      }
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const safeSheetName = selectedRoom.replace(/\//g, '-');
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    XLSX.writeFile(wb, `รายงานเช็คแถว_${safeSheetName}.xlsx`);
  };

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>ระบบเช็คแถวหน้าเสาธง</h2>

      <div className="glass-panel score-filters" style={{ padding: '25px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>เลือกห้องเพื่อลงข้อมูล:</span>
        
        {allowedRooms.length === 0 && user?.role !== 'admin' ? (
          <span style={{ color: '#ff416c', fontWeight: 'bold', marginLeft: '10px' }}>
            ไม่มีสิทธิ์เข้าถึง (ฟังก์ชันนี้เฉพาะครูที่ปรึกษา)
          </span>
        ) : (
          <select className="glass-input" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} style={{ width: 'auto', minWidth: '150px' }}>
            <option value="">-- เลือกห้องเรียน --</option>
            {allowedRooms.map(room => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        )}

        {selectedRoom && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', width: '100%' }}>
             <button onClick={handleExportExcel} className="btn-success" style={{ padding: '10px 20px', borderRadius: '8px', flex: 1 }}>Export Excel</button>
          </div>
        )}
      </div>

      {fetching ? (
        <p style={{ textAlign: 'center', color: '#0056b3', fontWeight: 'bold' }}>กำลังโหลดข้อมูล...</p>
      ) : selectedRoom && filteredStudents.length > 0 ? (
        <div className="glass-panel" style={{ padding: '0', background: '#ffffff', overflow: 'hidden' }}>
          <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', paddingBottom: '10px' }}>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr>
                  <th rowSpan="2" className="hide-on-mobile" style={{ position: 'sticky', left: 0, zIndex: 10, border: '1px solid #d1d5db', padding: '12px', backgroundColor: '#f9fafb', color: '#374151', textAlign: 'center', minWidth: '80px' }}>รหัส</th>
                  <th rowSpan="2" className="th-sticky-name" style={{ position: 'sticky', left: '80px', zIndex: 10, border: '1px solid #d1d5db', padding: '12px', backgroundColor: '#f9fafb', color: '#374151', textAlign: 'center', minWidth: '200px' }}>ชื่อ-นามสกุล</th>
                  
                  {LINEUP_DATES.map((d, i) => (
                    <th key={i} style={{ border: '1px solid #d1d5db', padding: '6px', backgroundColor: d.isHoliday ? '#fecaca' : '#eff6ff', color: d.isHoliday ? '#991b1b' : '#1e3a8a', textAlign: 'center', minWidth: '70px', verticalAlign: 'top' }}>
                      <div style={{ marginBottom: '4px' }}>{d.label}</div>
                      {!d.isHoliday && (
                        <select 
                          title="เลือกให้ทุกคนในวันนี้"
                          onChange={(e) => {
                            handleColumnCheckAll(d.date, e.target.value);
                            e.target.value = ""; 
                          }}
                          style={{
                            width: '100%',
                            fontSize: '10px',
                            padding: '2px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <option value="">ทั้งหมด▾</option>
                          <option value="มา">มา</option>
                          <option value="ขาด">ขาด</option>
                          <option value="ไม่มีเรียน">ไม่มีเรียน</option>
                          <option value="-">- (ล้างข้อมูล)</option>
                        </select>
                      )}
                    </th>
                  ))}
                  
                  <th colSpan="3" style={{ border: '1px solid #d1d5db', padding: '12px', backgroundColor: '#fdf2f8', color: '#9d174d', textAlign: 'center' }}>สรุปผล (เต็ม {TOTAL_WORK_DAYS} วัน)</th>
                </tr>
                <tr>
                   {LINEUP_DATES.map((d, i) => {
                    const dayName = "วัน" + d.full.split(' ')[0];
                    return (
                      <th key={i} style={{ border: '1px solid #d1d5db', padding: '4px', backgroundColor: '#ffffff', fontSize: '10px', textAlign: 'center', color: '#6b7280' }}>
                        {d.isHoliday ? d.note : dayName}
                      </th>
                    );
                  })}
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', backgroundColor: '#ffffff', fontSize: '12px', textAlign: 'center', color: '#4b5563' }}>มา</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', backgroundColor: '#ffffff', fontSize: '12px', textAlign: 'center', color: '#4b5563' }}>ขาด</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', backgroundColor: '#ffffff', fontSize: '12px', textAlign: 'center', color: '#4b5563' }}>ร้อยละ (%)</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(stu => {
                  if (stu.is_dual_voc) {
                    return (
                      <tr key={stu.student_id} style={{ borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                        <td className="hide-on-mobile" style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', padding: '10px', textAlign: 'center', color: '#64748b' }}>{stu.student_id}</td>
                        <td className="td-sticky-name" style={{ position: 'sticky', left: '80px', zIndex: 5, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', padding: '10px', color: '#64748b', fontWeight: '500' }}>{stu.full_name}</td>
                        <td colSpan={LINEUP_DATES.length + 3} style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', fontWeight: 'bold' }}>
                           นักเรียนระบบทวิภาคี (ไม่ต้องเช็คแถว)
                        </td>
                      </tr>
                    );
                  }

                  let presentCount = 0;
                  let absentCount = 0;

                  return (
                    <tr key={stu.student_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td className="hide-on-mobile" style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '10px', textAlign: 'center', color: '#374151' }}>{stu.student_id}</td>
                      <td className="td-sticky-name" style={{ position: 'sticky', left: '80px', zIndex: 5, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '10px', color: '#374151', fontWeight: '500' }}>{stu.full_name}</td>
                      
                      {LINEUP_DATES.map((d, i) => {
                        if (d.isHoliday) {
                          return <td key={i} style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'center', backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>วันหยุด</td>;
                        }

                        const status = attendanceData[stu.student_id]?.[d.date] || '';
                        
                        if (status === 'มา' || status === 'ไม่มีเรียน') presentCount++;
                        if (status === 'ขาด') absentCount++;

                        return (
                          <td key={i} style={{ border: '1px solid #e5e7eb', padding: '4px', textAlign: 'center' }}>
                            <select 
                              value={status} 
                              onChange={(e) => handleStatusChange(stu.student_id, d.date, e.target.value)}
                              style={{ 
                                width: '100%', 
                                minWidth: '55px', 
                                padding: '4px 0', 
                                fontSize: '12px', 
                                textAlign: 'center', 
                                borderRadius: '4px', 
                                border: '1px solid #cbd5e1', 
                                backgroundColor: status === 'มา' ? '#d1fae5' : status === 'ขาด' ? '#fee2e2' : status === 'ไม่มีเรียน' ? '#ede9fe' : '#ffffff', 
                                color: status === 'มา' ? '#065f46' : status === 'ขาด' ? '#991b1b' : status === 'ไม่มีเรียน' ? '#7c3aed' : '#333',
                                fontWeight: status ? 'bold' : 'normal'
                              }}
                            >
                              <option value="">-</option>
                              <option value="มา">มา</option>
                              <option value="ขาด">ขาด</option>
                              <option value="ไม่มีเรียน">ไม่มีเรียน</option>
                            </select>
                          </td>
                        )
                      })}

                      <td style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#059669' }}>{presentCount}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>{absentCount}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: (presentCount / TOTAL_WORK_DAYS) >= 0.5 ? '#059669' : '#dc2626' }}>
                        {Math.round((presentCount / TOTAL_WORK_DAYS) * 100)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div style={{ padding: '20px', background: '#f8fafc', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ color: '#64748b' }}>ผู้บันทึก: {user?.full_name || 'Admin'}</span>
             <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ padding: '12px 30px', fontSize: '16px', borderRadius: '8px' }}>
              {loading ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูลเช็คแถว'}
            </button>
          </div>
        </div>
      ) : selectedRoom ? (
         <p style={{ textAlign: 'center', color: '#ff416c', fontWeight: 'bold' }}>ไม่พบข้อมูลนักเรียนในห้องนี้</p>
      ) : allowedRooms.length > 0 ? (
         <p style={{ textAlign: 'center', color: '#666' }}>กรุณาเลือกห้องเรียนเพื่อลงข้อมูลเช็คแถว</p>
      ) : null}
    </div>
  )
}

export default LineUpAttendance