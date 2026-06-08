import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import '../App.css'

function ManageTeachers() {
  const [teachers, setTeachers] = useState([])
  const [formData, setFormData] = useState({ 
    teacher_code: '', full_name: '', password: '', advisory_room: '', role: 'teacher' 
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')
  const [editingId, setEditingId] = useState(null)
  const [editFormData, setEditFormData] = useState({ 
    full_name: '', password: '', advisory_room: '' 
  })

  const fetchData = async () => {
    const { data } = await supabase.from('teachers').select('*')
    setTeachers(data || [])
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('teachers').insert([formData])
    if (error) alert('Error: ' + error.message)
    else { 
      alert('บันทึกสำเร็จ'); 
      setFormData({ teacher_code: '', full_name: '', password: '', advisory_room: '', role: 'teacher' }); 
      fetchData() 
    }
  }

  const handleDelete = async (teacherCode) => {
    if (!window.confirm("แน่ใจหรือไม่ที่จะลบข้อมูลอาจารย์ท่านนี้?")) return;
    const { error } = await supabase.from('teachers').delete().eq('teacher_code', teacherCode)
    if (error) alert('ลบไม่สำเร็จ: ' + error.message)
    else { alert('ลบเรียบร้อย'); fetchData() }
  }

  const handleEditClick = (teacher) => {
    setEditingId(teacher.teacher_code)
    setEditFormData({ 
      full_name: teacher.full_name, 
      password: teacher.password, 
      advisory_room: teacher.advisory_room || '' 
    })
  }

  const handleUpdate = async () => {
    const { error } = await supabase.from('teachers').update({
      full_name: editFormData.full_name,
      password: editFormData.password,
      advisory_room: editFormData.advisory_room
    }).eq('teacher_code', editingId)

    if (error) alert('อัปเดตไม่สำเร็จ: ' + error.message)
    else { 
      alert('อัปเดตข้อมูลเรียบร้อย'); 
      setEditingId(null); 
      fetchData() 
    }
  }

  const processedTeachers = useMemo(() => {
    return teachers
      .filter(t => t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || t.teacher_code.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at)
        if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at)
        if (sortBy === 'name_asc') return a.full_name.localeCompare(b.full_name, 'th')
        if (sortBy === 'name_desc') return b.full_name.localeCompare(a.full_name, 'th')
        return 0
      })
  }, [teachers, searchTerm, sortBy])

  // ฟังก์ชันแยกห้องและใส่ <br /> เมื่อเจอเครื่องหมายคอมม่า
  const renderRooms = (rooms) => {
    if (!rooms) return '-';
    return rooms.split(',').map((room, index) => (
      <span key={index} style={{ display: 'block' }}>{room.trim()}</span>
    ));
  }

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2rem' }}>จัดการข้อมูลอาจารย์</h2>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '25px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input name="teacher_code" className="glass-input" placeholder="รหัสอาจารย์" value={formData.teacher_code} onChange={(e) => setFormData({...formData, teacher_code: e.target.value})} required style={{ width: '130px', fontSize: '13px' }} />
        <input name="full_name" className="glass-input" placeholder="ชื่อ-นามสกุล" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required style={{ flex: 1, minWidth: '180px', fontSize: '13px' }} />
        <input name="password" type="password" className="glass-input" placeholder="ตั้งรหัสผ่าน" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required style={{ width: '130px', fontSize: '13px' }} />
        <input name="advisory_room" className="glass-input" placeholder="ห้องประจำชั้น" value={formData.advisory_room} onChange={(e) => setFormData({...formData, advisory_room: e.target.value})} style={{ width: '150px', fontSize: '13px' }} />
        <button type="submit" className="btn-success" style={{ padding: '8px 15px', fontSize: '14px' }}>➕ เพิ่มอาจารย์</button>
      </form>

      <div className="glass-panel" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '20px', flexWrap: 'wrap' }}>
        <input placeholder="🔍 ค้นหารหัส หรือ ชื่ออาจารย์..." className="glass-input" onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: '200px', fontSize: '13px' }} />
        <select className="glass-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ minWidth: '180px', fontSize: '13px' }}>
          <option value="date_desc">วันที่เพิ่ม (ใหม่ ไป เก่า)</option>
          <option value="date_asc">วันที่เพิ่ม (เก่า ไป ใหม่)</option>
          <option value="name_asc">ชื่ออาจารย์ (ก - ฮ)</option>
          <option value="name_desc">ชื่ออาจารย์ (ฮ - ก)</option>
        </select>
      </div>

      {/* เพิ่ม Padding ด้านใน container ตารางเพื่อไม่ให้อึดอัด */}
      <div className="glass-panel" style={{ padding: '30px', background: '#ffffff', overflow: 'hidden' }}>
        <div style={{ marginBottom: '15px', fontWeight: 'bold', color: '#FF1493' }}>
          พบข้อมูล: {processedTeachers.length} ท่าน
        </div>
        
        <div className="table-responsive" style={{ width: '100%' }}>
          <table className="report-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '14px', border: '1px solid #e5e7eb' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #d1d5db', padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '10%' }}>รหัส</th>
                <th style={{ border: '1px solid #d1d5db', padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '25%' }}>ชื่อ-นามสกุล</th>
                <th style={{ border: '1px solid #d1d5db', padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '15%' }}>ห้อง</th>
                <th style={{ border: '1px solid #d1d5db', padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '15%' }}>วันที่เพิ่ม</th>
                <th style={{ border: '1px solid #d1d5db', padding: '15px', backgroundColor: '#f9fafb', textAlign: 'center', width: '10%' }}>สิทธิ์</th>
                <th style={{ border: '1px solid #d1d5db', padding: '15px', backgroundColor: '#fdf2f8', color: '#9d174d', textAlign: 'center', width: '25%' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {processedTeachers.map(t => {
                const isEditing = editingId === t.teacher_code;
                return (
                  <tr key={t.teacher_code} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>{t.teacher_code}</td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '15px' }}>{isEditing ? <input className="glass-input" value={editFormData.full_name} onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})} style={{ width: '100%', padding: '6px' }} /> : t.full_name}</td>
                    
                    {/* ใช้ฟังก์ชัน renderRooms เพื่อตัดบรรทัดเมื่อเจอ , */}
                    <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center', color: '#FF1493', fontWeight: '500' }}>
                      {isEditing ? <input className="glass-input" value={editFormData.advisory_room} onChange={(e) => setEditFormData({...editFormData, advisory_room: e.target.value})} style={{ width: '100%', padding: '6px' }} /> : renderRooms(t.advisory_room)}
                    </td>
                    
                    <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center' }}>{new Date(t.created_at).toLocaleDateString('th-TH')}</td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center' }}><span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', background: t.role === 'admin' ? '#ffeb3b' : '#e9ecef' }}>{t.role === 'admin' ? 'Admin' : 'Teacher'}</span></td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '15px', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button onClick={handleUpdate} className="btn-success" style={{ padding: '6px 10px', fontSize: '12px' }}>บันทึก</button>
                          <button onClick={() => setEditingId(null)} className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px' }}>ยกเลิก</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button onClick={() => handleEditClick(t)} className="btn-primary" style={{ padding: '6px 10px', fontSize: '12px' }}>แก้ไข</button>
                          <button onClick={() => handleDelete(t.teacher_code)} className="btn-danger" style={{ padding: '6px 10px', fontSize: '12px' }} disabled={t.role === 'admin'}>ลบ</button>
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

export default ManageTeachers