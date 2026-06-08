import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import '../App.css'

function ManageSubjects() {
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [formData, setFormData] = useState({ subject_code: '', subject_name: '', teacher_code: '', class_rooms: '' })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')

  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({ subject_name: '', teacher_code: '', class_rooms: '' })

  const fetchData = async () => {
    const { data: s } = await supabase.from('subjects').select('*, teachers(full_name)')
    const { data: t } = await supabase.from('teachers').select('*')
    setSubjects(s || [])
    setTeachers(t || [])
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('subjects').insert([formData])
    if (error) alert('Error: ' + error.message)
    else { 
      alert('บันทึกสำเร็จ'); 
      setFormData({ subject_code: '', subject_name: '', teacher_code: '', class_rooms: '' }); 
      fetchData();
    }
  }

  const handleDelete = async (subjectCode) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบรายวิชานี้?")) return;
    const { error } = await supabase.from('subjects').delete().eq('subject_code', subjectCode)
    if (error) alert('ลบไม่สำเร็จ: ' + error.message)
    else { alert('ลบเรียบร้อย'); fetchData() }
  }

  const handleEditClick = (sub) => {
    setEditingId(sub.subject_code)
    setEditFormData({ subject_name: sub.subject_name, teacher_code: sub.teacher_code, class_rooms: sub.class_rooms || '' })
  }

  const handleUpdate = async () => {
    const { error } = await supabase.from('subjects').update({
      subject_name: editFormData.subject_name,
      teacher_code: editFormData.teacher_code,
      class_rooms: editFormData.class_rooms
    }).eq('subject_code', editingId)
    if (error) alert('อัปเดตไม่สำเร็จ: ' + error.message)
    else { alert('อัปเดตเรียบร้อย'); setEditingId(null); fetchData() }
  }

  const renderRooms = (rooms) => {
    if (!rooms) return '-';
    return rooms.split(',').map((room, index) => <span key={index} style={{ display: 'block', marginBottom: '2px' }}>{room.trim()}</span>);
  }

  const processedSubjects = useMemo(() => {
    return subjects
      .filter(s => s.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.subject_code.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.subject_name.localeCompare(b.subject_name, 'th')
        if (sortBy === 'name_desc') return b.subject_name.localeCompare(a.subject_name, 'th')
        if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at)
        if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at)
        return 0
      })
  }, [subjects, searchTerm, sortBy])

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>จัดการรายวิชา</h2>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '30px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="glass-input" placeholder="รหัสวิชา" value={formData.subject_code} onChange={(e) => setFormData({...formData, subject_code: e.target.value})} required style={{ width: '120px', fontSize: '13px' }} />
        <input className="glass-input" placeholder="ชื่อวิชา" value={formData.subject_name} onChange={(e) => setFormData({...formData, subject_name: e.target.value})} required style={{ flex: 1, minWidth: '150px', fontSize: '13px' }} />
        <select className="glass-input" value={formData.teacher_code} onChange={(e) => setFormData({...formData, teacher_code: e.target.value})} required style={{ minWidth: '150px', fontSize: '13px' }}>
          <option value="">-- เลือกอาจารย์ --</option>
          {teachers.map(t => <option key={t.teacher_code} value={t.teacher_code}>{t.full_name}</option>)}
        </select>
        <input className="glass-input" placeholder="ห้อง (เช่น ปวช.1/1, ปวช.1/2)" value={formData.class_rooms} onChange={(e) => setFormData({...formData, class_rooms: e.target.value})} style={{ minWidth: '180px', fontSize: '13px' }} />
        <button type="submit" className="btn-success" style={{ padding: '8px 20px', fontSize: '14px' }}>➕ เพิ่มวิชา</button>
      </form>

      <div className="glass-panel" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '25px', flexWrap: 'wrap' }}>
        <input placeholder="🔍 ค้นหารหัส หรือ ชื่อวิชา..." className="glass-input" onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: '200px', fontSize: '13px' }} />
        <select className="glass-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ minWidth: '180px', fontSize: '13px' }}>
          <option value="date_desc">วันที่เพิ่ม (ใหม่ ไป เก่า)</option>
          <option value="date_asc">วันที่เพิ่ม (เก่า ไป ใหม่)</option>
          <option value="name_asc">ชื่อวิชา (ก - ฮ)</option>
          <option value="name_desc">ชื่อวิชา (ฮ - ก)</option>
        </select>
      </div>

      {/* เพิ่ม padding ในส่วนกล่องตาราง */}
      <div className="glass-panel" style={{ padding: '30px', background: '#ffffff', overflow: 'hidden' }}>
        <div style={{ marginBottom: '20px', fontWeight: 'bold', color: '#FF1493' }}>พบข้อมูล: {processedSubjects.length} วิชา</div>
        <div className="table-responsive" style={{ width: '100%' }}>
          <table className="report-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '14px', border: '1px solid #e5e7eb' }}>
            <thead>
              <tr>
                <th style={{ padding: '18px', backgroundColor: '#f9fafb', textAlign: 'center', width: '12%' }}>รหัส</th>
                <th style={{ padding: '18px', backgroundColor: '#f9fafb', textAlign: 'center', width: '28%' }}>ชื่อวิชา</th>
                <th style={{ padding: '18px', backgroundColor: '#f9fafb', textAlign: 'center', width: '18%' }}>ห้องที่สอน</th>
                <th style={{ padding: '18px', backgroundColor: '#f9fafb', textAlign: 'center', width: '18%' }}>ผู้สอน</th>
                <th style={{ padding: '18px', backgroundColor: '#f9fafb', textAlign: 'center', width: '12%' }}>วันที่เพิ่ม</th>
                <th style={{ padding: '18px', backgroundColor: '#fdf2f8', textAlign: 'center', width: '12%' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {processedSubjects.map(sub => {
                const isEditing = editingId === sub.subject_code;
                return (
                  <tr key={sub.subject_code} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '18px', textAlign: 'center', fontWeight: 'bold' }}>{sub.subject_code}</td>
                    <td style={{ padding: '18px' }}>{isEditing ? <input className="glass-input" value={editFormData.subject_name} onChange={(e) => setEditFormData({...editFormData, subject_name: e.target.value})} style={{ width: '100%', padding: '6px' }} /> : sub.subject_name}</td>
                    <td style={{ padding: '18px', textAlign: 'center', color: '#FF1493', fontWeight: '500' }}>{isEditing ? <input className="glass-input" value={editFormData.class_rooms} onChange={(e) => setEditFormData({...editFormData, class_rooms: e.target.value})} style={{ width: '100%', padding: '6px' }} /> : renderRooms(sub.class_rooms)}</td>
                    <td style={{ padding: '18px', textAlign: 'center' }}>{isEditing ? <select className="glass-input" value={editFormData.teacher_code} onChange={(e) => setEditFormData({...editFormData, teacher_code: e.target.value})} style={{ width: '100%' }}>{teachers.map(t => <option key={t.teacher_code} value={t.teacher_code}>{t.full_name}</option>)}</select> : sub.teachers?.full_name || '-'}</td>
                    <td style={{ padding: '18px', textAlign: 'center' }}>{new Date(sub.created_at).toLocaleDateString('th-TH')}</td>
                    <td style={{ padding: '18px', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button onClick={handleUpdate} className="btn-success" style={{ padding: '6px 8px', fontSize: '12px' }}>บันทึก</button>
                          <button onClick={() => setEditingId(null)} className="btn-outline" style={{ padding: '6px 8px', fontSize: '12px' }}>ยกเลิก</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button onClick={() => handleEditClick(sub)} className="btn-primary" style={{ padding: '6px 8px', fontSize: '12px' }}>แก้ไข</button>
                          <button onClick={() => handleDelete(sub.subject_code)} className="btn-danger" style={{ padding: '6px 8px', fontSize: '12px' }}>ลบ</button>
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
export default ManageSubjects