require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { DatabaseSync } = require('node:sqlite');
const nodemailer = require('nodemailer');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'edupulse.db'));

// Parse command line arguments:
// --all : process all students
// --student=1 : process specific student id (default: 1)
// --email=test@example.com : destination email for test (default: process.env.SMTP_USER || sameer12200409@gmail.com)
// --real : send to each student's parent_email instead of test email
const args = process.argv.slice(2);
const isAll = args.includes('--all');
const isReal = args.includes('--real');
const studentArg = args.find(a => a.startsWith('--student='));
const targetStudentId = studentArg ? parseInt(studentArg.split('=')[1], 10) : 1;
const emailArg = args.find(a => a.startsWith('--email='));
const defaultTestEmail = process.env.SMTP_USER || 'sameer12200409@gmail.com';
const overrideEmail = emailArg ? emailArg.split('=')[1] : null;

function round(n) {
  return Math.round(n * 10) / 10;
}

function buildStudentMarksAndAttendanceReport(st) {
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

  const subjectsText = marks.length > 0
    ? marks.map(m => `  • ${m.subject}: ${m.mark}/${m.max_mark} (${m.percentage}%) - ${m.result === 'Pass' ? 'PASS ✅' : 'FAIL ❌'}`).join('\n')
    : '  • Marks record pending';

  // Exact plain text template as requested
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

  // HTML Email formatting mirroring the exact report template
  const marksHtmlRows = marks.map(m => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">${m.subject}</td>
      <td style="padding: 10px 14px; color: #64748b; text-align: center;">${m.max_mark}</td>
      <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; text-align: center;">${m.mark}</td>
      <td style="padding: 10px 14px; color: #475569; text-align: center;">${m.percentage}%</td>
      <td style="padding: 10px 14px; text-align: center;">
        <span style="background: ${m.result === 'Pass' ? '#dcfce7' : '#fee2e2'}; color: ${m.result === 'Pass' ? '#15803d' : '#b91c1c'}; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">
          ${m.result === 'Pass' ? 'PASS ✅' : 'FAIL ❌'}
        </span>
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CAT-1 Progress & Attendance Report – ${st.student_name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 26px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 18px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.4;">
          🎓 MANAKULA VINAYAGAR INSTITUTE OF TECHNOLOGY
        </div>
        <div style="font-size: 13px; color: #c7d2fe; margin-top: 4px; font-weight: 500;">
          📍 Department of Computer Applications (MCA)
        </div>
        <div style="border-top: 1px dashed rgba(255,255,255,0.25); margin: 14px 0 12px;"></div>
        <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 6px 18px; border-radius: 20px; font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
          📄 CAT-1 PROGRESS &amp; ATTENDANCE REPORT
        </div>
      </td>
    </tr>

    <!-- Student Details -->
    <tr>
      <td style="padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 140px;">👤 <b>Student Name:</b></td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${st.student_name}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">🆔 <b>Register No:</b></td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${st.register_no}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">🏫 <b>Department:</b></td>
            <td style="padding: 4px 0; color: #0f172a;">${st.department} (Year ${st.year}, Sec ${st.section})</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Attendance Status -->
    <tr>
      <td style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0;">
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">
          📅 <b>ATTENDANCE STATUS:</b>
        </div>
        <div style="background: ${attPct < 75 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${attPct < 75 ? '#fecaca' : '#bbf7d0'}; border-radius: 10px; padding: 14px 16px;">
          <div style="font-size: 13px; color: #334155; margin-bottom: 6px;">
            • Total Working Days: <b>${totalDays}</b>
          </div>
          <div style="font-size: 13px; color: #334155; margin-bottom: 6px;">
            • Present: <b style="color: #16a34a;">${presentDays} days</b> | Absent: <b style="color: #dc2626;">${absentDays} days</b>
          </div>
          <div style="font-size: 13.5px; color: #0f172a;">
            • Attendance Percentage: <b style="color: ${attPct < 75 ? '#dc2626' : '#16a34a'}; font-size: 15px;">${attPct}%</b> ${attPct < 75 ? '<span style="color: #dc2626; font-weight: 700;">⚠️ (Below 75% Criteria)</span>' : '<span style="color: #16a34a; font-weight: 700;">✅ (Satisfactory)</span>'}
          </div>
        </div>
      </td>
    </tr>

    <!-- CAT-1 Marks -->
    <tr>
      <td style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0;">
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">
          📝 <b>CAT-1 EXAMINATION MARKS (Max: 50):</b>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 13px; margin-bottom: 12px;">
          <thead style="background: #f1f5f9; color: #475569; font-weight: bold;">
            <tr>
              <th style="padding: 10px 14px; text-align: left;">Subject</th>
              <th style="padding: 10px 14px; text-align: center;">Max</th>
              <th style="padding: 10px 14px; text-align: center;">Mark</th>
              <th style="padding: 10px 14px; text-align: center;">Percentage</th>
              <th style="padding: 10px 14px; text-align: center;">Result</th>
            </tr>
          </thead>
          <tbody>
            ${marksHtmlRows}
          </tbody>
        </table>

        <!-- Score & Result -->
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px;">
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            📊 <b>Total Score:</b> ${totalMark}/${totalMax} (${overallPct}%)
          </div>
          <div style="font-size: 14px; font-weight: 700; color: ${allPassed ? '#16a34a' : '#dc2626'};">
            🏆 <b>Result Status:</b> ${allPassed ? 'ALL SUBJECTS PASSED ✅' : 'NEEDS ATTENTION ⚠️'}
          </div>
        </div>
      </td>
    </tr>

    <!-- Faculty Remarks -->
    <tr>
      <td style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: #faf5ff;">
        <div style="font-size: 13.5px; font-weight: 700; color: #6b21a8; margin-bottom: 8px;">
          💬 <b>FACULTY REMARKS / ஆசிரியர் கருத்து:</b>
        </div>
        <div style="font-size: 13px; color: #334155; margin-bottom: 6px; line-height: 1.5;">
          • <b>English:</b> ${remarksEn}
        </div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5;">
          • <b>தமிழ்:</b> ${remarksTa}
        </div>
      </td>
    </tr>

    <!-- Verbatim Message Box -->
    <tr>
      <td style="padding: 16px 24px; background: #0f172a; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11.5px; line-height: 1.6; white-space: pre-wrap;">
${plainText}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 24px; background: #f8fafc; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 6px; font-weight: 600; color: #475569;">
          📞 <b>Institution Query:</b> 0413-2643007 | <a href="mailto:info@mvit.edu.in" style="color: #4338ca; text-decoration: none;">info@mvit.edu.in</a>
        </p>
        <div style="border-top: 1px solid #e2e8f0; margin: 10px 0 8px;"></div>
        <p style="margin: 0; font-style: italic; color: #94a3b8; font-size: 11px;">
          _EduPulse Automated Institutional Parent Notification System_
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

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
    html
  };
}

async function getMailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = +(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || 'sameer12200409@gmail.com';
  const pass = process.env.SMTP_PASS || 'zyvtomcqgjvyeqxl';

  if (user && pass) {
    console.log(`[SMTP] Using Google Gmail SMTP (${user})`);
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }

  console.log('[SMTP] No Gmail credentials found; creating Ethereal test inbox...');
  const testAcc = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAcc.user, pass: testAcc.pass }
  });
}

async function run() {
  console.log('====================================================');
  console.log(' EduPulse Student CAT-1 Report Email Dispatch Test');
  console.log('====================================================');

  const transporter = await getMailTransporter();
  const smtpFrom = process.env.SMTP_FROM || `"EduPulse MVIT" <${process.env.SMTP_USER || 'sameer12200409@gmail.com'}>`;

  let students = [];
  if (isAll) {
    students = db.prepare('SELECT * FROM students ORDER BY id ASC').all();
    console.log(`\n📋 Loaded ALL ${students.length} students from database for batch test dispatch.`);
  } else {
    const st = db.prepare('SELECT * FROM students WHERE id=?').get(targetStudentId);
    if (!st) {
      console.error(`Student with ID ${targetStudentId} not found.`);
      process.exit(1);
    }
    students = [st];
    console.log(`\n📋 Testing report dispatch for: ${st.student_name} (${st.register_no})`);
  }

  console.log('Mode:', isReal ? 'Real delivery to student parent_email' : `Test delivery redirected to ${overrideEmail || defaultTestEmail}`);

  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    const report = buildStudentMarksAndAttendanceReport(st);
    const recipient = isReal ? (st.parent_email || overrideEmail || defaultTestEmail) : (overrideEmail || defaultTestEmail);

    console.log(`\n----------------------------------------------------`);
    console.log(`[${i + 1}/${students.length}] Dispatching for ${st.student_name} (${st.register_no})`);
    console.log(`Recipient: ${recipient}`);
    console.log(`Attendance: ${report.attendance_pct}% | Total Score: ${report.total_mark}/${report.total_max} (${report.overall_pct}%)`);

    if (i === 0) {
      console.log('\n📄 TEMPLATE PREVIEW:');
      console.log(report.plainText);
      console.log('----------------------------------------------------');
    }

    try {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: recipient,
        subject: `CAT-1 Marks & Attendance Report – ${st.student_name} (${st.register_no})`,
        text: report.plainText,
        html: report.html
      });

      console.log(`✅ Email delivered successfully! Message ID: ${info.messageId}`);
      if (info.messageId && info.response) {
        console.log(`   Response: ${info.response}`);
      }
    } catch (err) {
      console.error(`❌ Email delivery failed for ${st.student_name}:`, err.message);
    }

    // Delay between sends when processing multiple students
    if (students.length > 1 && i < students.length - 1) {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  console.log('\n====================================================');
  console.log('✅ CAT-1 Report Email Dispatch Test Completed!');
  console.log('====================================================');
}

run().catch(err => {
  console.error('Fatal dispatch error:', err);
  process.exit(1);
});
