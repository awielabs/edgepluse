// EduPulse MongoDB Atlas Integration Layer (Mongoose)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ---------- Schemas ----------
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'faculty'], default: 'faculty' }
}, { timestamps: true });

const StudentSchema = new mongoose.Schema({
  student_name: { type: String, required: true },
  register_no: { type: String, unique: true, required: true, index: true },
  department: { type: String, required: true, index: true },
  year: { type: String, required: true, index: true },
  section: { type: String, required: true, index: true },
  parent_name: { type: String, default: '' },
  parent_email: { type: String, default: '' },
  parent_phone: { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const AttendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  date: { type: String, required: true, index: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true }
}, { timestamps: true });
AttendanceSchema.index({ student_id: 1, date: 1 }, { unique: true });

const MarkSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  subject: { type: String, required: true, index: true },
  exam: { type: String, required: true, index: true },
  mark: { type: Number, required: true },
  max_mark: { type: Number, required: true },
  percentage: { type: Number, required: true },
  result: { type: String, required: true },
  performance: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
MarkSchema.index({ student_id: 1, subject: 1, exam: 1 }, { unique: true });

const NotificationSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.Mixed, index: true },
  type: { type: String, required: true },
  channel: { type: String, required: true, enum: ['email', 'sms', 'whatsapp'] },
  status: { type: String, default: 'pending', enum: ['sent', 'pending', 'failed', 'not_configured'] },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  recipient: { type: String, default: '' },
  error: { type: String, default: null },
  ref_key: { type: String, index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const SettingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: String, default: '' }
});

const User = mongoose.model('User', UserSchema);
const Student = mongoose.model('Student', StudentSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Mark = mongoose.model('Mark', MarkSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Setting = mongoose.model('Setting', SettingSchema);

const DEFAULTS = {
  institution_name: 'Your Institution',
  low_attendance: '75',
  low_marks: '50',
  pass_mark: '40',
  performance_drop: '15',
  repeated_absence: '3',
  auto_attendance_alert: '1',
  auto_marks_alert: '1',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  twilio_sid: '',
  twilio_token: '',
  sms_from: '',
  whatsapp_from: '',
};

async function seedMongo() {
  // Seed settings
  for (const [k, v] of Object.entries(DEFAULTS)) {
    await Setting.updateOne({ key: k }, { $setOnInsert: { value: v } }, { upsert: true });
  }

  // Seed default staff logins
  const count = await User.countDocuments();
  if (count === 0) {
    await User.create([
      {
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        name: 'Administrator',
        role: 'admin'
      },
      {
        username: 'faculty',
        password: bcrypt.hashSync('faculty123', 10),
        name: 'Faculty',
        role: 'faculty'
      }
    ]);
    console.log('[MongoDB Atlas] Seeded default admin and faculty credentials.');
  }
}

async function connectMongo(uri) {
  if (!uri) return false;
  try {
    console.log('[MongoDB Atlas] Connecting to cluster...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ [MongoDB Atlas] Connected successfully to database:', mongoose.connection.name);
    await seedMongo();
    return true;
  } catch (err) {
    console.warn('⚠️ [MongoDB Atlas] Connection failed:', err.message);
    return false;
  }
}

module.exports = {
  mongoose,
  User,
  Student,
  Attendance,
  Mark,
  Notification,
  Setting,
  DEFAULTS,
  connectMongo,
};
