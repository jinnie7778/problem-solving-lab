(() => {
  const SESSION_KEY = 'problemLabStudentSessionV1';
  const GROUP_SESSION_KEY = 'problemLabLesson2GroupSessionV1';
  const cfg = window.PROBLEM_LAB_CONFIG || {};
  const configured = () => !!cfg.supabaseUrl && !!cfg.supabaseKey && !cfg.supabaseUrl.includes('YOUR_') && !cfg.supabaseKey.includes('YOUR_');
  let client = null;
  if (configured() && window.supabase?.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  let lesson2MemberSession = null;
  const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const getStudentSession = () => safeParse(localStorage.getItem(SESSION_KEY) || 'null');
  const setStudentSession = (session) => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  const clearStudentSession = () => { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(GROUP_SESSION_KEY); };
  const getGroupSession = () => safeParse(localStorage.getItem(GROUP_SESSION_KEY) || 'null');
  const setGroupSession = (session) => localStorage.setItem(GROUP_SESSION_KEY, JSON.stringify(session));
  const clearGroupSession = () => localStorage.removeItem(GROUP_SESSION_KEY);
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
  function groupSessionArgs(extra = {}) {
    const g = getGroupSession();
    if (!g) return null;
    return { p_group_id: g.group_id, p_group_session_token: g.group_session_token, ...extra };
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
  async function lesson2GroupLogin({ groupName, pin, memberNames = null }) {
    const s = getStudentSession();
    if (!s) return { data: null, error: new Error('NO_SESSION') };
    const { data, error } = await rpc('lesson2_group_login', {
      p_student_id: s.student_id,
      p_session_token: s.session_token,
      p_group_name: String(groupName || '').trim(),
      p_pin: String(pin || ''),
      p_member_names: memberNames && memberNames.length ? memberNames : null
    });
    if (!error && data?.ok) {
      setGroupSession({
        group_id: data.group_id,
        group_session_token: data.group_session_token,
        grade: data.grade,
        class_no: data.class_no,
        group_name: data.group_name,
        member_names: data.member_names || []
      });
    }
    return { data, error };
  }
  async function lesson2GroupList() {
    const args = sessionArgs();
    if (!args) return { data: null, error: new Error('NO_SESSION') };
    return rpc('lesson2_group_list', args);
  }
  async function getLesson2() {
    const args = groupSessionArgs();
    if (!args) return { data: null, error: new Error('NO_GROUP_SESSION') };
    return rpc('get_lesson2', args);
  }
  async function saveLesson2(record) {
    const clean = JSON.parse(JSON.stringify(record || {}));
    delete clean.mission8;
    const args = groupSessionArgs({ p_record: clean });
    if (!args) return { data: null, error: new Error('NO_GROUP_SESSION') };
    return rpc('save_lesson2', args);
  }
  async function publishLesson2(content) {
    const args = groupSessionArgs({ p_content: content });
    if (!args) return { data: null, error: new Error('NO_GROUP_SESSION') };
    return rpc('publish_lesson2', args);
  }
  function getLesson2MemberSession() { return lesson2MemberSession; }
  function clearLesson2MemberSession() { lesson2MemberSession = null; }
  async function lesson2MemberStatus() {
    const args = groupSessionArgs();
    if (!args) return { data: null, error: new Error('NO_GROUP_SESSION') };
    return rpc('lesson2_member_status', args);
  }
  async function lesson2MemberUnlock({ memberName, pin }) {
    const args = groupSessionArgs({ p_member_name: String(memberName || '').trim(), p_pin: String(pin || '') });
    if (!args) return { data: null, error: new Error('NO_GROUP_SESSION') };
    const { data, error } = await rpc('lesson2_member_unlock', args);
    if (!error && data?.ok) {
      lesson2MemberSession = {
        student_id: data.student_id,
        member_name: data.member_name,
        individual_session_token: data.individual_session_token,
        grade: data.grade,
        class_no: data.class_no,
        group_id: data.group_id
      };
    }
    return { data, error };
  }
  function memberArgs(extra = {}) {
    const g = getGroupSession(), m = lesson2MemberSession;
    if (!g || !m) return null;
    return {
      p_group_id: g.group_id,
      p_group_session_token: g.group_session_token,
      p_student_id: m.student_id,
      p_individual_session_token: m.individual_session_token,
      ...extra
    };
  }
  async function saveLesson2Individual(record) {
    const args = memberArgs({ p_record: record || {} });
    if (!args) return { data: null, error: new Error('NO_MEMBER_SESSION') };
    return rpc('save_lesson2_individual', args);
  }
  async function publishLesson2Individual(content) {
    const args = memberArgs({ p_content: content || {} });
    if (!args) return { data: null, error: new Error('NO_MEMBER_SESSION') };
    return rpc('publish_lesson2_individual', args);
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
  async function teacherExportLesson2(pin, grade = null, classNo = null) {
    return rpc('teacher_export_lesson2', {
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
  async function teacherDeleteStudent(pin, studentId) {
    return rpc('teacher_delete_student', { p_pin: String(pin || ''), p_student_id: studentId });
  }
  window.ProblemLabAPI = {
    configured, getStudentSession, setStudentSession, clearStudentSession,
    getGroupSession, setGroupSession, clearGroupSession,
    studentLogin, getSettings, getDashboard, getLesson1, saveLesson1, publishLesson1,
    lesson2GroupLogin, lesson2GroupList, getLesson2, saveLesson2, publishLesson2,
    getLesson2MemberSession, clearLesson2MemberSession, lesson2MemberStatus, lesson2MemberUnlock, saveLesson2Individual, publishLesson2Individual,
    galleryList, toggleLike, teacherVerify, teacherSetLesson2, teacherExport, teacherExportLesson2, teacherResetStudentPin,
    teacherListStudents, teacherListGallery, teacherUpdateGalleryPost, teacherDeleteGalleryPost, teacherDeleteStudent
  };
})();
