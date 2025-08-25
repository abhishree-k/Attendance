// public/script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc,
  collection, onSnapshot, query, where, getDocs, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getMessaging, getToken, onMessage, isSupported
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2OP6rlzsvIn_l0WcezTLXkLisu3AvpvI",
  authDomain: "attendance-management-3f5f5.firebaseapp.com",
  projectId: "attendance-management-3f5f5",
  storageBucket: "attendance-management-3f5f5.firebasestorage.app",
  messagingSenderId: "593219809299",
  appId: "1:593219809299:web:a59c8988ba774fb54a0fe6",
  measurementId: "G-8MV6TKKSE5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentRole = null;
let classesCache = [];
let selectedClass = null;

const qs = (s)=>document.querySelector(s);
const qsa = (s)=>document.querySelectorAll(s);
const show = (el)=>el.classList.remove('hidden');
const hide = (el)=>el.classList.add('hidden');
const todayISO = ()=> new Date().toISOString().slice(0,10);

// Elements
const navLinks = qsa('.nav-links a');
const authSection = qs('#authSection');
const dashboardSection = qs('#dashboardSection');
const studentsSection = qs('#studentsSection');
const attendanceSection = qs('#attendanceSection');
const reportsSection = qs('#reportsSection');
const timetableSection = qs('#timetableSection');
const holidaysSection = qs('#holidaysSection');
const classesSection = qs('#classesSection');

const userRoleBadge = qs('#userRoleBadge');
const loginBtn = qs('#loginBtn');
const logoutBtn = qs('#logoutBtn');
const notifyBtn = qs('#notifyBtn');
const hamburger = qs('#hamburger');

const authForm = qs('#authForm');
const signupBtn = qs('#signup');
const todayLabel = qs('#todayLabel');

const addStudentBtn = qs('#addStudentBtn');
const studentsBody = qs('#studentsBody');
const studentModal = qs('#studentModal');
const modalOverlay = qs('#modalOverlay');
const saveStudentBtn = qs('#saveStudent');
const cancelStudentBtn = qs('#cancelStudent');

const addClassBtn = qs('#addClassBtn');
const classesBody = qs('#classesBody');
const classModal = qs('#classModal');
const saveClassBtn = qs('#saveClass');
const cancelClassBtn = qs('#cancelClass');

const attDate = qs('#attDate');
const attClass = qs('#attClass');
const attendanceList = qs('#attendanceList');
const saveAttendanceBtn = qs('#saveAttendanceBtn');

const reportClass = qs('#reportClass');
const reportRange = qs('#reportRange');
const reportDate = qs('#reportDate');
const runReportBtn = qs('#runReport');
const reportResults = qs('#reportResults');

const ttClass = qs('#ttClass');
const timetableGrid = qs('#timetableGrid');
const saveTimetableBtn = qs('#saveTimetableBtn');

const holidayDate = qs('#holidayDate');
const holidayLabel = qs('#holidayLabel');
const addHolidayBtn = qs('#addHolidayBtn');
const holidayList = qs('#holidayList');

const statPresent = qs('#statPresent');
const statAbsent = qs('#statAbsent');
const statClasses = qs('#statClasses');
const statStudents = qs('#statStudents');

// helpers
const isAdmin = () => currentRole === 'admin';
const canEdit = () => ['admin','teacher'].includes(currentRole);

// Simple toast for notifications / messages
function toast(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position = 'fixed';
  el.style.bottom = '18px';
  el.style.right = '18px';
  el.style.padding = '12px 14px';
  el.style.borderRadius = '12px';
  el.style.background = 'rgba(255,255,255,0.12)';
  el.style.backdropFilter = 'blur(8px)';
  el.style.border = '1px solid rgba(255,255,255,0.18)';
  el.style.color = '#fff';
  el.style.zIndex = 9999;
  el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 3500);
}

// Warn if Firebase config looks placeholder or missing
if(!firebaseConfig?.apiKey || firebaseConfig.apiKey.includes('EXAMPLE')){
  console.error('Missing/placeholder Firebase config. Update firebaseConfig in public/script.js with your project settings.');
  toast('App not configured: update Firebase keys in script.js');
}

// NAV
navLinks.forEach(a => a.addEventListener('click', () => {
  navLinks.forEach(n => n.classList.remove('active'));
  a.classList.add('active');
  routeTo(a.dataset.nav);
}));

hamburger.addEventListener('click', () => {
  const links = document.querySelector('.nav-links');
  const open = getComputedStyle(links).display !== 'none';
  links.style.display = open ? 'none' : 'flex';
});

function routeTo(view){
  [authSection, dashboardSection, studentsSection, attendanceSection, reportsSection, timetableSection, holidaysSection, classesSection]
    .forEach(hide);
  switch(view){
    case 'dashboard': show(dashboardSection); break;
    case 'students': show(studentsSection); break;
    case 'attendance': show(attendanceSection); break;
    case 'reports': show(reportsSection); break;
    case 'timetable': show(timetableSection); break;
    case 'holidays': show(holidaysSection); break;
    case 'classes': show(classesSection); break;
    default: show(dashboardSection);
  }
}

// AUTH
authForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = qs('#authEmail').value.trim();
  const pwd = qs('#authPassword').value;
  try{
    await signInWithEmailAndPassword(auth, email, pwd);
  }catch(err){
    console.error('Login failed:', err);
    toast(`Login failed: ${err.code || err.message}`);
  }
});
signupBtn.addEventListener('click', async ()=>{
  const name = qs('#authName').value.trim();
  const email = qs('#authEmail').value.trim();
  const pwd = qs('#authPassword').value;
  const role = qs('#authRole').value;
  try{
    const { user } = await createUserWithEmailAndPassword(auth, email, pwd);
    if(name) await updateProfile(user, { displayName: name });
    // default profile doc
    await setDoc(doc(db, 'users', user.uid), { name: name || email, email, role });
    toast('Signed up! You can now log in.');
  }catch(err){
    console.error('Signup failed:', err);
    toast(`Signup failed: ${err.code || err.message}`);
  }
});
logoutBtn.addEventListener('click', ()=> signOut(auth));

loginBtn.addEventListener('click', ()=>{
  navLinks.forEach(n => n.classList.remove('active'));
  show(authSection);
  [dashboardSection, studentsSection, attendanceSection, reportsSection, timetableSection, holidaysSection, classesSection]
    .forEach(hide);
});

// On auth change
onAuthStateChanged(auth, async (user)=>{
  currentUser = user || null;
  if(!user){
    currentRole = null;
    userRoleBadge.textContent = 'Guest';
    userRoleBadge.className = 'badge';
    hide(logoutBtn); show(loginBtn); hide(notifyBtn);
    show(authSection);
    [dashboardSection, studentsSection, attendanceSection, reportsSection, timetableSection, holidaysSection, classesSection].forEach(hide);
    return;
  }
  show(logoutBtn); hide(loginBtn); show(notifyBtn);
  const snap = await getDoc(doc(db, 'users', user.uid));
  currentRole = snap.exists() ? snap.data().role : 'student';
  userRoleBadge.textContent = currentRole.toUpperCase();
  userRoleBadge.className = `badge role-${currentRole}`;

  hide(authSection);
  routeTo('dashboard');

  bootData().catch(console.error);
  initFCM().catch(()=>{}); // non-blocking
});

// DATA BOOTSTRAP
async function bootData(){
  todayLabel.textContent = new Date().toLocaleDateString();

  // classes
  const cls = await getDocs(collection(db, 'classes'));
  classesCache = cls.docs.map(d=>({ id:d.id, ...d.data() }));
  
  // If no classes exist, create some default ones
  if(classesCache.length === 0 && isAdmin()) {
    await createDefaultClasses();
    const cls = await getDocs(collection(db, 'classes'));
    classesCache = cls.docs.map(d=>({ id:d.id, ...d.data() }));
  }
  
  fillSelect(attClass, classesCache);
  fillSelect(reportClass, classesCache);
  fillSelect(ttClass, classesCache);
  statClasses.textContent = classesCache.length;

  // students stat + list
  onSnapshot(collection(db,'students'), (snap)=>{
    const students = snap.docs
      .map(d=>({id:d.id, ...d.data()}))
      .filter(s => !s.deleted);
    statStudents.textContent = students.length;
    renderStudents(students);
  });

  // classes list
  onSnapshot(collection(db,'classes'), (snap)=>{
    const classes = snap.docs
      .map(d=>({id:d.id, ...d.data()}))
      .filter(c => !c.deleted);
    renderClasses(classes);
  });

  // today attendance stats (will refresh on class change too)
  attDate.value = todayISO();
  if(classesCache[0]) { selectedClass = classesCache[0].id; attClass.value = selectedClass; }
  loadAttendanceList();

  attClass.addEventListener('change', ()=>{
    selectedClass = attClass.value;
    loadAttendanceList();
  });
  attDate.addEventListener('change', loadAttendanceList);

  // reports
  reportDate.value = todayISO();
  runReportBtn.addEventListener('click', runReport);

  // timetable
  if(classesCache[0]) renderTimetable(ttClass.value = classesCache[0].id);
  ttClass.addEventListener('change', ()=> renderTimetable(ttClass.value));
  saveTimetableBtn.addEventListener('click', saveTimetable);

  // holidays
  loadHolidays();
}

function fillSelect(sel, arr){
  sel.innerHTML = '';
  arr.forEach(c=>{
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name || c.id;
    sel.appendChild(o);
  });
}

async function createDefaultClasses(){
  const defaultClasses = [
    { name: 'Class 10A', code: '10A', department: 'Science', capacity: 30 },
    { name: 'Class 10B', code: '10B', department: 'Science', capacity: 30 },
    { name: 'Class 11A', code: '11A', department: 'Science', capacity: 25 },
    { name: 'Class 11B', code: '11B', department: 'Commerce', capacity: 25 },
    { name: 'Class 12A', code: '12A', department: 'Science', capacity: 20 },
    { name: 'Class 12B', code: '12B', department: 'Commerce', capacity: 20 }
  ];
  
  for(const cls of defaultClasses) {
    await addDoc(collection(db, 'classes'), cls);
  }
  toast('Default classes created!');
}

// CLASSES
addClassBtn?.addEventListener('click', ()=>{
  if(!canEdit()) return alert('Only Admin/Teacher can add classes');
  openClassModal();
});

function openClassModal(cls=null){
  qs('#classModalTitle').textContent = cls ? 'Edit Class' : 'Add Class';
  qs('#cName').value = cls?.name || '';
  qs('#cCode').value = cls?.code || '';
  qs('#cDepartment').value = cls?.department || '';
  qs('#cCapacity').value = cls?.capacity || '';
  saveClassBtn.dataset.id = cls?.id || '';
  show(classModal); show(modalOverlay);
}

cancelClassBtn.addEventListener('click', ()=>{ hide(classModal); hide(modalOverlay); });

saveClassBtn.addEventListener('click', async ()=>{
  if(!canEdit()) return alert('Only Admin/Teacher can save classes');
  const payload = {
    name: qs('#cName').value.trim(),
    code: qs('#cCode').value.trim(),
    department: qs('#cDepartment').value.trim(),
    capacity: parseInt(qs('#cCapacity').value) || 0
  };
  const id = saveClassBtn.dataset.id;
  if(!payload.name || !payload.code) return alert('Name and Code are required');
  
  try {
    if(id){
      await updateDoc(doc(db,'classes', id), payload);
    }else{
      await addDoc(collection(db,'classes'), payload);
    }
    hide(classModal); hide(modalOverlay);
    toast('Class saved successfully!');
    // Refresh classes cache
    const cls = await getDocs(collection(db, 'classes'));
    classesCache = cls.docs.map(d=>({ id:d.id, ...d.data() }));
    fillSelect(attClass, classesCache);
    fillSelect(reportClass, classesCache);
    fillSelect(ttClass, classesCache);
    statClasses.textContent = classesCache.length;
  } catch(err) {
    console.error('Error saving class:', err);
    toast('Error saving class: ' + err.message);
  }
});

function renderClasses(classes){
  classesBody.innerHTML = '';
  classes.forEach(c=>{
    const row = document.createElement('div');
    row.className = 't-row';
    row.innerHTML = `
      <div>${c.name}</div>
      <div>${c.code || '-'}</div>
      <div>${c.department || '-'}</div>
      <div>${c.capacity || '-'}</div>
      <div class="actions">
        <button class="btn subtle edit" ${!canEdit()?'disabled':''}>✏️</button>
        <button class="btn danger del" ${!canEdit()?'disabled':''}>🗑️</button>
      </div>
    `;
    row.querySelector('.edit').addEventListener('click', ()=> openClassModal({id:c.id, ...c}));
    row.querySelector('.del').addEventListener('click', async ()=>{
      if(!canEdit()) return;
      if(confirm(`Delete class ${c.name}?`)){
        await updateDoc(doc(db,'classes', c.id), { deleted:true }); // soft delete
      }
    });
    classesBody.appendChild(row);
  });
}

// STUDENTS
addStudentBtn?.addEventListener('click', ()=>{
  if(!canEdit()) return alert('Only Admin/Teacher can add');
  openStudentModal();
});
function openStudentModal(student=null){
  qs('#studentModalTitle').textContent = student ? 'Edit Student' : 'Add Student';
  qs('#sName').value = student?.name || '';
  qs('#sRoll').value = student?.roll || '';
  qs('#sDepartment').value = student?.department || '';
  
  // Fill class dropdown
  const classSelect = qs('#sClass');
  classSelect.innerHTML = '<option value="">Select Class</option>';
  classesCache.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = c.name;
    if(student?.classId === c.id) option.selected = true;
    classSelect.appendChild(option);
  });
  
  qs('#sPhone').value = student?.contact?.phone || '';
  qs('#sEmail').value = student?.contact?.email || '';
  saveStudentBtn.dataset.id = student?.id || '';
  show(studentModal); show(modalOverlay);
}
cancelStudentBtn.addEventListener('click', ()=>{ hide(studentModal); hide(modalOverlay); });

saveStudentBtn.addEventListener('click', async ()=>{
  if(!canEdit()) return alert('Only Admin/Teacher can save');
  const payload = {
    name: qs('#sName').value.trim(),
    roll: qs('#sRoll').value.trim(),
    department: qs('#sDepartment').value.trim(),
    classId: qs('#sClass').value.trim(),
    contact: { phone: qs('#sPhone').value.trim(), email: qs('#sEmail').value.trim() }
  };
  const id = saveStudentBtn.dataset.id;
  if(!payload.name || !payload.classId) return alert('Name and Class ID are required');
  if(id){
    await updateDoc(doc(db,'students', id), payload);
  }else{
    await addDoc(collection(db,'students'), payload);
  }
  hide(studentModal); hide(modalOverlay);
});

function renderStudents(students){
  studentsBody.innerHTML = '';
  students.forEach(s=>{
    const className = classesCache.find(c => c.id === s.classId)?.name || s.classId || '-';
    const row = document.createElement('div');
    row.className = 't-row';
    row.innerHTML = `
      <div>${s.name}</div>
      <div>${s.roll || '-'}</div>
      <div>${className}</div>
      <div>${s.department || '-'}</div>
      <div>${s.contact?.phone || s.contact?.email || '-'}</div>
      <div class="actions">
        <button class="btn subtle edit" ${!canEdit()?'disabled':''}>✏️</button>
        <button class="btn danger del" ${!canEdit()?'disabled':''}>🗑️</button>
      </div>
    `;
    row.querySelector('.edit').addEventListener('click', ()=> openStudentModal({id:s.id, ...s}));
    row.querySelector('.del').addEventListener('click', async ()=>{
      if(!canEdit()) return;
      if(confirm(`Delete ${s.name}?`)){
        await updateDoc(doc(db,'students', s.id), { deleted:true }); // soft delete
      }
    });
    studentsBody.appendChild(row);
  });
}

// ATTENDANCE
let attendanceUnsub = null;
async function loadAttendanceList(){
  const date = attDate.value || todayISO();
  const cls = attClass.value;
  attendanceList.innerHTML = '';

  if(!cls){
    attendanceList.innerHTML = `<div class="card">No class selected.</div>`;
    return;
  }

  // Holiday block
  const holidaySnap = await getDocs(query(collection(db,'holidays'), where('date','==',date)));
  if(!holidaySnap.empty){
    attendanceList.innerHTML = `<div class="card">Holiday: ${holidaySnap.docs[0].data().label}</div>`;
    updateTodayStatsUI(true);
    return;
  }

  // students in class
  const all = await getDocs(query(collection(db,'students'), where('classId','==',cls)));
  const students = all.docs.map(d=>({id:d.id, ...d.data()})).filter(s=>!s.deleted);
  const className = classesCache.find(c=>c.id===cls)?.name || cls;
  if(students.length === 0){
    attendanceList.innerHTML = `<div class="card">No students in class ${className}. <br>Add students and assign them to this class first.</div>`;
    updateTodayStatsUI(true);
    return;
  }

  students.forEach(s=>{
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div class="row">
        <span class="status-dot" id="dot_${s.id}"></span>
        <strong>${s.name}</strong>
        <span class="muted">(${s.roll || s.id})</span>
      </div>
      <div class="row">
        <label><input type="radio" name="att_${s.id}" value="present"> Present</label>
        <label><input type="radio" name="att_${s.id}" value="absent"> Absent</label>
        <label><input type="radio" name="att_${s.id}" value="leave"> Leave</label>
      </div>
    `;
    attendanceList.appendChild(item);
  });

  // realtime listen to statuses
  if(attendanceUnsub) attendanceUnsub();
  const path = collection(db,'attendance', date, `class_${cls}`);
  attendanceUnsub = onSnapshot(path, (snap)=>{
    snap.docChanges().forEach(ch=>{
      const sId = ch.doc.id;
      const st = ch.doc.data().status;
      const dot = qs(`#dot_${sId}`);
      if(dot){
        dot.className = `status-dot ${st}`;
        const radios = attendanceList.querySelectorAll(`input[name="att_${sId}"]`);
        radios.forEach(r => r.checked = (r.value === st));
      }
    });
    updateTodayStatsUI();
  });
}

saveAttendanceBtn.addEventListener('click', async ()=>{
  if(!canEdit()) return alert('Only Admin/Teacher can mark.');
  const date = attDate.value || todayISO();
  const cls = attClass.value;
  const radios = attendanceList.querySelectorAll('input[type="radio"]:checked');
  if(radios.length === 0) return toast('Nothing to save yet.');
  
  try {
    for(const r of radios){
      const [_, sid] = r.name.split('att_');
      await setDoc(doc(db,'attendance', date, `class_${cls}`, sid), {
        status: r.value, markedBy: currentUser.uid, ts: Date.now()
      }, { merge:true });
    }
    toast('Attendance saved!');
  } catch(err) {
    console.error('Error saving attendance:', err);
    toast('Error saving attendance: ' + err.message);
  }
});

// DASHBOARD STATS
async function updateTodayStatsUI(empty=false){
  if(empty){
    statPresent.textContent = 0;
    statAbsent.textContent = 0;
    qs('#todaySummary').innerHTML = '';
    return;
  }
  const date = attDate.value || todayISO();
  const cls = attClass.value;
  if(!cls) return;
  const snap = await getDocs(collection(db,'attendance', date, `class_${cls}`));
  let present=0, absent=0;
  snap.forEach(d=>{ const st=d.data().status; if(st==='present') present++; else if(st==='absent') absent++; });
  statPresent.textContent = present;
  statAbsent.textContent = absent;
  const pills = [];
  const className = classesCache.find(c=>c.id===cls)?.name || cls;
  pills.push(`<span class="pill">Class: ${className}</span>`);
  pills.push(`<span class="pill">Date: ${date}</span>`);
  pills.push(`<span class="pill">Present: ${present}</span>`);
  pills.push(`<span class="pill">Absent: ${absent}</span>`);
  qs('#todaySummary').innerHTML = pills.join('');
}

// REPORTS
runReportBtn.addEventListener('click', runReport);
async function runReport(){
  const range = reportRange.value;
  const date = reportDate.value || todayISO();
  const cls = reportClass.value;
  const results = await computeReport(range, date, cls);
  renderReport(results);
}
async function computeReport(range, dateISO, classId){
  const base = new Date(dateISO);
  let days = 1;
  if(range==='weekly') days = 7;
  if(range==='monthly') days = 30;

  let present=0, absent=0, total=0;
  for(let i=0;i<days;i++){
    const d = new Date(base);
    d.setDate(base.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const snap = await getDocs(collection(db,'attendance', key, `class_${classId}`));
    snap.forEach(doc=>{ total++; const st = doc.data().status; if(st==='present') present++; else if(st==='absent') absent++; });
  }
  const pct = total ? Math.round((present/total)*100) : 0;
  return { range, dateISO, classId, present, absent, total, pct };
}
function renderReport(r){
  reportResults.innerHTML = `
    <div class="stat-card"><div class="stat-value">${r.pct}%</div><div class="stat-label">Attendance</div></div>
    <div class="stat-card"><div class="stat-value">${r.present}</div><div class="stat-label">Present</div></div>
    <div class="stat-card"><div class="stat-value">${r.absent}</div><div class="stat-label">Absent</div></div>
    <div class="stat-card"><div class="stat-value">${r.total}</div><div class="stat-label">Records</div></div>
  `;
}

// TIMETABLE
async function renderTimetable(classId){
  timetableGrid.innerHTML = '';
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat'];
  const head = ['Time', ...days].map(h=>`<div class="tt-head">${h}</div>`).join('');
  timetableGrid.innerHTML += head;

  // define 6 periods (edit as needed)
  const periods = [
    { start:'09:00', end:'10:00' },
    { start:'10:00', end:'11:00' },
    { start:'11:00', end:'12:00' },
    { start:'12:00', end:'13:00' },
    { start:'14:00', end:'15:00' },
    { start:'15:00', end:'16:00' },
  ];

  // existing data
  const docRef = doc(db,'timetable', classId);
  const existing = await getDoc(docRef);
  const week = existing.exists() ? (existing.data().week || {}) : {};

  for(let p=0; p<periods.length; p++){
    // time column
    const tcell = document.createElement('div');
    tcell.className = 'tt-cell';
    tcell.innerHTML = `${periods[p].start}–${periods[p].end}`;
    timetableGrid.appendChild(tcell);

    // 6 day columns
    for(let d=0; d<days.length; d++){
      const dayKey = days[d].toLowerCase(); // mon, tue...
      const val = (week[dayKey]?.[p]?.subject) || '';
      const cell = document.createElement('div');
      cell.className = 'tt-cell';
      cell.innerHTML = `<input class="tt-input" id="tt_${dayKey}_${p}" placeholder="Subject" value="${val}">`;
      timetableGrid.appendChild(cell);
    }
  }
}

async function saveTimetable(){
  if(!canEdit()) return alert('Only Admin/Teacher can edit timetable.');
  const classId = ttClass.value;
  const days = ['mon','tue','wed','thu','fri','sat'];
  const periods = 6;

  const week = {};
  for(const day of days){
    week[day] = [];
    for(let p=0; p<periods; p++){
      const v = (qs(`#tt_${day}_${p}`)?.value || '').trim();
      week[day].push({ subject: v });
    }
  }
  await setDoc(doc(db,'timetable', classId), { week }, { merge:true });
  toast('Timetable saved.');
}

// HOLIDAYS
function loadHolidays(){
  // realtime sorted by date
  const qH = query(collection(db,'holidays'), orderBy('date','asc'));
  onSnapshot(qH, (snap)=>{
    holidayList.innerHTML = '';
    snap.docs.forEach(d=>{
      const h = { id: d.id, ...d.data() };
      const el = document.createElement('div');
      el.className = 'item';
      el.innerHTML = `
        <div class="row">
          <strong>${h.label}</strong>
          <span class="muted">${h.date}</span>
        </div>
        <div class="row">
          <button class="btn subtle edit" ${!isAdmin()?'disabled':''}>✏️</button>
          <button class="btn danger del" ${!isAdmin()?'disabled':''}>🗑️</button>
        </div>
      `;
      el.querySelector('.edit').addEventListener('click', async ()=>{
        if(!isAdmin()) return;
        const newLabel = prompt('Edit holiday label:', h.label) ?? h.label;
        const newDate = prompt('Edit holiday date (YYYY-MM-DD):', h.date) ?? h.date;
        if(!newLabel || !newDate) return;
        await updateDoc(doc(db,'holidays', h.id), { label: newLabel, date: newDate });
        toast('Holiday updated.');
      });
      el.querySelector('.del').addEventListener('click', async ()=>{
        if(!isAdmin()) return;
        if(confirm(`Delete holiday "${h.label}" (${h.date})?`)){
          await updateDoc(doc(db,'holidays', h.id), { deleted: true });
          toast('Holiday deleted (soft).');
        }
      });
      holidayList.appendChild(el);
    });
  });
}

addHolidayBtn.addEventListener('click', async ()=>{
  if(!isAdmin()) return alert('Only Admin can add holidays.');
  const date = (holidayDate.value || '').trim();
  const label = (holidayLabel.value || '').trim();
  if(!date || !label) return alert('Date and label required.');
  await addDoc(collection(db,'holidays'), { date, label });
  holidayDate.value = ''; holidayLabel.value = '';
  toast('Holiday added.');
});

// FCM (web push)
async function initFCM(){
  if(!currentUser) return;
  if(!await isSupported()) return; // graceful
  if(!('serviceWorker' in navigator)) return;

  // register service worker
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  // permission
  const permission = await Notification.requestPermission();
  if(permission !== 'granted') return;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: firebaseConfig.vapidKey,
    serviceWorkerRegistration: reg
  });

  if(token){
    // store for this user
    const ref = doc(db, 'fcmTokens', currentUser.uid);
    const snap = await getDoc(ref);
    let tokens = [];
    if(snap.exists()) tokens = snap.data().tokens || [];
    if(!tokens.includes(token)) {
      tokens.push(token);
      await setDoc(ref, { tokens }, { merge: true });
    }
    toast('Notifications enabled.');
  }

  // foreground messages
  onMessage(messaging, (payload)=>{
    const title = payload?.notification?.title || 'Notification';
    const body = payload?.notification?.body || '';
    toast(`${title}: ${body}`);
  });
}

notifyBtn.addEventListener('click', ()=> initFCM());

// bootstrap default route for guests
routeTo('dashboard');
