# EduPulse – Student Monitoring + Parent Alerts

Express + SQLite (built-in node:sqlite, needs Node 22+; nothing to compile) (real database, saved in `edupulse.db`) + a simple browser UI. No mock data, no student login.

## Run
    npm install
    npm start        # http://localhost:5000
Logins: `admin / admin123`, `faculty / faculty123` (change them and set JWT_SECRET before real use).

## Parent alerts (Email + SMS + WhatsApp)
Admin > Settings: add SMTP details for Email and Twilio details for SMS and WhatsApp.
Until a channel is configured, its alerts show "Not configured" with a setup message; Retry sends them once configured.
Statuses: Sent (accepted by provider), Pending, Failed (provider error shown), Not configured.

## Workflow
Students (+ Add Student / CSV upload with preview) > Attendance (Mark All Present, absent alerts) > Marks (auto %, Pass/Fail, performance) > Needs Attention (rules in Settings) > Notifications > Reports.
Departments, Year and Section filters work on every page.
