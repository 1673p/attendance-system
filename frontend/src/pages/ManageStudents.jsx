import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import '../App.css'

function ManageStudents() {
  const [students, setStudents] = useState([])
  const [formData, setFormData] = useState({ student_id: '', full_name: '', class_room: '', is_dual_voc: false })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')

  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({ full_name: '', class_room: '', is_dual_voc: false })

  const fetchData = async () => {
    const { data } = await supabase.from('students').select('*')
    setStudents(data || [])
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('students').insert([formData])
    if (error) alert('Error: ' + error.message)
    else { 
      alert('บันทึกสำเร็จ'); 
      setFormData({ student_id: '', full_name: '', class_room: '', is_dual_voc: false }); 
      fetchData() 
    }
  }

  const handleDelete = async (studentId) => {
    if (!window.confirm("แน่ใจหรือไม่ที่จะลบข้อมูลนักเรียนคนนี้?")) return;
    const { error } = await supabase.from('students').delete().eq('student_id', studentId)
    if (error) alert('ลบไม่สำเร็จ: ' + error.message)
    else { alert('ลบเรียบร้อย'); fetchData() }
  }

  const handleEditClick = (student) => {
    setEditingId(student.student_id)
    setEditFormData({ 
      full_name: student.full_name, 
      class_room: student.class_room, 
      is_dual_voc: student.is_dual_voc 
    })
  }

  const handleUpdate = async () => {
    const { error } = await supabase.from('students').update({
      full_name: editFormData.full_name,
      class_room: editFormData.class_room,
      is_dual_voc: editFormData.is_dual_voc
    }).eq('student_id', editingId)

    if (error) alert('อัปเดตไม่สำเร็จ: ' + error.message)
    else { 
      alert('อัปเดตข้อมูลเรียบร้อย'); 
      setEditingId(null); 
      fetchData() 
    }
  }

  const renderRooms = (room) => {
    if (!room) return '-';
    return room.split(',').map((r, idx) => <span key={idx} style={{ display: 'block' }}>{r.trim()}</span>);
  }

  const processedStudents = useMemo(() => {
    let result = students.filter(s => 
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.class_room.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'name_asc') return a.full_name.localeCompare(b.full_name, 'th');
      if (sortBy === 'name_desc') return b.full_name.localeCompare(a.full_name, 'th');
      if (sortBy === 'id_asc') return a.student_id.localeCompare(b.student_id);
      return 0;
    });

    return result;
  }, [students, searchTerm, sortBy])

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      
      {/* 📌 CSS เฉพาะสำหรับปรับย่อตารางบนมือถือ */}
      <style>{`
        @media (max-width: 600px) {
          .mobile-stack {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .mobile-stack > * {
            width: 100% !important;
          }
          .manage-table th, 
          .manage-table td {
            padding: 6px 2px !important;
            font-size: 10.5px !important;
            word-wrap: break-word;
          }
          .manage-table input, 
          .manage-table select {
            font-size: 10px !important;
            padding: 2px !important;
          }
          .manage-table button {
            font-size: 9px !important;
            padding: 4px 6px !important;
          }
          .manage-table .badge-voc {
            font-size: 9px !important;
            padding: 2px 4px !important;
          }
        }
      `}</style>

      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>จัดการข้อมูลนักเรียน</h2>

      {/* ใส่คลาส mobile-stack */}
      <form onSubmit={handleSubmit} className="glass-panel mobile-stack" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '25px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="glass-input" placeholder="รหัสนักเรียน" value={formData.student_id} onChange={(e) => setFormData({...formData, student_id: e.target.value})} required style={{ width: '130px', fontSize: '13px' }} />
        <input className="glass-input" placeholder="ชื่อ-นามสกุล" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required style={{ flex: 1, minWidth: '180px', fontSize: '13px' }} />
        <input className="glass-input" placeholder="ห้องเรียน" value={formData.class_room} onChange={(e) => setFormData({...formData, class_room: e.target.value})} required style={{ width: '130px', fontSize: '13px' }} />
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#ff416c', fontSize: '14px' }}>
          <input type="checkbox" checked={formData.is_dual_voc} onChange={(e) => setFormData({...formData, is_dual_voc: e.target.checked})} /> ทวิภาคี
        </label>
        <button type="submit" className="btn-success" style={{ padding: '10px 15px', fontSize: '14px' }}>➕ เพิ่มนักเรียน</button>
      </form>

      {/* ใส่คลาส mobile-stack */}
      <div className="glass-panel mobile-stack" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '20px', flexWrap: 'wrap' }}>
        <input placeholder="🔍 ค้นหารหัส, ชื่อ หรือ ห้องเรียน..." className="glass-input" onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: '200px', fontSize: '13px' }} />
        <select className="glass-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ minWidth: '180px', fontSize: '13px' }}>
          <option value="date_desc">วันที่เพิ่ม (ใหม่-เก่า)</option>
          <option value="date_asc">วันที่เพิ่ม (เก่า-ใหม่)</option>
          <option value="name_asc">ชื่อ (ก-ฮ)</option>
          <option value="name_desc">ชื่อ (ฮ-ก)</option>
          <option value="id_asc">รหัส (A-Z)</option>
        </select>
      </div>

      <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', overflow: 'hidden' }}>
        <div style={{ marginBottom: '15px', fontWeight: 'bold', color: '#FF1493' }}>พบข้อมูล: {processedStudents.length} ท่าน</div>
        
        <div className="table-responsive" style={{ width: '100%' }}>
          {/* ใส่คลาส manage-table */}
          <table className="report-table manage-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '14px', border: '1px solid #e5e7eb' }}>
            <thead>
              <tr>
                {/* ปรับสัดส่วนคอลัมน์ให้สมดุล */}
                <th style={{ padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '15%' }}>รหัส</th>
                <th style={{ padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '28%' }}>ชื่อ-นามสกุล</th>
                <th style={{ padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '15%' }}>ห้องเรียน</th>
                <th style={{ padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '15%' }}>วันที่</th>
                <th style={{ padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '12%' }}>สถานะ</th>
                <th style={{ padding: '15px', backgroundColor: '#fdf2f8', color: '#9d174d', textAlign: 'center', width: '15%' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {processedStudents.map(s => {
                const isEditing = editingId === s.student_id;
                return (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid #e5e7eb', background: s.is_dual_voc ? '#f8fafc' : '#ffffff' }}>
                    <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', overflow: 'visible' }}>{s.student_id}</td>
                    
                    <td style={{ padding: '15px' }}>
                      {isEditing ? <input className="glass-input" value={editFormData.full_name} onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})} style={{ width: '100%', padding: '6px' }} /> : s.full_name}
                    </td>
                    
                    <td style={{ padding: '15px', textAlign: 'center', color: '#FF1493', fontWeight: 'bold' }}>
                      {isEditing ? <input className="glass-input" value={editFormData.class_room} onChange={(e) => setEditFormData({...editFormData, class_room: e.target.value})} style={{ width: '100%', padding: '6px', textAlign: 'center' }} /> : renderRooms(s.class_room)}
                    </td>
                    
                    <td style={{ padding: '15px', textAlign: 'center' }}>{new Date(s.created_at).toLocaleDateString('th-TH')}</td>
                    
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {isEditing ? (
                        <input type="checkbox" checked={editFormData.is_dual_voc} onChange={(e) => setEditFormData({...editFormData, is_dual_voc: e.target.checked})} /> 
                      ) : (
                        s.is_dual_voc ? <span className="badge-voc" style={{ background: '#334155', color: '#fff', padding: '4px 6px', borderRadius: '12px', fontSize: '11px', whiteSpace: 'nowrap' }}>ทวิภาคี</span> : 'ปกติ'
                      )}
                    </td>
                    
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button onClick={handleUpdate} className="btn-success" style={{ padding: '6px 8px', fontSize: '12px', flex: 1 }}>✔</button>
                          <button onClick={() => setEditingId(null)} className="btn-outline" style={{ padding: '6px 8px', fontSize: '12px', flex: 1 }}>✖</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button onClick={() => handleEditClick(s)} className="btn-primary" style={{ padding: '6px 8px', fontSize: '12px', flex: 1 }}>✏️</button>
                          <button onClick={() => handleDelete(s.student_id)} className="btn-danger" style={{ padding: '6px 8px', fontSize: '12px', flex: 1 }}>🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ManageStudents