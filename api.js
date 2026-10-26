(() => {
  const SESSION_KEY = 'problemLabStudentSessionV1';
  const cfg = window.PROBLEM_LAB_CONFIG || {};
  const configured = () => !!cfg.supabaseUrl && !!cfg.supabaseKey && !cfg.supabaseUrl.includes('YOUR_') && !cfg.supabaseKey.includes('YOUR_');
  let client = null;
  if (configured() && window.supabase?.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const getStudentSession = () => safeParse(localStorage.getItem(SESSION_KEY) || 'null');
  const setStudentSession = (session) => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  const clearStudentSession = () => localStorage.removeItem(SESSION_KEY);
  async function rpc(name, args = {}) {
    if (!configured()) return { data: null, error: new Error('SUPABASE_NOT_CONFIGURED') };
    if (!client) return { data: null, error: new Error('SUPABASE_CLIENT_NOT_READY') };
    const { data, error } = await client.rpc(name, args);
    return { data, error };
  }
  function sessionArgs(extra = {}) {
    const s = getStudentSession();
    if (!s) return null;
    return { p_student_id: s.student_id, p_session_token: s.session_token, ...extra };
  }
  async function studentLogin({ grade, classNo, name, pin }) {
    const { data, error } = await rpc('student_login', {
      p_grade: Number(grade), p_class_no: Number(classNo), p_name: String(name || '').trim(), p_pin: String(pin || '')
    });
    if (!error && data?.ok) {
      setStudentSession({
        student_id: data.student_id,
        session_token: data.session_token,
        grade: data.grade,
        class_no: data.class_no,
        name: data.name
      });
    }
    return { data, error };
  }
  async function getSettings() { return rpc('get_app_settings'); }
  async function getDashboard() {
    const args = sessionArgs();
    if (!args) return { data: null, error: new Error('NO_SESSION') };
    return rpc('get_student_dashboard', args);
  }
  async function getLesson1() {
    const args = sessionArgs();
    if (!args) return { data: null, error: new Error('NO_SESSION') };
    return rpc('get_lesson1', args);
  }
  async function saveLesson1(record) {
    const args = sessionArgs({ p_record: record });
    if (!args) return { data: null, error: new Error('NO_SESSION') };
    return rpc('save_lesson1', args);
  }
  async function publishLesson1(content) {
    const args = sessionArgs({ p_content: content });
    if (!args) return { data: null, error: new Error('NO_SESSION') };
    return rpc('publish_lesson1', args);
  }
  async function galleryList({ grade, classNo, lessonNo = 1 }) {
    const args = sessionArgs({ p_grade: Number(grade), p_class_no: Number(classNo), p_lesson_no: Number(lessonNo) });
    if (!args) return { data: null, error: new Error('NO_SESSION') };
    return rpc('gallery_list', args);
  }
  async function toggleLike(postId) {
    const args = sessionArgs({ p_post_id: postId });
    if (!args) return { data: null, error: new Error('NO_SESSION') };
    return rpc('toggle_gallery_like', args);
  }
  async function teacherVerify(pin) { return rpc('teacher_verify', { p_pin: String(pin || '') }); }
  async function teacherSetLesson2(pin, open) { return rpc('teacher_set_lesson2', { p_pin: String(pin || ''), p_open: !!open }); }
  async function teacherExport(pin, grade = null, classNo = null) {
    return rpc('teacher_export_lesson1', {
      p_pin: String(pin || ''),
      p_grade: grade === '' || grade == null ? null : Number(grade),
      p_class_no: classNo === '' || classNo == null ? null : Number(classNo)
    });
  }
  async function teacherResetStudentPin(pin, studentId, newPin) {
    return rpc('teacher_reset_student_pin', { p_pin: String(pin || ''), p_student_id: studentId, p_new_pin: String(newPin || '') });
  }
  async function teacherListStudents(pin, grade = null, classNo = null, name = '') {
    return rpc('teacher_list_students', {
      p_pin: String(pin || ''),
      p_grade: grade === '' || grade == null ? null : Number(grade),
      p_class_no: classNo === '' || classNo == null ? null : Number(classNo),
      p_name: String(name || '').trim() || null
    });
  }
  async function teacherListGallery(pin, grade = null, classNo = null, lessonNo = null) {
    return rpc('teacher_list_gallery', {
      p_pin: String(pin || ''),
      p_grade: grade === '' || grade == null ? null : Number(grade),
      p_class_no: classNo === '' || classNo == null ? null : Number(classNo),
      p_lesson_no: lessonNo === '' || lessonNo == null ? null : Number(lessonNo)
    });
  }
  async function teacherUpdateGalleryPost(pin, postId, content, published = true) {
    return rpc('teacher_update_gallery_post', {
      p_pin: String(pin || ''), p_post_id: postId, p_content: content || {}, p_published: !!published
    });
  }
  async function teacherDeleteGalleryPost(pin, postId) {
    return rpc('teacher_delete_gallery_post', { p_pin: String(pin || ''), p_post_id: postId });
  }
  window.ProblemLabAPI = {
    configured, getStudentSession, setStudentSession, clearStudentSession,
    studentLogin, getSettings, getDashboard, getLesson1, saveLesson1, publishLesson1,
    galleryList, toggleLike, teacherVerify, teacherSetLesson2, teacherExport, teacherResetStudentPin,
    teacherListStudents, teacherListGallery, teacherUpdateGalleryPost, teacherDeleteGalleryPost
  };
})();
