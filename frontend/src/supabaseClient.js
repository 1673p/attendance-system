import { createClient } from '@supabase/supabase-js'

// เอา URL และ Key ของคุณมาใส่ในเครื่องหมายคำพูด (Quotes) ตรงๆ แบบนี้เลยครับ
const supabaseUrl = 'https://akxiycpdltnauxiktsou.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFreGl5Y3BkbHRuYXV4aWt0c291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Nzk1MjksImV4cCI6MjA5NjM1NTUyOX0.HgAgPYjx9WaYlVuaZkYmV77DKU1wPpSA1_qU-YYLPh0'

export const supabase = createClient(supabaseUrl, supabaseKey)