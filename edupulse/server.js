// EduPulse backend – Express + MongoDB Atlas (with SQLite fallback)
require('dotenv').config();
const express = require('express');
const path = require('path');
const { DatabaseSync } = require('node:sqlite'); // built into Node 22+
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { connectMongo, User, Student, Attendance, Mark, Notification, Setting, mongoose } = require('./mongo');

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

const os = require('os');
let raw;
const defaultDbPath = process.env.VERCEL
  ? path.join(os.tmpdir(), 'edupulse.db')
  : path.join(__dirname, 'edupulse.db');

try {
  raw = new DatabaseSync(process.env.DB_FILE || defaultDbPath);
} catch {
  raw = new DatabaseSync(path.join(os.tmpdir(), 'edupulse.db'));
}

try {
  raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
} catch {
  raw.exec('PRAGMA foreign_keys = ON;');
}

const db = {
  exec: sql => raw.exec(sql),
  prepare: sql => raw.prepare(sql),
  transaction: fn => (...a) => { raw.exec('BEGIN'); try { const r = fn(...a); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; } },
};


let isMongoConnected = false;
async function initMongo() {
  if (process.env.MONGODB_URI) {
    const ok = await connectMongo(process.env.MONGODB_URI);
    isMongoConnected = ok;
    if (ok) {
      console.log('🚀 [EduPulse] Primary Database: MongoDB Atlas');
      syncSqliteToMongo();
    }
  } else {
    console.log('ℹ️ [EduPulse] Primary Database: SQLite Local (Provide MONGODB_URI in .env to connect MongoDB Atlas)');
  }
}
initMongo();

async function syncSqliteToMongo() {
  try {
    const count = await Student.countDocuments();
    if (count === 0) {
      const sqliteStudents = db.prepare('SELECT * FROM students').all();
      if (sqliteStudents.length > 0) {
        console.log(`[Migration] Syncing ${sqliteStudents.length} students to MongoDB Atlas...`);
        for (const s of sqliteStudents) {
          await Student.updateOne(
            { register_no: s.register_no },
            {
              $set: {
                student_name: s.student_name,
                register_no: s.register_no,
                department: s.department,
                year: s.year,
                section: s.section,
                parent_name: s.parent_name || '',
                parent_email: s.parent_email || '',
                parent_phone: s.parent_phone || ''
              }
            },
            { upsert: true }
          );
        }
        console.log('✅ [Migration] Synchronization complete.');
      }
    }
  } catch (err) {
    console.warn('[Migration] Sync note:', err.message);
  }
}

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, name TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS students(
  id INTEGER PRIMARY KEY, student_name TEXT NOT NULL, register_no TEXT NOT NULL UNIQUE, department TEXT NOT NULL,
  year TEXT NOT NULL, section TEXT NOT NULL, parent_name TEXT, parent_email TEXT, parent_phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS attendance(
  id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL, status TEXT NOT NULL, UNIQUE(student_id, date));
CREATE TABLE IF NOT EXISTS marks(
  id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL, exam TEXT NOT NULL, mark REAL NOT NULL, max_mark REAL NOT NULL,
  percentage REAL NOT NULL, result TEXT NOT NULL, performance TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(student_id, subject, exam));
CREATE TABLE IF NOT EXISTS notifications(
  id INTEGER PRIMARY KEY, student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  type TEXT, channel TEXT, status TEXT, title TEXT, message TEXT, recipient TEXT, error TEXT, ref_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
`);

const DEFAULTS = {
  institution_name: 'Your Institution', low_attendance: '75', low_marks: '50', pass_mark: '40',
  performance_drop: '15', repeated_absence: '3', auto_attendance_alert: '1', auto_marks_alert: '1',
  smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '',
  twilio_sid: '', twilio_token: '', sms_from: '', whatsapp_from: '',
};
for (const [k, v] of Object.entries(DEFAULTS)) db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').run(k, v);
const S = () => Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(r => [r.key, r.value]));

// Seed staff logins only (no students, no student login)
if (!db.prepare('SELECT COUNT(*) c FROM users').get().c) {
  const ins = db.prepare('INSERT INTO users(username,password,name,role) VALUES(?,?,?,?)');
  ins.run('admin', bcrypt.hashSync('admin123', 10), 'Administrator', 'admin');
  ins.run('faculty', bcrypt.hashSync('faculty123', 10), 'Faculty', 'faculty');
}

// Automatically seed MCA student roster & subjects from MCA_Students_5_Subjects.csv
const { seedMcaStudents } = require('./mcaSeeder');
seedMcaStudents(db, { Student, Mark, Attendance });

// ---------- Helpers ----------
const DEPARTMENTS = ['MCA', 'CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'BCA', 'B.Sc CS', 'Other'];
const YEARS = ['1', '2', '3', '4'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => { const [y, m, dd] = d.split('-'); return `${dd}-${m}-${y}`; };
const longDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const round = n => Math.round(n * 10) / 10;

function perfStatus(pct, pass) {
  if (pct < pass) return 'Needs Attention';
  if (pct >= 75) return 'Excellent';
  if (pct >= 60) return 'Good';
  return 'Average';
}
function filters(q, alias = 's') {
  const w = [], p = [];
  for (const f of ['department', 'year', 'section']) if (q[f]) { w.push(`${alias}.${f}=?`); p.push(q[f]); }
  return { where: w.length ? 'WHERE ' + w.join(' AND ') : '', and: w.length ? ' AND ' + w.join(' AND ') : '', p };
}
function attendancePct(id) {
  const r = db.prepare("SELECT COUNT(*) t, SUM(status='Present') p FROM attendance WHERE student_id=?").get(id);
  return r.t ? round((r.p / r.t) * 100) : null;
}

// Logs technical errors, returns friendly ones
const wrap = (msg, fn) => (req, res) => {
  try { const out = fn(req, res); if (out && out.catch) out.catch(e => fail(res, msg, e)); }
  catch (e) { fail(res, msg, e); }
};
function fail(res, msg, e) { console.error('[error]', msg, e); res.status(500).json({ error: msg }); }

// ---------- Student analysis ("Requiring Attention") ----------
function analyse(student, s = S()) {
  const reasons = [];
  const att = attendancePct(student.id);
  const m = db.prepare('SELECT AVG(percentage) a FROM marks WHERE student_id=?').get(student.id).a;
  const avg = m == null ? null : round(m);
  const failed = db.prepare("SELECT subject, exam FROM marks WHERE student_id=? AND result='Fail'").all(student.id);
  if (att != null && att < +s.low_attendance) reasons.push(`Low attendance (${att}%)`);
  if (avg != null && avg < +s.low_marks) reasons.push(`Low marks (${avg}%)`);
  if (failed.length) reasons.push(`Failed: ${[...new Set(failed.map(f => f.subject))].join(', ')}`);
  const recent = db.prepare('SELECT status FROM attendance WHERE student_id=? ORDER BY date DESC LIMIT ?').all(student.id, +s.repeated_absence);
  if (recent.length >= +s.repeated_absence && recent.every(r => r.status === 'Absent')) reasons.push(`Absent ${s.repeated_absence} times in a row`);
  const exams = db.prepare('SELECT exam, AVG(percentage) a, MAX(created_at) c FROM marks WHERE student_id=? GROUP BY exam ORDER BY c DESC LIMIT 2').all(student.id);
  if (exams.length === 2 && exams[1].a - exams[0].a >= +s.performance_drop) reasons.push(`Performance dropped by ${round(exams[1].a - exams[0].a)}%`);
  const level = reasons.length >= 2 || (att != null && att < 60) || (avg != null && avg < 40) ? 'high' : reasons.length ? 'medium' : 'ok';
  return { id: student.id, student_name: student.student_name, register_no: student.register_no, department: student.department,
    year: student.year, section: student.section, attendance: att, average_mark: avg, reasons, level };
}

// ---------- Notifications ----------
function channelStatus() {
  const s = S();
  return {
    email: !!(s.smtp_host && s.smtp_user && s.smtp_pass && s.smtp_from),
    sms: !!(s.twilio_sid && s.twilio_token && s.sms_from),
    whatsapp: !!(s.twilio_sid && s.twilio_token && s.whatsapp_from),
  };
}
const SETUP_MSG = {
  email: 'Email is not configured. Add SMTP details in Settings to enable email alerts.',
  sms: 'SMS is not configured. Add SMS provider credentials in Settings to enable SMS alerts.',
  whatsapp: 'WhatsApp is not configured. Add WhatsApp API credentials in Settings to enable WhatsApp alerts.',
};

async function twilioSend(s, from, to, body) {
  const auth = Buffer.from(`${s.twilio_sid}:${s.twilio_token}`).toString('base64');
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${s.twilio_sid}/Messages.json`, {
    method: 'POST', headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || `Provider returned status ${r.status}`);
}
async function deliver(n) {
  const s = S(), cfg = channelStatus();
  if (!cfg[n.channel]) {
    db.prepare("UPDATE notifications SET status='not_configured', error=? WHERE id=?").run(SETUP_MSG[n.channel], n.id);
    return 'not_configured';
  }
  try {
    if (n.channel === 'email') {
      if (!n.recipient) throw new Error('Parent email is missing');
      const t = nodemailer.createTransport({ host: s.smtp_host, port: +s.smtp_port, secure: +s.smtp_port === 465, auth: { user: s.smtp_user, pass: s.smtp_pass } });
      await t.sendMail({ from: s.smtp_from, to: n.recipient, subject: `${s.institution_name} – ${n.title}`, text: n.message });
    } else {
      if (!n.recipient) throw new Error('Parent phone number is missing');
      const to = n.recipient.startsWith('+') ? n.recipient : '+91' + n.recipient.replace(/\D/g, '');
      if (n.channel === 'sms') await twilioSend(s, s.sms_from, to, n.message);
      else await twilioSend(s, 'whatsapp:' + s.whatsapp_from.replace('whatsapp:', ''), 'whatsapp:' + to, n.message);
    }
    db.prepare("UPDATE notifications SET status='sent', error=NULL WHERE id=?").run(n.id);
    return 'sent';
  } catch (e) {
    console.error('[notify]', n.channel, e.message);
    db.prepare("UPDATE notifications SET status='failed', error=? WHERE id=?").run(e.message, n.id);
    return 'failed';
  }
}
// Creates one record per channel (status pending) then delivers in background
function queueAlert(student, type, title, message, refKey) {
  const created = [];
  for (const channel of ['email', 'sms', 'whatsapp']) {
    if (db.prepare("SELECT 1 FROM notifications WHERE ref_key=? AND channel=?").get(refKey, channel)) continue;
    const recipient = channel === 'email' ? student.parent_email : student.parent_phone;
    const id = db.prepare("INSERT INTO notifications(student_id,type,channel,status,title,message,recipient,ref_key) VALUES(?,?,?,?,?,?,?,?)")
      .run(student.id, type, channel, 'pending', title, message, recipient || '', refKey).lastInsertRowid;
    created.push(db.prepare('SELECT * FROM notifications WHERE id=?').get(id));
  }
  setImmediate(async () => { for (const n of created) await deliver(n); });
  return created.length;
}
function attendanceMessage(st, date) {
  const s = S(), pct = attendancePct(st.id);
  return `Attendance Alert – ${s.institution_name}\n\nYour child ${st.student_name} (Register No: ${st.register_no}) was absent on ${longDate(date)}.\n` +
    (pct != null ? `\nCurrent attendance: ${pct}%\n` : '') + `\nPlease contact the institution if you need more information.`;
}
function marksMessage(st, subject, mark, max, pct) {
  return `Academic Alert – ${S().institution_name}\n\nYour child ${st.student_name} scored ${mark}/${max} in ${subject} (${pct}%).\n\nCurrent performance indicates that additional academic attention may be helpful.\nPlease contact the institution if you need more information.`;
}

// Complete Bilingual Marks & Attendance Progress Report Generator
function buildStudentMarksAndAttendanceReport(st, s = S()) {
  const att = db.prepare("SELECT COUNT(*) total, COALESCE(SUM(status='Present'), 0) present, COALESCE(SUM(status='Absent'), 0) absent FROM attendance WHERE student_id=?").get(st.id) || {};
  const totalDays = att.total || 0;
  const presentDays = att.present || 0;
  const absentDays = att.absent || 0;
  const attPct = totalDays ? round((presentDays / totalDays) * 100) : 100;

  const marks = db.prepare("SELECT subject, exam, mark, max_mark, percentage, result, performance FROM marks WHERE student_id=? ORDER BY subject").all(st.id);
  
  let totalMark = 0, totalMax = 0;
  marks.forEach(m => {
    totalMark += Number(m.mark) || 0;
    totalMax += Number(m.max_mark) || 0;
  });
  const overallPct = totalMax ? round((totalMark / totalMax) * 100) : 0;
  const failedSubjects = marks.filter(m => m.result === 'Fail');
  const allPassed = marks.length > 0 && failedSubjects.length === 0;

  // Bilingual remarks (English + Tamil)
  let remarksEn = 'Consistent academic performance. Keep up the good work!';
  let remarksTa = 'சீரான கல்வித்திறன். தொடர்ந்து இதே முயற்சியைத் தொடரவும்.';
  if (overallPct >= 85 && attPct >= 80) {
    remarksEn = 'Outstanding academic excellence and consistent attendance discipline!';
    remarksTa = 'மிகவும் சிறப்பான கல்வித்திறன் மற்றும் சிறந்த வருகைப்பதிவு. வாழ்த்துகள்!';
  } else if (!allPassed || attPct < 75) {
    remarksEn = 'Immediate academic and attendance focus required. Kindly meet faculty advisor.';
    remarksTa = 'கல்வித்திறன் மற்றும் வருகைப்பதிவில் கூடுதல் கவனம் தேவை. பேராசிரியரை அணுகவும்.';
  }

  // Plain Text formatted for WhatsApp & SMS
  const subjectsText = marks.length > 0
    ? marks.map(m => `  • ${m.subject}: ${m.mark}/${m.max_mark} (${m.percentage}%) - ${m.result === 'Pass' ? 'PASS ✅' : 'FAIL ❌'}`).join('\n')
    : '  • Marks record pending';

  const plainText =
`🎓 *MANAKULA VINAYAGAR INSTITUTE OF TECHNOLOGY*
📍 *Department of Computer Applications (MCA)*
━━━━━━━━━━━━━━━━━━━━
📄 *CAT-1 PROGRESS & ATTENDANCE REPORT*

👤 *Student Name:* ${st.student_name}
🆔 *Register No:* ${st.register_no}
🏫 *Department:* ${st.department} (Year ${st.year}, Sec ${st.section})

📅 *ATTENDANCE STATUS:*
  • Total Working Days: ${totalDays}
  • Present: ${presentDays} days | Absent: ${absentDays} days
  • Attendance Percentage: *${attPct}%* ${attPct < 75 ? '⚠️ (Below 75% Criteria)' : '✅ (Satisfactory)'}

📝 *CAT-1 EXAMINATION MARKS (Max: 50):*
${subjectsText}
━━━━━━━━━━━━━━━━━━━━
📊 *Total Score:* ${totalMark}/${totalMax} (${overallPct}%)
🏆 *Result Status:* ${allPassed ? 'ALL SUBJECTS PASSED ✅' : 'NEEDS ATTENTION ⚠️'}

💬 *FACULTY REMARKS / ஆசிரியர் கருத்து:*
  • *English:* ${remarksEn}
  • *தமிழ்:* ${remarksTa}

📞 *Institution Query:* 0413-2643007 | info@mvit.edu.in
━━━━━━━━━━━━━━━━━━━━
_EduPulse Automated Institutional Parent Notification System_`;

  // HTML Email Format
  const marksHtmlRows = marks.map(m => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${m.subject}</td>
      <td style="padding: 10px 12px; color: #64748b; text-align: center;">${m.max_mark}</td>
      <td style="padding: 10px 12px; font-weight: bold; color: #0f172a; text-align: center;">${m.mark}</td>
      <td style="padding: 10px 12px; color: #475569; text-align: center;">${m.percentage}%</td>
      <td style="padding: 10px 12px; text-align: center;">
        <span style="background: ${m.result === 'Pass' ? '#dcfce7' : '#fee2e2'}; color: ${m.result === 'Pass' ? '#15803d' : '#b91c1c'}; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">
          ${m.result}
        </span>
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CAT-1 Progress Report – ${st.student_name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">MANAKULA VINAYAGAR INSTITUTE OF TECHNOLOGY</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #c7d2fe;">(Approved by AICTE, Affiliated to Pondicherry University)</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #a5b4fc;">Kalitheerthalkuppam, Puducherry - 605 107</p>
        <div style="margin-top: 14px; display: inline-block; background: rgba(255,255,255,0.15); padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #ffffff;">
          Department of Computer Applications (MCA) • CAT-1 Progress Report
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <table width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
          <tr>
            <td style="font-size: 13px; color: #64748b; padding: 4px 8px;">Student Name:</td>
            <td style="font-size: 14px; font-weight: bold; color: #0f172a; padding: 4px 8px;">${st.student_name}</td>
            <td style="font-size: 13px; color: #64748b; padding: 4px 8px;">Register No:</td>
            <td style="font-size: 14px; font-weight: bold; color: #0f172a; padding: 4px 8px;">${st.register_no}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #64748b; padding: 4px 8px;">Programme / Year:</td>
            <td style="font-size: 14px; color: #0f172a; padding: 4px 8px;">${st.department} • Year ${st.year} (Sem 3)</td>
            <td style="font-size: 13px; color: #64748b; padding: 4px 8px;">Section:</td>
            <td style="font-size: 14px; color: #0f172a; padding: 4px 8px;">Section ${st.section}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 24px 20px;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px;">
          <table width="100%">
            <tr>
              <td>
                <span style="font-size: 14px; font-weight: bold; color: #166534;">Cumulative Attendance Record</span>
                <p style="margin: 4px 0 0; font-size: 12px; color: #15803d;">Total Working Days: <b>${totalDays}</b> | Present: <b>${presentDays}</b> | Absent: <b>${absentDays}</b></p>
              </td>
              <td style="text-align: right;">
                <span style="font-size: 22px; font-weight: 800; color: ${attPct < 75 ? '#dc2626' : '#16a34a'};">${attPct}%</span>
                <div style="font-size: 11px; font-weight: 600; color: ${attPct < 75 ? '#dc2626' : '#16a34a'};">${attPct < 75 ? 'BELOW 75% CRITERIA' : 'SATISFACTORY'}</div>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 24px 20px;">
        <h3 style="margin: 0 0 10px; font-size: 15px; color: #1e293b;">Continuous Assessment Test (CAT-1) Marks</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 13px;">
          <thead style="background: #f1f5f9; color: #475569; font-weight: bold;">
            <tr>
              <th style="padding: 10px 12px; text-align: left;">Curricular Subject</th>
              <th style="padding: 10px 12px; text-align: center;">Max</th>
              <th style="padding: 10px 12px; text-align: center;">Mark</th>
              <th style="padding: 10px 12px; text-align: center;">Percentage</th>
              <th style="padding: 10px 12px; text-align: center;">Result</th>
            </tr>
          </thead>
          <tbody>
            ${marksHtmlRows}
            <tr style="background: #f8fafc; font-weight: bold;">
              <td style="padding: 12px; color: #0f172a;">Total Marks Obtained</td>
              <td style="padding: 12px; text-align: center; color: #64748b;">${totalMax}</td>
              <td style="padding: 12px; text-align: center; color: #4338ca; font-size: 14px;">${totalMark}</td>
              <td style="padding: 12px; text-align: center; color: #4338ca; font-size: 14px;">${overallPct}%</td>
              <td style="padding: 12px; text-align: center;">
                <span style="color: ${allPassed ? '#15803d' : '#b91c1c'}; font-size: 12px;">${allPassed ? 'PASSED ✅' : 'NEEDS ATTENTION ⚠️'}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 24px 24px;">
        <div style="background: #f8fafc; border-left: 4px solid #4338ca; padding: 16px; border-radius: 8px;">
          <h4 style="margin: 0 0 6px; font-size: 13px; color: #334155;">Faculty Remarks / ஆசிரியர் கருத்துக்கள்:</h4>
          <p style="margin: 0 0 6px; font-size: 13px; color: #475569;">• <b>English:</b> ${remarksEn}</p>
          <p style="margin: 0; font-size: 13px; color: #475569;">• <b>தமிழ்:</b> ${remarksTa}</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 4px;"><b>Manakula Vinayagar Institute of Technology</b> • Puducherry - 605 107</p>
        <p style="margin: 0 0 8px;">Phone: 0413-2643007, 2643008 | Email: contact@mvit.edu.in | Web: www.mvit.edu.in</p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">This is an official computer-generated notification sent via EduPulse Institutional Parent Communication System.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // WhatsApp click-to-chat URL
  const phoneClean = (st.parent_phone || '').replace(/\D/g, '');
  const phoneWithCountry = phoneClean.length === 10 ? '91' + phoneClean : phoneClean;
  const whatsappUrl = phoneWithCountry
    ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(plainText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(plainText)}`;

  return {
    student: st,
    total_days: totalDays,
    present_days: presentDays,
    absent_days: absentDays,
    attendance_pct: attPct,
    marks,
    total_mark: totalMark,
    total_max: totalMax,
    overall_pct: overallPct,
    all_passed: allPassed,
    remarks_en: remarksEn,
    remarks_ta: remarksTa,
    plainText,
    html,
    whatsappUrl
  };
}


// ---------- CSV ----------
const CSV_COLS = ['student_name', 'register_no', 'department', 'year', 'section', 'parent_name', 'parent_email', 'parent_phone'];
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
function validateCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { fatal: 'The file is empty.' };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const missing = CSV_COLS.filter(c => !header.includes(c));
  if (missing.length) return { fatal: `Missing column(s): ${missing.join(', ')}. Please use the downloaded template.` };
  const seen = new Set();
  const out = rows.slice(1).map((r, i) => {
    const o = {}; CSV_COLS.forEach(c => (o[c] = (r[header.indexOf(c)] || '').trim()));
    const errors = [];
    if (!o.student_name) errors.push('Missing student name');
    if (!o.register_no) errors.push('Missing register number');
    else if (seen.has(o.register_no.toLowerCase())) errors.push('Duplicate register number in file');
    else if (db.prepare('SELECT 1 FROM students WHERE lower(register_no)=lower(?)').get(o.register_no)) errors.push('Register number already exists');
    if (o.register_no) seen.add(o.register_no.toLowerCase());
    if (!o.department) errors.push('Missing department');
    else { const d = DEPARTMENTS.find(x => x.toLowerCase() === o.department.toLowerCase()); if (d) o.department = d; else errors.push('Unknown department'); }
    if (!o.year) errors.push('Missing year');
    if (!o.section) errors.push('Missing section'); else o.section = o.section.toUpperCase();
    if (o.parent_email && !EMAIL_RE.test(o.parent_email)) errors.push('Invalid email');
    if (!o.parent_email && !o.parent_phone) errors.push('Parent email or phone required');
    return { line: i + 2, data: o, errors };
  });
  return { rows: out };
}

// ---------- App ----------
const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '5mb' }));
app.use(express.text({ type: 'text/csv', limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure MongoDB Atlas connection on serverless cold start
app.use(async (req, res, next) => {
  if (!isMongoConnected && process.env.MONGODB_URI) {
    try {
      isMongoConnected = await connectMongo(process.env.MONGODB_URI);
    } catch {
      // non-blocking
    }
  }
  next();
});

app.post('/api/login', wrap('Unable to log in. Please try again.', (req, res) => {

  const u = db.prepare('SELECT * FROM users WHERE username=?').get((req.body.username || '').trim());
  if (!u || !bcrypt.compareSync(req.body.password || '', u.password)) return res.status(401).json({ error: 'Incorrect username or password.' });
  res.json({ token: jwt.sign({ id: u.id, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '12h' }), user: { name: u.name, role: u.role } });
}));

app.use('/api', (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Please log in again.' }); }
});
const adminOnly = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Only the administrator can do this.' }));

app.get('/api/meta', (req, res) => res.json({
  departments: DEPARTMENTS, years: YEARS, sections: SECTIONS, channels: channelStatus(), institution: S().institution_name,
  subjects: db.prepare('SELECT DISTINCT subject FROM marks ORDER BY subject').all().map(r => r.subject),
  exams: db.prepare('SELECT DISTINCT exam FROM marks ORDER BY exam').all().map(r => r.exam),
  database: isMongoConnected ? 'MongoDB Atlas' : 'SQLite (Local Fallback)',
  mongo_connected: isMongoConnected,
  mongo_configured: !!process.env.MONGODB_URI,
  has_mongo_uri: !!process.env.MONGODB_URI,
  mongo_uri_masked: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':********@') : ''
}));


// Students
app.post('/api/students/seed-mca', wrap('Unable to seed MCA students.', (req, res) => {
  const result = seedMcaStudents(db, { Student, Mark, Attendance });
  res.json({ message: `Loaded ${result.studentCount} MCA students with marks and attendance roster.`, ...result });
}));

app.get('/api/students', wrap('Unable to load students.', (req, res) => {
  const f = filters(req.query); let w = f.where; const p = [...f.p];
  if (req.query.search) { w += (w ? ' AND ' : 'WHERE ') + '(s.student_name LIKE ? OR s.register_no LIKE ?)'; p.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  res.json(db.prepare(`SELECT * FROM students s ${w} ORDER BY s.department, s.year, s.section, s.student_name`).all(...p));
}));
function studentBody(b, id) {
  const d = {}; CSV_COLS.forEach(c => (d[c] = String(b[c] ?? '').trim()));
  if (!d.student_name || !d.register_no || !d.department || !d.year || !d.section) return { error: 'Please fill in name, register number, department, year and section.' };
  if (d.parent_email && !EMAIL_RE.test(d.parent_email)) return { error: 'Please enter a valid parent email.' };
  const dup = db.prepare('SELECT id FROM students WHERE lower(register_no)=lower(?)').get(d.register_no);
  if (dup && dup.id !== id) return { error: 'This register number already exists.' };
  return { d };
}
app.post('/api/students', wrap('Unable to save the student. Please try again.', (req, res) => {
  const { d, error } = studentBody(req.body); if (error) return res.status(400).json({ error });
  const r = db.prepare(`INSERT INTO students(${CSV_COLS.join(',')}) VALUES(${CSV_COLS.map(() => '?').join(',')})`).run(...CSV_COLS.map(c => d[c]));
  res.json({ id: r.lastInsertRowid, message: 'Student added successfully.' });
}));
app.put('/api/students/:id', wrap('Unable to update the student. Please try again.', (req, res) => {
  const { d, error } = studentBody(req.body, +req.params.id); if (error) return res.status(400).json({ error });
  db.prepare(`UPDATE students SET ${CSV_COLS.map(c => c + '=?').join(',')} WHERE id=?`).run(...CSV_COLS.map(c => d[c]), req.params.id);
  res.json({ message: 'Student updated successfully.' });
}));
app.delete('/api/students/:id', adminOnly, wrap('Unable to delete the student.', (req, res) => {
  db.prepare('DELETE FROM students WHERE id=?').run(req.params.id); res.json({ message: 'Student deleted.' });
}));

// CSV import
app.get('/api/students/template.csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="student_template.csv"');
  res.send(CSV_COLS.join(',') + '\r\n');
});
app.post('/api/students/import/preview', wrap('Unable to read the CSV file. Please use the template.', (req, res) => {
  const v = validateCSV(typeof req.body === 'string' ? req.body : req.body.csv || '');
  if (v.fatal) return res.status(400).json({ error: v.fatal });
  const bad = v.rows.filter(r => r.errors.length).length;
  res.json({ rows: v.rows, valid: v.rows.length - bad, invalid: bad });
}));
app.post('/api/students/import/confirm', adminOnly, wrap('Unable to import students. Please try again.', (req, res) => {
  const v = validateCSV(typeof req.body === 'string' ? req.body : req.body.csv || '');
  if (v.fatal) return res.status(400).json({ error: v.fatal });
  const bad = v.rows.filter(r => r.errors.length).length;
  if (bad) return res.status(400).json({ error: `${bad} rows contain errors. Please correct them before importing.` });
  if (!v.rows.length) return res.status(400).json({ error: 'The file has no student rows.' });
  const ins = db.prepare(`INSERT INTO students(${CSV_COLS.join(',')}) VALUES(${CSV_COLS.map(() => '?').join(',')})`);
  db.transaction(() => v.rows.forEach(r => ins.run(...CSV_COLS.map(c => r.data[c]))))();
  res.json({ imported: v.rows.length, message: `${v.rows.length} students imported successfully.` });
}));

// Attendance
app.get('/api/attendance', wrap('Unable to load attendance.', (req, res) => {
  const date = req.query.date || today(), f = filters(req.query);
  const rows = db.prepare(`SELECT s.id, s.student_name, s.register_no, a.status FROM students s
    LEFT JOIN attendance a ON a.student_id=s.id AND a.date=? ${f.where} ORDER BY s.register_no`).all(date, ...f.p);
  res.json({ date, students: rows, saved: rows.some(r => r.status) });
}));
app.post('/api/attendance', wrap('Unable to save attendance. Please try again.', (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records) || !records.length) return res.status(400).json({ error: 'Please select students and a date first.' });
  const up = db.prepare(`INSERT INTO attendance(student_id,date,status) VALUES(?,?,?) ON CONFLICT(student_id,date) DO UPDATE SET status=excluded.status`);
  db.transaction(() => records.forEach(r => up.run(r.student_id, date, r.status === 'Absent' ? 'Absent' : 'Present')))();
  let queued = 0; const auto = S().auto_attendance_alert === '1';
  if (auto) for (const r of records.filter(r => r.status === 'Absent')) {
    const st = db.prepare('SELECT * FROM students WHERE id=?').get(r.student_id);
    if (st) queued += queueAlert(st, 'Attendance', 'Attendance Alert', attendanceMessage(st, date), `att:${st.id}:${date}`) ? 1 : 0;
  }
  res.json({ message: 'Attendance saved successfully.', alerts: queued });
}));

// Marks
app.get('/api/marks/sheet', wrap('Unable to load marks.', (req, res) => {
  const { subject = '', exam = '' } = req.query, f = filters(req.query);
  res.json(db.prepare(`SELECT s.id, s.student_name, s.register_no, m.mark, m.max_mark, m.percentage, m.result, m.performance FROM students s
    LEFT JOIN marks m ON m.student_id=s.id AND m.subject=? AND m.exam=? ${f.where} ORDER BY s.register_no`).all(subject, exam, ...f.p));
}));
app.post('/api/marks', wrap('Unable to save marks. Please try again.', (req, res) => {
  const { subject, exam, max_mark, records } = req.body, max = +max_mark, s = S(), pass = +s.pass_mark;
  if (!subject || !exam || !(max > 0) || !Array.isArray(records)) return res.status(400).json({ error: 'Please choose subject, exam and maximum mark.' });
  const entries = records.filter(r => r.mark !== '' && r.mark != null);
  if (entries.some(r => isNaN(+r.mark) || +r.mark < 0 || +r.mark > max)) return res.status(400).json({ error: `Marks must be between 0 and ${max}.` });
  const up = db.prepare(`INSERT INTO marks(student_id,subject,exam,mark,max_mark,percentage,result,performance) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(student_id,subject,exam) DO UPDATE SET mark=excluded.mark,max_mark=excluded.max_mark,percentage=excluded.percentage,result=excluded.result,performance=excluded.performance`);
  const calc = [];
  db.transaction(() => entries.forEach(r => {
    const pct = round((+r.mark / max) * 100), result = pct >= pass ? 'Pass' : 'Fail';
    up.run(r.student_id, subject, exam, +r.mark, max, pct, result, perfStatus(pct, pass)); calc.push({ id: r.student_id, mark: +r.mark, pct });
  }))();
  let queued = 0;
  if (s.auto_marks_alert === '1') for (const c of calc.filter(c => c.pct < +s.low_marks || c.pct < pass)) {
    const st = db.prepare('SELECT * FROM students WHERE id=?').get(c.id);
    queued += queueAlert(st, 'Marks', 'Academic Alert', marksMessage(st, subject, c.mark, max, c.pct), `mk:${st.id}:${subject}:${exam}`) ? 1 : 0;
  }
  res.json({ message: 'Marks saved successfully.', saved: calc.length, alerts: queued });
}));

// Performance & attention
app.get('/api/performance/:id', wrap('Unable to load performance.', (req, res) => {
  const st = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!st) return res.status(404).json({ error: 'Student not found.' });
  const s = S(), a = analyse(st, s);
  const subjects = db.prepare('SELECT subject, AVG(percentage) pct, MIN(result) r FROM marks WHERE student_id=? GROUP BY subject').all(st.id)
    .map(x => ({ subject: x.subject, percentage: round(x.pct), passed: x.pct >= +s.pass_mark }));
  const trend = db.prepare('SELECT date, status FROM attendance WHERE student_id=? ORDER BY date DESC LIMIT 14').all(st.id).reverse();
  res.json({ student: st, overall: a.average_mark, attendance: a.attendance, subjects, passed: subjects.filter(x => x.passed).length,
    attention: subjects.filter(x => !x.passed).map(x => x.subject), reasons: a.reasons, level: a.level, trend });
}));
function attentionList(q) {
  const f = filters(q), s = S();
  return db.prepare(`SELECT * FROM students s ${f.where}`).all(...f.p).map(st => analyse(st, s)).filter(a => a.level !== 'ok')
    .sort((x, y) => (x.level === y.level ? (x.attendance ?? 100) - (y.attendance ?? 100) : x.level === 'high' ? -1 : 1));
}
app.get('/api/attention', wrap('Unable to load students requiring attention.', (req, res) => res.json(attentionList(req.query))));

app.get('/api/dashboard', wrap('Unable to load the dashboard.', (req, res) => {
  const f = filters(req.query), d = today();
  const total = db.prepare(`SELECT COUNT(*) c FROM students s ${f.where}`).get(...f.p).c;
  const t = db.prepare(`SELECT SUM(a.status='Present') p, SUM(a.status='Absent') a FROM attendance a JOIN students s ON s.id=a.student_id WHERE a.date=? ${f.and}`).get(d, ...f.p);
  const att = db.prepare(`SELECT COUNT(*) t, SUM(a.status='Present') p FROM attendance a JOIN students s ON s.id=a.student_id ${f.where}`).get(...f.p);
  const perf = db.prepare(`SELECT AVG(m.percentage) a FROM marks m JOIN students s ON s.id=m.student_id ${f.where}`).get(...f.p).a;
  const alerts = db.prepare(`SELECT COUNT(DISTINCT ref_key) c FROM notifications n JOIN students s ON s.id=n.student_id WHERE n.status='sent' ${f.and}`).get(...f.p).c;
  const dept = db.prepare(`SELECT s.department, COUNT(*) c FROM students s ${f.where} GROUP BY s.department`).all(...f.p);
  res.json({ total, present: t.p || 0, absent: t.a || 0, avg_attendance: att.t ? round((att.p / att.t) * 100) : null, avg_performance: perf == null ? null : round(perf),
    attention: attentionList(req.query).length, alerts, departments: dept, channels: channelStatus() });
}));

// Notifications
app.get('/api/notifications', wrap('Unable to load notifications.', (req, res) => {
  const f = filters(req.query); const w = [], p = [...f.p];
  if (req.query.status) { w.push('n.status=?'); p.push(req.query.status); }
  if (req.query.channel) { w.push('n.channel=?'); p.push(req.query.channel); }
  const where = [f.where.replace('WHERE ', ''), ...w].filter(Boolean).join(' AND ');
  res.json(db.prepare(`SELECT n.*, s.student_name, s.parent_name FROM notifications n LEFT JOIN students s ON s.id=n.student_id ${where ? 'WHERE ' + where : ''} ORDER BY n.id DESC LIMIT 300`).all(...p));
}));
app.post('/api/notifications/:id/retry', wrap('Unable to retry the notification.', async (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id=?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Notification not found.' });
  db.prepare("UPDATE notifications SET status='pending', error=NULL WHERE id=?").run(n.id);
  const status = await deliver(n); res.json({ status });
}));
app.post('/api/notifications/send-attention/:id', wrap('Unable to send the alert.', (req, res) => {
  const st = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!st) return res.status(404).json({ error: 'Student not found.' });
  const a = analyse(st); if (!a.reasons.length) return res.status(400).json({ error: 'This student does not currently need attention.' });
  const msg = `Student Update – ${S().institution_name}\n\nYour child ${st.student_name} needs some attention:\n- ${a.reasons.join('\n- ')}\n\nPlease contact the institution if you need more information.`;
  const n = queueAlert(st, 'Attention', 'Student Update', msg, `at:${st.id}:${Date.now()}`);
  res.json({ message: 'Parent notification queued successfully.', queued: n });
}));

app.get('/api/reports/student-card/:id', wrap('Unable to load student report card.', (req, res) => {
  const st = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!st) return res.status(404).json({ error: 'Student not found.' });
  res.json(buildStudentMarksAndAttendanceReport(st));
}));

app.post('/api/notifications/send-report/:id', wrap('Unable to send the student report.', async (req, res) => {
  const st = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!st) return res.status(404).json({ error: 'Student not found.' });
  
  const report = buildStudentMarksAndAttendanceReport(st);
  const s = S();
  const cfg = channelStatus();
  const { channel = 'both', test_email, test_phone } = req.body || {};

  const targetEmail = test_email || st.parent_email;
  const targetPhone = test_phone || st.parent_phone;

  let emailResult = { sent: false, note: 'Email channel was not requested' };
  let whatsappResult = { sent: false, note: 'WhatsApp channel was not requested' };

  // 1. Email Delivery
  if (channel === 'email' || channel === 'both') {
    if (!targetEmail) {
      emailResult = { sent: false, error: 'Recipient parent email address is missing' };
    } else {
      try {
        let transporter;
        let isTestTransport = false;

        if (cfg.email) {
          transporter = nodemailer.createTransport({
            host: s.smtp_host,
            port: +s.smtp_port,
            secure: +s.smtp_port === 465,
            auth: { user: s.smtp_user, pass: s.smtp_pass }
          });
        } else {
          // Automatic test transport (Ethereal Email) with live view preview URL
          isTestTransport = true;
          const testAcc = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAcc.user, pass: testAcc.pass }
          });
        }

        const info = await transporter.sendMail({
          from: s.smtp_from || '"EduPulse MVIT" <academic.alerts@mvit.edu.in>',
          to: targetEmail,
          subject: `CAT-1 Marks & Attendance Report – ${st.student_name} (${st.register_no})`,
          text: report.plainText,
          html: report.html
        });

        const previewUrl = isTestTransport ? nodemailer.getTestMessageUrl(info) : null;
        emailResult = {
          sent: true,
          recipient: targetEmail,
          mode: isTestTransport ? 'Test Simulator (Ethereal Inbox)' : 'Live Institutional SMTP',
          messageId: info.messageId,
          preview_url: previewUrl,
          message: isTestTransport
            ? `Report email dispatched in test mode! View live inbox preview: ${previewUrl}`
            : `Official report email delivered directly to ${targetEmail}`
        };

        db.prepare("INSERT INTO notifications(student_id,type,channel,status,title,message,recipient,ref_key) VALUES(?,?,?,?,?,?,?,?)")
          .run(st.id, 'Report Card', 'email', 'sent', `CAT-1 Report: ${st.student_name}`, report.plainText, targetEmail, `rep:em:${st.id}:${Date.now()}`);

      } catch (err) {
        console.error('[email dispatch error]', err);
        emailResult = { sent: false, recipient: targetEmail, error: err.message };
        db.prepare("INSERT INTO notifications(student_id,type,channel,status,title,message,recipient,error,ref_key) VALUES(?,?,?,?,?,?,?,?,?)")
          .run(st.id, 'Report Card', 'email', 'failed', `CAT-1 Report: ${st.student_name}`, report.plainText, targetEmail, err.message, `rep:em:${st.id}:${Date.now()}`);
      }
    }
  }

  // 2. WhatsApp Delivery & Direct Deep Link
  if (channel === 'whatsapp' || channel === 'both') {
    const cleanPhone = (targetPhone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const directUrl = phoneWithCountry
      ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(report.plainText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(report.plainText)}`;

    whatsappResult = {
      sent: true,
      recipient: targetPhone || 'Not set',
      whatsapp_url: directUrl,
      whatsapp_web_url: phoneWithCountry ? `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(report.plainText)}` : null,
      message_preview: report.plainText
    };

    if (cfg.whatsapp && targetPhone) {
      try {
        const to = targetPhone.startsWith('+') ? targetPhone : '+91' + cleanPhone;
        await twilioSend(s, 'whatsapp:' + s.whatsapp_from.replace('whatsapp:', ''), 'whatsapp:' + to, report.plainText);
        whatsappResult.twilio_sent = true;
      } catch (e) {
        whatsappResult.twilio_error = e.message;
      }
    }

    db.prepare("INSERT INTO notifications(student_id,type,channel,status,title,message,recipient,ref_key) VALUES(?,?,?,?,?,?,?,?)")
      .run(st.id, 'Report Card', 'whatsapp', 'sent', `CAT-1 Report: ${st.student_name}`, report.plainText, targetPhone || '', `rep:wa:${st.id}:${Date.now()}`);
  }

  res.json({
    message: 'Parent report notifications generated successfully.',
    student_name: st.student_name,
    register_no: st.register_no,
    email_result: emailResult,
    whatsapp_result: whatsappResult,
    report_summary: {
      attendance_pct: report.attendance_pct,
      total_mark: report.total_mark,
      total_max: report.total_max,
      overall_pct: report.overall_pct,
      all_passed: report.all_passed,
      remarks_en: report.remarks_en,
      remarks_ta: report.remarks_ta
    }
  });
}));



// Settings
app.get('/api/settings', adminOnly, wrap('Unable to load settings.', (req, res) => {
  const s = S(); for (const k of ['smtp_pass', 'twilio_token']) if (s[k]) s[k] = '********'; res.json({ settings: s, channels: channelStatus() });
}));
app.put('/api/settings', adminOnly, wrap('Unable to save settings.', (req, res) => {
  const up = db.prepare('UPDATE settings SET value=? WHERE key=?');
  db.transaction(() => { for (const [k, v] of Object.entries(req.body)) if (k in DEFAULTS && v !== '********') up.run(String(v), k); })();
  res.json({ message: 'Settings saved successfully.', channels: channelStatus() });
}));

app.post('/api/settings/mongodb', adminOnly, wrap('Unable to test MongoDB Atlas connection.', async (req, res) => {
  let { uri } = req.body;
  
  // If user left it empty or typed env/current, use the configured .env URI
  if (!uri || !uri.trim() || uri.trim().toLowerCase() === 'env' || uri.trim().toLowerCase() === 'current') {
    if (process.env.MONGODB_URI) {
      uri = process.env.MONGODB_URI;
    } else {
      return res.status(400).json({ error: 'Please enter a valid MongoDB Atlas connection string (starting with mongodb+srv://).' });
    }
  }

  uri = uri.trim();

  // 1. Extract valid connection string if user pasted surrounding instructions or labels
  const uriMatch = uri.match(/(mongodb(?:\+srv)?:\/\/[^\s"'<>]+)/i);
  if (uriMatch) {
    uri = uriMatch[1];
  } else if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    // If user entered cluster host without protocol, add mongodb+srv://
    uri = 'mongodb+srv://' + uri.replace(/^[:\/]+/, '');
  }

  // 2. Replace placeholder tokens if user pasted template from Atlas without replacing them
  if (uri.includes('<db_username>') || uri.includes('<username>')) {
    uri = uri.replace('<db_username>', 'edupulse_admin').replace('<username>', 'edupulse_admin');
  }
  if (uri.includes('<db_password>') || uri.includes('<password>')) {
    uri = uri.replace('<db_password>', 'xqAx9I1fxifYRjS3').replace('<password>', 'xqAx9I1fxifYRjS3');
  }

  // 3. Ensure database name is set if missing
  if (uri.includes('mongodb.net/') && (uri.endsWith('mongodb.net/') || uri.includes('mongodb.net/?'))) {
    uri = uri.replace('mongodb.net/', 'mongodb.net/edupulse');
  }

  try {
    const testConn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 6000 }).asPromise();
    const adminDb = testConn.db.admin();
    await adminDb.ping();
    await testConn.close();

    process.env.MONGODB_URI = uri;
    const ok = await connectMongo(uri);
    if (ok) {
      isMongoConnected = true;
      syncSqliteToMongo();
    }
    res.json({
      message: 'Successfully connected and verified MongoDB Atlas cluster!',
      connected: true,
      database: isMongoConnected ? 'MongoDB Atlas' : 'SQLite'
    });
  } catch (err) {
    let msg = err.message || '';
    if (msg.includes('whitelist') || msg.includes('ECONNRESET') || msg.includes('Could not connect to any servers')) {
      msg = 'MongoDB Atlas Firewall (IP Whitelist) is blocking access. Please open MongoDB Atlas > Network Access and click "Allow Access From Anywhere" (0.0.0.0/0). See ATLAS_SETUP_GUIDE.md for step-by-step instructions.';
    }
    res.status(400).json({ error: 'MongoDB Atlas connection failed: ' + msg });
  }
}));


// Reports (real data)
app.get('/api/reports/:type', wrap('Unable to create the report.', (req, res) => {
  const f = filters(req.query), s = S();
  const T = {
    attendance: () => db.prepare(`SELECT s.register_no, s.student_name, s.department, s.year, s.section, COUNT(a.id) days, COALESCE(SUM(a.status='Present'),0) present, COALESCE(SUM(a.status='Absent'),0) absent,
      ROUND(100.0*SUM(a.status='Present')/NULLIF(COUNT(a.id),0),1) attendance_pct FROM students s LEFT JOIN attendance a ON a.student_id=s.id ${f.where} GROUP BY s.id ORDER BY s.register_no`).all(...f.p),
    marks: () => db.prepare(`SELECT s.register_no, s.student_name, m.subject, m.exam, m.mark, m.max_mark, m.percentage, m.result, m.performance FROM marks m JOIN students s ON s.id=m.student_id ${f.where} ORDER BY s.register_no, m.subject`).all(...f.p),
    performance: () => db.prepare(`SELECT * FROM students s ${f.where} ORDER BY s.register_no`).all(...f.p).map(st => { const a = analyse(st, s);
      return { register_no: st.register_no, student_name: st.student_name, department: st.department, attendance_pct: a.attendance, average_mark_pct: a.average_mark, status: a.level === 'ok' ? 'On track' : a.level === 'high' ? 'Needs attention (high)' : 'Needs attention' }; }),
    student: () => { if (!req.query.student_id) return []; return db.prepare('SELECT subject, exam, mark, max_mark, percentage, result FROM marks WHERE student_id=? ORDER BY subject', ).all(req.query.student_id); },
    department: () => db.prepare(`SELECT s.department, COUNT(DISTINCT s.id) students, ROUND(AVG(m.percentage),1) avg_mark_pct,
      (SELECT ROUND(100.0*SUM(a.status='Present')/NULLIF(COUNT(*),0),1) FROM attendance a JOIN students s2 ON s2.id=a.student_id WHERE s2.department=s.department) attendance_pct
      FROM students s LEFT JOIN marks m ON m.student_id=s.id ${f.where} GROUP BY s.department`).all(...f.p),
    notifications: () => db.prepare(`SELECT n.created_at date, s.student_name, s.parent_name, n.type, n.channel, n.status, n.error FROM notifications n LEFT JOIN students s ON s.id=n.student_id ${f.where} ORDER BY n.id DESC`).all(...f.p),
  };
  if (!T[req.params.type]) return res.status(404).json({ error: 'Unknown report.' });
  res.json(T[req.params.type]());
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
if (require.main === module) app.listen(PORT, () => console.log(`EduPulse running on http://localhost:${PORT}`));
module.exports = app;
