const { DatabaseSync } = require('node:sqlite');
const nodemailer = require('nodemailer');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'edupulse.db'));
const st = db.prepare('SELECT * FROM students WHERE id=1').get();

console.log('--------------------------------------------------');
console.log('Testing Parent Report Dispatch for:', st.student_name, `(${st.register_no})`);
console.log('Parent Email:', st.parent_email);
console.log('Parent Phone:', st.parent_phone);
console.log('--------------------------------------------------');

// Load attendance
const att = db.prepare("SELECT COUNT(*) total, COALESCE(SUM(status='Present'), 0) present, COALESCE(SUM(status='Absent'), 0) absent FROM attendance WHERE student_id=?").get(st.id);
const totalDays = att.total || 0;
const presentDays = att.present || 0;
const absentDays = att.absent || 0;
const attPct = totalDays ? Math.round((presentDays / totalDays) * 1000) / 10 : 100;

// Load marks
const marks = db.prepare("SELECT subject, exam, mark, max_mark, percentage, result, performance FROM marks WHERE student_id=? ORDER BY subject").all(st.id);
let totalMark = 0, totalMax = 0;
marks.forEach(m => {
  totalMark += Number(m.mark) || 0;
  totalMax += Number(m.max_mark) || 0;
});
const overallPct = totalMax ? Math.round((totalMark / totalMax) * 1000) / 10 : 0;
const allPassed = marks.length > 0 && marks.every(m => m.result === 'Pass');

let remarksEn = 'Consistent academic performance. Keep up the good work!';
let remarksTa = 'சீரான கல்வித்திறன். தொடர்ந்து இதே முயற்சியைத் தொடரவும்.';
if (overallPct >= 85 && attPct >= 80) {
  remarksEn = 'Outstanding academic excellence and consistent attendance discipline!';
  remarksTa = 'மிகவும் சிறப்பான கல்வித்திறன் மற்றும் சிறந்த வருகைப்பதிவு. வாழ்த்துகள்!';
} else if (!allPassed || attPct < 75) {
  remarksEn = 'Immediate academic and attendance focus required. Kindly meet faculty advisor.';
  remarksTa = 'கல்வித்திறன் மற்றும் வருகைப்பதிவில் கூடுதல் கவனம் தேவை. பேராசிரியரை அணுகவும்.';
}

const subjectsText = marks.map(m => `  • ${m.subject}: ${m.mark}/${m.max_mark} (${m.percentage}%) - ${m.result === 'Pass' ? 'PASS ✅' : 'FAIL ❌'}`).join('\n');

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

console.log('\n📱 WhatsApp Message Preview:');
console.log(plainText);

const cleanPhone = (st.parent_phone || '').replace(/\D/g, '');
const phoneWithCountry = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(plainText)}`;

console.log('\n🔗 WhatsApp Click-to-Chat Deep Link:');
console.log(whatsappUrl);

async function testEmail() {
  console.log('\n📧 Generating Test Email via Nodemailer (Ethereal test inbox)...');
  const testAcc = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAcc.user, pass: testAcc.pass }
  });

  const info = await transporter.sendMail({
    from: '"EduPulse MVIT" <academic.alerts@mvit.edu.in>',
    to: st.parent_email,
    subject: `CAT-1 Marks & Attendance Report – ${st.student_name} (${st.register_no})`,
    text: plainText,
    html: `<h1>CAT-1 Marks & Attendance Report</h1><p>Student: ${st.student_name}</p><p>Attendance: ${attPct}%</p><p>Total: ${totalMark}/${totalMax} (${overallPct}%)</p><pre>${plainText}</pre>`
  });

  console.log('✅ Email successfully dispatched!');
  console.log('Message ID:', info.messageId);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log('🌐 LIVE EMAIL INBOX PREVIEW URL:', previewUrl);
  console.log('--------------------------------------------------');
}

testEmail().catch(err => console.error('Email dispatch error:', err));
