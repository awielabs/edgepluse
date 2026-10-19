// EduPulse MCA CSV Student Seeder & Roster Engine
const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const values = [];
  let curr = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        curr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      values.push(curr.trim());
      curr = '';
    } else {
      curr += c;
    }
  }
  values.push(curr.trim());
  return values;
}

function getMcaCsvPath() {
  const p1 = path.join(__dirname, 'MCA_Students_5_Subjects.csv');
  const p2 = path.join(__dirname, '..', 'MCA_Students_5_Subjects.csv');
  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;
  return null;
}

function seedMcaStudents(db, mongoModels = null) {
  const csvPath = getMcaCsvPath();
  if (!csvPath) {
    console.warn('[MCA Seeder] MCA_Students_5_Subjects.csv not found.');
    return { count: 0 };
  }

  const content = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length <= 1) return { count: 0 };

  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const rollIdx = header.indexOf('roll_no');
  const emailIdx = header.indexOf('parent_email');
  const phoneIdx = header.indexOf('parent_whatsapp');
  const attPresIdx = header.indexOf('attendance_present');
  const attTotalIdx = header.indexOf('attendance_total');
  const subjIdx = header.indexOf('subjects');
  const attPctIdx = header.indexOf('attendance_percent');
  const deptIdx = header.findIndex(h => h === 'departement' || h === 'department');

  const insertStudent = db.prepare(`
    INSERT INTO students(student_name, register_no, department, year, section, parent_name, parent_email, parent_phone)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(register_no) DO UPDATE SET
      student_name=excluded.student_name,
      department=excluded.department,
      year=excluded.year,
      section=excluded.section,
      parent_name=excluded.parent_name,
      parent_email=excluded.parent_email,
      parent_phone=excluded.parent_phone
  `);

  const insertMark = db.prepare(`
    INSERT INTO marks(student_id, subject, exam, mark, max_mark, percentage, result, performance)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, subject, exam) DO UPDATE SET
      mark=excluded.mark,
      max_mark=excluded.max_mark,
      percentage=excluded.percentage,
      result=excluded.result,
      performance=excluded.performance
  `);

  const insertAtt = db.prepare(`
    INSERT INTO attendance(student_id, date, status)
    VALUES(?, ?, ?)
    ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status
  `);

  // Generate date list for attendance (past 14 days + today)
  const today = new Date();
  const dates = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  let studentCount = 0;
  let markCount = 0;
  let attCount = 0;

  db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < 2) continue;

      const name = row[nameIdx] || '';
      const rollNo = row[rollIdx] || '';
      if (!name || !rollNo) continue;

      const parentEmail = (emailIdx >= 0 ? row[emailIdx] : '') || '';
      const parentPhone = (phoneIdx >= 0 ? row[phoneIdx] : '') || '';
      const dept = (deptIdx >= 0 ? row[deptIdx] : '') || 'MCA';
      const attPct = parseFloat(attPctIdx >= 0 ? row[attPctIdx] : '80') || 80;

      // Clean parent name
      const parentName = `Parent of ${name}`;

      insertStudent.run(name, rollNo, dept, '1', 'A', parentName, parentEmail, parentPhone);
      const studentId = db.prepare('SELECT id FROM students WHERE register_no=?').get(rollNo).id;
      studentCount++;

      // Parse subjects: e.g. "DS:45/50;.NET:42/50;FD:40/50;CC:44/50;MA:38/50"
      const subjStr = subjIdx >= 0 ? row[subjIdx] : '';
      if (subjStr) {
        const parts = subjStr.split(';').map(p => p.trim()).filter(Boolean);
        for (const part of parts) {
          // part is "DS:45/50"
          const [subName, scoreStr] = part.split(':');
          if (subName && scoreStr) {
            const [mStr, maxStr] = scoreStr.split('/');
            const mark = parseFloat(mStr) || 0;
            const max = parseFloat(maxStr) || 50;
            const pct = Math.round((mark / max) * 1000) / 10;
            const result = pct >= 40 ? 'Pass' : 'Fail';
            let perf = 'Average';
            if (pct >= 75) perf = 'Excellent';
            else if (pct >= 60) perf = 'Good';
            else if (pct < 40) perf = 'Needs Attention';

            insertMark.run(studentId, subName.trim(), 'Unit Test 1', mark, max, pct, result, perf);
            markCount++;
          }
        }
      }

      // Generate attendance trail according to attendance percentage
      // For 14 dates, number of present days = round((attPct / 100) * 14)
      const presentDays = Math.max(0, Math.min(dates.length, Math.round((attPct / 100) * dates.length)));
      // Distribute present days
      for (let dIdx = 0; dIdx < dates.length; dIdx++) {
        const dateStr = dates[dIdx];
        // If index < presentDays, mark Present, else Absent
        // For more natural distribution, mark present from right (latest) or evenly
        const isPresent = dIdx < presentDays;
        insertAtt.run(studentId, dateStr, isPresent ? 'Present' : 'Absent');
        attCount++;
      }
    }
  })();

  console.log(`✅ [MCA Seeder] Successfully loaded ${studentCount} MCA students, ${markCount} subject marks, and ${attCount} attendance entries.`);

  // If MongoDB models are provided and connected, sync them too!
  if (mongoModels && mongoModels.Student) {
    (async () => {
      try {
        const sqliteStudents = db.prepare("SELECT * FROM students WHERE department='MCA'").all();
        for (const s of sqliteStudents) {
          await mongoModels.Student.updateOne(
            { register_no: s.register_no },
            {
              $set: {
                student_name: s.student_name,
                register_no: s.register_no,
                department: s.department,
                year: s.year,
                section: s.section,
                parent_name: s.parent_name,
                parent_email: s.parent_email,
                parent_phone: s.parent_phone
              }
            },
            { upsert: true }
          );
        }
      } catch (err) {
        console.warn('[MCA Seeder Mongo Sync Notice]', err.message);
      }
    })();
  }

  return { studentCount, markCount, attCount };
}

module.exports = {
  seedMcaStudents,
  getMcaCsvPath
};
