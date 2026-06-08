import { useState } from 'react'
import { supabase } from '../supabaseClient'
import '../App.css' // อย่าลืม Import CSS ที่เราสร้างไว้

function Login({ onLogin }) {
  const [teacherCode, setTeacherCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('teacher_code', teacherCode)
      .eq('password', password)
      .single()

    if (error || !data) {
      alert('รหัสอาจารย์ หรือ รหัสผ่าน ไม่ถูกต้อง!')
    } else {
      onLogin(data)
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      
      {/* กล่อง Login สไตล์ Glass */}
      <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* โลโก้วิทยาลัย */}
        <img 
          src="https://asia.thaitec.ac.th/wp-content/uploads/2025/07/banner-copy-1024x190.png" 
          alt="College Logo" 
          style={{ width: '100%', marginBottom: '20px', dropShadow: '0px 4px 6px rgba(0,0,0,0.1)' }} 
        />
        
        <h2 className="text-gradient" style={{ margin: '0 0 20px 0', textAlign: 'center' }}>เข้าสู่ระบบ</h2>
        
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontWeight: '600', color: '#333' }}>รหัสประจำตัว:</label>
            <input 
              type="text" 
              className="glass-input"
              placeholder="เช่น T001" 
              value={teacherCode} 
              onChange={(e) => setTeacherCode(e.target.value)} 
              required 
              style={{ width: '100%', marginTop: '5px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ fontWeight: '600', color: '#333' }}>รหัสผ่าน:</label>
            <input 
              type="password" 
              className="glass-input"
              placeholder="รหัสผ่าน" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', marginTop: '5px', boxSizing: 'border-box' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '15px', padding: '12px' }}>
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login