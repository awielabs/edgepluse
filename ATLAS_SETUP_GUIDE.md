# MongoDB Atlas Connection Guide for EduPulse

Your MongoDB Atlas credentials and URI have been configured in [`edupulse/.env`](file:///c:/Users/shovi/Downloads/edupulse/edupulse/.env):

```env
MONGODB_URI=mongodb+srv://edupulse_admin:xqAx9I1fxifYRjS3@cluster0.ey3rp.mongodb.net/edupulse?retryWrites=true&w=majority&appName=Cluster0
```

---

## Why did Atlas reject the initial connection?

Atlas returned:
```
⚠️ [MongoDB Atlas] Connection failed: Could not connect to any servers in your MongoDB Atlas cluster.
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

By default, MongoDB Atlas blocks all incoming connections until you whitelist your IP address or allow global access.

---

## 3 Quick Steps to Enable Network Access (Takes 1 Minute)

1. **Log in to MongoDB Atlas**:
   - Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and log in.

2. **Navigate to Network Access**:
   - In the left sidebar under the **Security** section, click on **Network Access**.
   - Click the green button: **+ Add IP Address**.

3. **Allow Access from Anywhere**:
   - Click the button **ALLOW ACCESS FROM ANYWHERE** (this sets the IP to `0.0.0.0/0`).
   - *(Optional: You can also choose "Add Current IP Address" if you only want your current machine to connect).*
   - Set entry comment to: `EduPulse Cloud Access`.
   - Click **Confirm**.

---

## Verification

Once you click **Confirm**, Atlas takes about 30–60 seconds to deploy the firewall rule.

Then you can:
1. Open the EduPulse web app at **http://localhost:3000**
2. Go to **Settings** -> **Database** section.
3. Your Atlas URI is ready. Click **Test & Verify MongoDB Atlas Connection**.
4. The system will immediately connect to your cloud cluster and automatically sync the 50 MCA students, marks, and attendance records into MongoDB Atlas!
