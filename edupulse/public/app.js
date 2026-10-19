// EduPulse frontend – every screen reads/writes the backend database via /api
let token = localStorage.getItem('ep_token'), user = JSON.parse(localStorage.getItem('ep_user') || 'null'), meta = {};
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const fmt = d => (d || '').slice(0, 10).split('-').reverse().join('-');

function toast(msg, ok = true) {
  const t = $('#toast'); t.textContent = (ok ? '✅ ' : '❌ ') + msg; t.style.background = ok ? '#16a34a' : '#dc2626'; t.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), 3500);
}
async function api(url, opt = {}) {
  const h = { Authorization: 'Bearer ' + token };
  if (opt.body && typeof opt.body !== 'string') { opt.body = JSON.stringify(opt.body); h['Content-Type'] = 'application/json'; }
  if (opt.csv) { h['Content-Type'] = 'text/csv'; }
  let r; try { r = await fetch('/api' + url, { ...opt, headers: h }); } catch { throw new Error('Cannot reach the server. Please check your connection.'); }
  if (r.status === 401 && token) { logout(); throw new Error('Please log in again.'); }
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.'); return j;
}
const run = fn => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, false); } };

async function login() {
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#lu').value, password: $('#lp').value }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error);
    token = j.token; user = j.user; localStorage.setItem('ep_token', token); localStorage.setItem('ep_user', JSON.stringify(user)); start();
  } catch (e) { $('#lerr').textContent = e.message || 'Unable to log in.'; }
}
function logout() { localStorage.clear(); token = null; location.hash = ''; $('#app').style.display = 'none'; $('#login').style.display = 'flex'; }
document.addEventListener('keydown', e => { if (e.key === 'Enter' && $('#login').style.display !== 'none' && !token) login(); });

const PAGES = { dashboard: 'Dashboard', students: 'Students', attendance: 'Attendance', marks: 'Marks', attention: 'Needs Attention', performance: 'Performance', notifications: 'Notifications', reports: 'Reports', settings: 'Settings' };
async function start() {
  if (!token) return; $('#login').style.display = 'none'; $('#app').style.display = 'block';
  try { meta = await api('/meta'); } catch { return; }
  $('#nav').innerHTML = Object.entries(PAGES).filter(([k]) => k !== 'settings' || user.role === 'admin').map(([k, v]) => `<a data-p="${k}" onclick="go('${k}')">${v}</a>`).join('');
  route();
}
window.addEventListener('hashchange', route);
const go = p => { location.hash = p; document.querySelector('.side').classList.remove('open'); };
function route() {
  if (!token) return; const [p, arg] = (location.hash.slice(1) || 'dashboard').split('/');
  document.querySelectorAll('.side a[data-p]').forEach(a => a.classList.toggle('on', a.dataset.p === p));
  (PAGE[p] || PAGE.dashboard)(arg).catch(e => toast(e.message, false));
}

// ----- shared UI bits -----
const opts = (arr, sel, all) => (all ? `<option value="">${all}</option>` : '') + arr.map(x => `<option ${x == sel ? 'selected' : ''}>${esc(x)}</option>`).join('');
const filterBar = (id, extra = '', required = false) => `<div class="bar">
  <select id="${id}d">${opts(meta.departments, '', required ? 'Department' : 'All departments')}</select>
  <select id="${id}y">${opts(meta.years, '', required ? 'Year' : 'All years')}</select>
  <select id="${id}s">${opts(meta.sections, '', required ? 'Section' : 'All sections')}</select>${extra}</div>`;
const fq = id => new URLSearchParams(Object.entries({ department: $('#' + id + 'd').value, year: $('#' + id + 'y').value, section: $('#' + id + 's').value }).filter(([, v]) => v)).toString();
const pill = s => `<span class="pill ${esc(s)}">${{ sent: '✅ Sent', pending: '⏳ Pending', failed: '❌ Failed', not_configured: '⚙️ Not configured' }[s] || esc(s)}</span>`;
const pct = v => (v == null ? '–' : v + '%');
function csvDownload(name, rows) {
  if (!rows.length) return toast('Nothing to download.', false);
  const k = Object.keys(rows[0]), q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([k.join(',') + '\r\n' + rows.map(r => k.map(c => q(r[c])).join(',')).join('\r\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
function setupBanner() {
  const c = meta.channels, off = [['email', 'Email'], ['sms', 'SMS'], ['whatsapp', 'WhatsApp']].filter(([k]) => !c[k]).map(([, n]) => n);
  return off.length ? `<div class="note">⚙️ ${off.join(', ')} ${off.length > 1 ? 'are' : 'is'} not configured. ${user.role === 'admin' ? '<a href="#settings">Add credentials in Settings</a>' : 'Ask the administrator to add credentials in Settings'} to enable ${off.length > 1 ? 'these alerts' : 'these alerts'}.</div>` : '';
}

const PAGE = {};
// ----- Dashboard -----
PAGE.dashboard = async () => {
  $('#view').innerHTML = `<h1>Dashboard</h1>${filterBar('f')}<div id="dash">Loading…</div>`;
  const load = run(async () => {
    const d = await api('/dashboard?' + fq('f')), c = d.channels;
    const S = (l, v, h = '') => `<div class="stat" ${h}><small>${l}</small><b>${v}</b></div>`;
    $('#dash').innerHTML = setupBanner() + `<div class="grid">${S('Total Students', d.total)}${S('Present Today', d.present)}${S('Absent Today', d.absent)}
      ${S('Average Attendance', pct(d.avg_attendance))}${S('Average Performance', pct(d.avg_performance))}
      <div class="stat" style="cursor:pointer" onclick="go('attention')"><small>Students Requiring Attention</small><b style="color:var(--bad)">${d.attention}</b></div>${S('Parent Alerts Sent', d.alerts)}</div>
      <div class="card"><b>How EduPulse works</b><p style="color:var(--g)">Student data → Attendance + Marks → Performance analysis → Students requiring attention → Parent alert (Email · SMS · WhatsApp) → Notification history</p>
      <small>Channels: ${['email', 'sms', 'whatsapp'].map(k => `${k.toUpperCase()}: ${c[k] ? '🟢 Configured' : '⚪ Not configured'}`).join(' &nbsp; ')}</small></div>
      ${d.total ? '' : '<div class="card">No students yet. Go to <a href="#students">Students</a> and click <b>+ Add Student</b>.</div>'}`;
  });
  ['fd', 'fy', 'fs'].forEach(i => ($('#' + i).onchange = load)); load();
};

// ----- Students -----
PAGE.students = async () => {
  $('#view').innerHTML = `<h1>Students</h1>${filterBar('f', `<input id="q" placeholder="Search name or register no"><button class="btn" onclick="studentForm()">+ Add Student</button>
    ${user.role === 'admin' ? '<button class="btn alt" onclick="csvModal()">Bulk Upload (CSV)</button>' : ''}`)}<div class="card wrap" id="list"></div>`;
  const load = run(async () => {
    const rows = await api('/students?' + fq('f') + '&search=' + encodeURIComponent($('#q').value));
    window._students = rows;
    $('#list').innerHTML = rows.length ? `<table><tr><th>Name</th><th>Reg No</th><th>Dept</th><th>Year</th><th>Sec</th><th>Parent</th><th>Email</th><th>Phone</th><th></th></tr>` +
      rows.map(s => `<tr><td>${esc(s.student_name)}</td><td>${esc(s.register_no)}</td><td>${esc(s.department)}</td><td>${esc(s.year)}</td><td>${esc(s.section)}</td><td>${esc(s.parent_name)}</td><td>${esc(s.parent_email)}</td><td>${esc(s.parent_phone)}</td>
      <td style="white-space:nowrap"><button class="btn sm alt" onclick="studentForm(${s.id})">Edit</button> ${user.role === 'admin' ? `<button class="btn sm red" onclick="delStudent(${s.id})">Delete</button>` : ''}</td></tr>`).join('') + '</table>'
      : 'No students found. Click <b>+ Add Student</b> to add one.';
  });
  window.reloadStudents = load; ['fd', 'fy', 'fs'].forEach(i => ($('#' + i).onchange = load)); $('#q').oninput = load; load();
};
function modal(html) { const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.innerHTML = `<div>${html}</div>`; document.body.appendChild(m); }
const closeModal = () => $('#modal')?.remove();
function studentForm(id) {
  const s = (window._students || []).find(x => x.id === id) || { year: '1', section: 'A', department: 'CSE' };
  const inp = (k, l, t = 'text') => `<label>${l}<input id="sf_${k}" type="${t}" value="${esc(s[k])}"></label>`;
  modal(`<h3 style="margin-top:0">${id ? 'Edit' : 'Add'} Student</h3><div class="form">${inp('student_name', 'Student Name')}${inp('register_no', 'Register Number')}
    <label>Department<select id="sf_department">${opts(meta.departments, s.department)}</select></label><label>Year<select id="sf_year">${opts(meta.years, s.year)}</select></label>
    <label>Section<select id="sf_section">${opts(meta.sections, s.section)}</select></label>${inp('parent_name', 'Parent Name')}${inp('parent_email', 'Parent Email', 'email')}${inp('parent_phone', 'Parent Phone Number', 'tel')}</div>
    <div class="bar" style="margin:16px 0 0"><button class="btn" onclick="saveStudent(${id || 0})">Save</button><button class="btn alt" onclick="closeModal()">Cancel</button></div>`);
}
const saveStudent = run(async id => {
  const b = {}; ['student_name', 'register_no', 'department', 'year', 'section', 'parent_name', 'parent_email', 'parent_phone'].forEach(k => (b[k] = $('#sf_' + k).value));
  const r = await api(id ? '/students/' + id : '/students', { method: id ? 'PUT' : 'POST', body: b }); closeModal(); toast(r.message); reloadStudents();
});
const delStudent = run(async id => { if (!confirm('Delete this student and their records?')) return; const r = await api('/students/' + id, { method: 'DELETE' }); toast(r.message); reloadStudents(); });

let csvText = '';
function csvModal() {
  csvText = '';
  modal(`<h3 style="margin-top:0">Bulk Upload Students</h3><p><b>Step 1.</b> <a class="btn sm alt" style="text-decoration:none;display:inline-block" href="#" onclick="dlTemplate();return false">Download CSV Template</a></p>
    <p><b>Step 2.</b> Fill it in, then upload it:</p><input type="file" id="csvf" accept=".csv,text/csv" onchange="csvPreview(this.files[0])"><div id="prev" style="margin-top:12px"></div>
    <div class="bar" style="margin:12px 0 0"><button class="btn" id="cbtn" disabled onclick="csvConfirm()">Confirm Import</button><button class="btn alt" onclick="closeModal()">Close</button></div>`);
  $('#modal>div').style.width = '900px';
}
const dlTemplate = run(async () => {
  const r = await fetch('/api/students/template.csv', { headers: { Authorization: 'Bearer ' + token } }); if (!r.ok) throw new Error('Unable to download the template.');
  const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = 'student_template.csv'; a.click();
});
const csvPreview = run(async f => {
  if (!f) return; csvText = await f.text(); $('#cbtn').disabled = true;
  const r = await api('/students/import/preview', { method: 'POST', csv: true, body: csvText });
  $('#prev').innerHTML = `<p>✅ <b>${r.valid}</b> valid rows &nbsp; ${r.invalid ? `❌ <b>${r.invalid}</b> rows with errors` : ''}</p>${r.invalid ? '<div class="note">⚠️ ' + r.invalid + ' rows contain errors. Please correct them before importing.</div>' : ''}
    <div class="wrap" style="max-height:300px"><table><tr><th>Line</th><th>Student Name</th><th>Register No</th><th>Department</th><th>Year</th><th>Section</th><th>Parent Name</th><th>Parent Email</th><th>Parent Phone</th><th>Check</th></tr>` +
    r.rows.map(x => { const d = x.data; return `<tr><td>${x.line}</td><td>${esc(d.student_name)}</td><td>${esc(d.register_no)}</td><td>${esc(d.department)}</td><td>${esc(d.year)}</td><td>${esc(d.section)}</td><td>${esc(d.parent_name)}</td><td>${esc(d.parent_email)}</td><td>${esc(d.parent_phone)}</td>
      <td>${x.errors.length ? x.errors.map(e => '❌ ' + esc(e)).join('<br>') : '✅ Valid'}</td></tr>`; }).join('') + '</table></div>';
  $('#cbtn').disabled = r.invalid > 0 || r.valid === 0;
});
const csvConfirm = run(async () => { const r = await api('/students/import/confirm', { method: 'POST', csv: true, body: csvText }); closeModal(); toast(r.message); reloadStudents(); });

// ----- Attendance -----
PAGE.attendance = async () => {
  $('#view').innerHTML = `<h1>Attendance</h1>${filterBar('f', `<input type="date" id="dt" value="${today()}"><button class="btn" onclick="loadAtt()">Show Students</button>`, true)}<div id="att" class="card">Select department, year, section and date.</div>`;
};
let attRows = [];
const loadAtt = run(async () => {
  if (!$('#fd').value || !$('#fy').value || !$('#fs').value) return toast('Please select department, year and section.', false);
  const r = await api(`/attendance?${fq('f')}&date=${$('#dt').value}`); attRows = r.students.map(s => ({ ...s, status: s.status || 'Present' }));
  drawAtt(r.saved);
});
function drawAtt(saved) {
  if (!attRows.length) return ($('#att').innerHTML = 'No students found in this class.');
  $('#att').innerHTML = `${saved ? '<div class="note">Attendance was already saved for this date. You can change it and save again.</div>' : ''}<div class="bar"><button class="btn alt" onclick="allPresent()">Mark All Present</button>
    <span id="cnt"></span></div><div class="wrap"><table><tr><th>Student</th><th>Register No</th><th>Status</th></tr>` + attRows.map((s, i) => `<tr><td>${esc(s.student_name)}</td><td>${esc(s.register_no)}</td>
    <td><div class="tog"><button class="P ${s.status === 'Present' ? 'on' : ''}" onclick="setAtt(${i},'Present')">🟢 Present</button><button class="A ${s.status === 'Absent' ? 'on' : ''}" onclick="setAtt(${i},'Absent')">🔴 Absent</button></div></td></tr>`).join('') +
    `</table></div><div class="bar" style="margin-top:14px"><button class="btn" onclick="saveAtt()">Save Attendance</button></div>`;
  const a = attRows.filter(s => s.status === 'Absent').length; $('#cnt').textContent = `Present: ${attRows.length - a}   Absent: ${a}`;
}
const setAtt = (i, s) => { attRows[i].status = s; const y = window.scrollY; drawAtt(); window.scrollTo(0, y); };
const allPresent = () => { attRows.forEach(s => (s.status = 'Present')); drawAtt(); };
const saveAtt = run(async () => {
  const r = await api('/attendance', { method: 'POST', body: { date: $('#dt').value, records: attRows.map(s => ({ student_id: s.id, status: s.status })) } });
  toast(r.message + (r.alerts ? ' Parent notification queued successfully.' : ''));
});

// ----- Marks -----
PAGE.marks = async () => {
  $('#view').innerHTML = `<h1>Marks</h1>${filterBar('f', '', true)}<div class="bar"><input id="sub" list="subl" placeholder="Subject (e.g. Mathematics)"><datalist id="subl">${meta.subjects.map(s => `<option>${esc(s)}</option>`).join('')}</datalist>
    <input id="exm" list="exl" placeholder="Exam / Test (e.g. Unit Test 1)"><datalist id="exl">${meta.exams.map(s => `<option>${esc(s)}</option>`).join('')}</datalist>
    <input id="mx" type="number" value="100" min="1" style="width:110px" title="Max mark"><button class="btn" onclick="loadMarks()">Show Students</button></div><div id="mk" class="card">Select the class, subject and exam.</div>`;
};
let mkRows = [];
const loadMarks = run(async () => {
  if (!$('#fd').value || !$('#fy').value || !$('#fs').value || !$('#sub').value.trim() || !$('#exm').value.trim()) return toast('Please select department, year, section, subject and exam.', false);
  mkRows = await api(`/marks/sheet?${fq('f')}&subject=${encodeURIComponent($('#sub').value.trim())}&exam=${encodeURIComponent($('#exm').value.trim())}`);
  const saved = mkRows.find(r => r.max_mark); if (saved) $('#mx').value = saved.max_mark; drawMarks();
});
function drawMarks() {
  if (!mkRows.length) return ($('#mk').innerHTML = 'No students found in this class.');
  $('#mk').innerHTML = `<div class="wrap"><table><tr><th>Student</th><th>Register No</th><th>Mark</th><th>Max Mark</th><th>%</th><th>Result</th><th>Performance</th></tr>` +
    mkRows.map((r, i) => `<tr><td>${esc(r.student_name)}</td><td>${esc(r.register_no)}</td><td><input type="number" min="0" style="width:90px" value="${r.mark ?? ''}" oninput="mkRows[${i}].mark=this.value"></td><td>${$('#mx').value}</td>
    <td>${pct(r.percentage)}</td><td>${r.result ? `<span class="pill ${r.result}">${r.result}</span>` : '–'}</td><td>${r.performance ? `<span class="pill ${r.performance.replace(' ', '')}">${r.performance}</span>` : '–'}</td></tr>`).join('') +
    `</table></div><div class="bar" style="margin-top:14px"><button class="btn" onclick="saveMarks()">Save Marks</button></div>`;
}
const saveMarks = run(async () => {
  const r = await api('/marks', { method: 'POST', body: { subject: $('#sub').value.trim(), exam: $('#exm').value.trim(), max_mark: $('#mx').value, records: mkRows.map(x => ({ student_id: x.id, mark: x.mark })) } });
  toast(r.message + (r.alerts ? ' Parent notification queued successfully.' : '')); loadMarks();
});

// ----- Attention -----
PAGE.attention = async () => {
  $('#view').innerHTML = `<h1>Students Requiring Attention</h1>${filterBar('f')}<div id="al"></div>`;
  const load = run(async () => {
    const r = await api('/attention?' + fq('f'));
    $('#al').innerHTML = r.length ? r.map(a => `<div class="att ${a.level}" onclick="go('performance/${a.id}')"><b>${a.level === 'high' ? '🔴' : '🟠'} ${esc(a.student_name)}</b> <small>(${esc(a.register_no)} · ${esc(a.department)} ${esc(a.year)}-${esc(a.section)})</small><br>
      Attendance: ${pct(a.attendance)} &nbsp; Average Mark: ${pct(a.average_mark)}<br><small style="color:var(--g)">${a.reasons.map(esc).join(' • ')}</small>
      <div style="margin-top:6px"><button class="btn sm alt" onclick="event.stopPropagation();alertParent(${a.id})">Notify Parent</button></div></div>`).join('') : '<div class="card">🎉 No students need attention right now.</div>';
  });
  ['fd', 'fy', 'fs'].forEach(i => ($('#' + i).onchange = load)); load();
};
const alertParent = run(async id => { const r = await api('/notifications/send-attention/' + id, { method: 'POST' }); toast(r.message); });

// ----- Performance -----
PAGE.performance = async id => {
  $('#view').innerHTML = `<h1>Performance</h1><div class="bar"><select id="ps"><option value="">Select a student</option></select></div><div id="pf"></div>`;
  const list = await api('/students'); $('#ps').innerHTML += list.map(s => `<option value="${s.id}" ${s.id == id ? 'selected' : ''}>${esc(s.student_name)} (${esc(s.register_no)})</option>`).join('');
  $('#ps').onchange = () => go('performance/' + $('#ps').value); if (!id) return ($('#pf').innerHTML = '<div class="card">Choose a student to see how they are doing.</div>');
  const p = await api('/performance/' + id), st = p.student;
  const C = (l, v, sub = '') => `<div class="stat"><small>${l}</small><b>${v}</b>${sub}</div>`;
  $('#pf').innerHTML = `<div class="card"><b style="font-size:18px">${esc(st.student_name)}</b> <small>${esc(st.register_no)} · ${esc(st.department)} · Year ${esc(st.year)}-${esc(st.section)}</small></div>
    <div class="grid">${C('Overall Performance', pct(p.overall))}${C('Attendance', pct(p.attendance))}${C('Subjects Passed', p.subjects.length ? `${p.passed} / ${p.subjects.length}` : '–')}
    ${C('Subjects Requiring Attention', p.attention.length ? esc(p.attention.join(', ')) : 'None', '')}</div>
    <div class="card"><b>Subject-wise</b>${p.subjects.length ? p.subjects.map(s => `<div style="margin-top:10px">${esc(s.subject)} — ${s.percentage}%<div class="meter"><i style="width:${s.percentage}%;background:${s.passed ? 'var(--ok)' : 'var(--bad)'}"></i></div></div>`).join('') : '<p>No marks entered yet.</p>'}</div>
    <div class="card"><b>Recent attendance</b><div style="margin-top:8px">${p.trend.length ? p.trend.map(t => `<span title="${fmt(t.date)}" style="display:inline-block;width:22px;height:22px;border-radius:5px;margin:2px;background:${t.status === 'Present' ? 'var(--ok)' : 'var(--bad)'}"></span>`).join('') + '<br><small>🟩 Present 🟥 Absent (latest on right)</small>' : 'No attendance recorded yet.'}</div></div>
    ${p.reasons.length ? `<div class="note">⚠️ ${p.reasons.map(esc).join(' • ')}</div>` : ''}`;
};

// ----- Notifications -----
PAGE.notifications = async () => {
  $('#view').innerHTML = `<h1>Notification History</h1>${setupBanner()}<div class="bar"><select id="ns"><option value="">All statuses</option><option value="sent">Sent</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="not_configured">Not configured</option></select>
    <select id="nc"><option value="">All channels</option><option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select></div><div class="card wrap" id="nl"></div>`;
  const load = run(async () => {
    const rows = await api(`/notifications?status=${$('#ns').value}&channel=${$('#nc').value}`);
    $('#nl').innerHTML = rows.length ? `<table><tr><th>Student</th><th>Parent</th><th>Type</th><th>Channel</th><th>Status</th><th>Date</th><th></th></tr>` + rows.map(n => `<tr><td>${esc(n.student_name)}</td><td>${esc(n.parent_name || 'Parent')}</td><td>${esc(n.type)}</td>
      <td>${{ email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' }[n.channel]}</td><td>${pill(n.status)}${n.error && n.status !== 'sent' ? `<br><small style="color:var(--g)">${esc(n.error)}</small>` : ''}</td><td>${fmt(n.created_at)}</td>
      <td>${['failed', 'not_configured', 'pending'].includes(n.status) ? `<button class="btn sm alt" onclick="retry(${n.id})">Retry</button>` : ''}</td></tr>`).join('') + '</table>' : 'No notifications yet. They appear here when attendance or marks alerts are created.';
  });
  window.reloadNotes = load; $('#ns').onchange = $('#nc').onchange = load; load();
};
const retry = run(async id => { const r = await api(`/notifications/${id}/retry`, { method: 'POST' }); toast('Status: ' + r.status.replace('_', ' '), r.status === 'sent'); reloadNotes(); });

// ----- Reports -----
PAGE.reports = async () => {
  const T = { attendance: 'Attendance', marks: 'Marks', performance: 'Performance', student: 'Student-wise', department: 'Department-wise', notifications: 'Parent Notifications' };
  $('#view').innerHTML = `<h1>Reports</h1>${filterBar('f', `<select id="rt">${Object.entries(T).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><select id="rs" style="display:none"></select>
    <button class="btn" onclick="showReport()">Show</button><button class="btn alt" onclick="dlReport()">Download CSV</button>`)}<div class="card wrap" id="rp">Choose a report.</div>`;
  const sl = await api('/students'); $('#rs').innerHTML = sl.map(s => `<option value="${s.id}">${esc(s.student_name)} (${esc(s.register_no)})</option>`).join('');
  $('#rt').onchange = () => ($('#rs').style.display = $('#rt').value === 'student' ? '' : 'none');
};
let repRows = [];
const showReport = run(async () => {
  const t = $('#rt').value; repRows = await api(`/reports/${t}?${fq('f')}${t === 'student' ? '&student_id=' + $('#rs').value : ''}`);
  $('#rp').innerHTML = repRows.length ? '<table><tr>' + Object.keys(repRows[0]).map(k => `<th>${esc(k.replace(/_/g, ' '))}</th>`).join('') + '</tr>' + repRows.map(r => '<tr>' + Object.values(r).map(v => `<td>${esc(v)}</td>`).join('') + '</tr>').join('') + '</table>' : 'No data for this report yet.';
});
const dlReport = run(async () => { await showReport(); csvDownload(`${$('#rt').value}_report.csv`, repRows); });

// ----- Settings (admin) -----
PAGE.settings = async () => {
  const { settings: s, channels } = await api('/settings');
  const f = (k, l, t = 'text', ph = '') => `<label>${l}<input id="st_${k}" type="${t}" value="${esc(s[k])}" placeholder="${ph}"></label>`;
  const badge = ok => (ok ? '🟢 Configured' : '⚪ Not configured');
  $('#view').innerHTML = `<h1>Settings</h1><div class="card"><b>Institution &amp; alert rules</b><div class="form" style="margin-top:10px">${f('institution_name', 'Institution name')}${f('low_attendance', 'Low attendance below (%)', 'number')}${f('low_marks', 'Low marks below (%)', 'number')}
    ${f('pass_mark', 'Pass mark (%)', 'number')}${f('performance_drop', 'Performance drop of (%)', 'number')}${f('repeated_absence', 'Repeated absence (days in a row)', 'number')}
    <label>Auto alert on absence<select id="st_auto_attendance_alert"><option value="1" ${s.auto_attendance_alert === '1' ? 'selected' : ''}>On</option><option value="0" ${s.auto_attendance_alert === '0' ? 'selected' : ''}>Off</option></select></label>
    <label>Auto alert on low marks<select id="st_auto_marks_alert"><option value="1" ${s.auto_marks_alert === '1' ? 'selected' : ''}>On</option><option value="0" ${s.auto_marks_alert === '0' ? 'selected' : ''}>Off</option></select></label></div></div>
    <div class="card"><b>Email (SMTP)</b> ${badge(channels.email)}<div class="form" style="margin-top:10px">${f('smtp_host', 'SMTP host', 'text', 'smtp.gmail.com')}${f('smtp_port', 'Port', 'number')}${f('smtp_user', 'Username')}${f('smtp_pass', 'Password / app password', 'password')}${f('smtp_from', 'From address', 'text', 'EduPulse &lt;you@example.com&gt;')}</div></div>
    <div class="card"><b>SMS &amp; WhatsApp (Twilio)</b> SMS: ${badge(channels.sms)} · WhatsApp: ${badge(channels.whatsapp)}<div class="form" style="margin-top:10px">${f('twilio_sid', 'Account SID')}${f('twilio_token', 'Auth token', 'password')}${f('sms_from', 'SMS sender number', 'text', '+1555…')}${f('whatsapp_from', 'WhatsApp sender number', 'text', '+1415…')}</div></div>
    <button class="btn" onclick="saveSettings()">Save Settings</button>`;
};
const saveSettings = run(async () => {
  const b = {}; document.querySelectorAll('[id^=st_]').forEach(e => (b[e.id.slice(3)] = e.value));
  const r = await api('/settings', { method: 'PUT', body: b }); toast(r.message); meta = await api('/meta'); PAGE.settings();
});

if (token) start();
