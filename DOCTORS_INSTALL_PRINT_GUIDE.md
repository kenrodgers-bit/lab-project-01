# Lab Inventory System
## Detailed Installation and Daily Use Guide (Non-IT Friendly)

This guide is written for doctors and staff with no technical background.
Follow the steps in order.

---

## 1. What This Means in Simple Words

- One computer is the **Main Computer** (host/server).
- All other hospital computers just open a browser link.
- Only the Main Computer needs installation.

---

## 2. Before You Start (Checklist)

Confirm all items below:

- You have `lab-inventory-compiled.zip`
- You can log in to the Main Computer as Administrator
- The Main Computer is connected to hospital Wi-Fi/LAN
- You have internet for first-time software install
- You know the PostgreSQL password you will set

---

## 3. Install Required Software on Main Computer (One Time)

### Step 3.1 Install Node.js

1. Open browser and go to `https://nodejs.org`
2. Download **LTS** version
3. Run installer
4. Keep default options and click Next until Finish

### Step 3.2 Install PostgreSQL

1. Download PostgreSQL installer
2. Run installer
3. Keep default options
4. During install, set password for `postgres` user
5. Remember this password (write it safely)
6. Finish installation

---

## 4. Copy and Extract the App Package

1. Copy `lab-inventory-compiled.zip` to `C:\LabInventory`
2. Right-click zip file
3. Click **Extract All**
4. Open extracted folder (example: `C:\LabInventory\lab-inventory-compiled`)

You should see:

- `dist` folder
- `server` folder
- `install-runtime-host.bat`
- `start-hospital.bat`

---

## 5. Create Database in pgAdmin (One Time)

1. Open **pgAdmin**
2. Expand left menu: `Servers`
3. Click your server
4. Right-click `Databases`
5. Click `Create` then `Database...`
6. Enter database name: `lab_inventory`
7. Owner: `postgres` (or your DB user)
8. Click `Save`

---

## 6. Configure the App Settings File (`.env`)

### Step 6.1 Create `.env`

1. Open folder: `C:\LabInventory\lab-inventory-compiled\server`
2. Copy `.env.example`
3. Rename copied file to `.env`

### Step 6.2 Find Host IP

1. Press `Windows + R`
2. Type `cmd` and press Enter
3. Type `ipconfig` and press Enter
4. Find `IPv4 Address` for active Wi-Fi/LAN (example: `192.168.100.5`)
5. Keep this value

### Step 6.3 Edit `.env`

Open `.env` in Notepad and use this template:

```env
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgres://postgres:YOUR_DB_PASSWORD@localhost:5432/lab_inventory
JWT_SECRET=PUT_A_LONG_RANDOM_SECRET_HERE
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://HOST_IP:4000,http://localhost:4000
```

Replace:

- `YOUR_DB_PASSWORD` with your PostgreSQL password
- `PUT_A_LONG_RANDOM_SECRET_HERE` with long random text (32+ characters)
- `HOST_IP` with your IPv4 address from `ipconfig`

Save the file.

---

## 7. Run First-Time Setup (One Time)

1. Double-click `install-runtime-host.bat`
2. Wait for completion
3. You should see a message like setup complete

If there is an error, take a photo/screenshot and send to support.

---

## 8. Start the System (Daily)

1. Double-click `start-hospital.bat`
2. A black window opens
3. Leave this window open while staff use the system
4. Do not close this window unless ending service for the day

---

## 9. Open the App on Other Hospital Computers

On each staff computer:

1. Connect to same hospital Wi-Fi/LAN
2. Open Chrome/Edge
3. Go to: `http://HOST_IP:4000`
4. Example: `http://192.168.100.5:4000`
5. Login with assigned account

No installation is needed on staff computers.

---

## 10. Daily Operating Routine (Recommended)

At beginning of day:

1. Turn on Main Computer
2. Connect to hospital network
3. Run `start-hospital.bat`
4. Confirm app opens on Main Computer at `http://localhost:4000`

During day:

1. Keep Main Computer awake (no sleep)
2. Keep app window running

End of day:

1. Log out users
2. Perform backup (if configured)
3. Shut down only after operations complete

---

## 11. Quick Troubleshooting

### Problem: Staff cannot open app

1. Check Main Computer is ON
2. Check `start-hospital.bat` is running
3. Confirm staff computer on same network
4. Test from Main Computer: `http://localhost:4000`
5. Test from another computer: `http://HOST_IP:4000`

### Problem: Link changed

1. Run `ipconfig` on Main Computer
2. Use new IPv4 address
3. Update `.env` value `CORS_ORIGIN`
4. Restart app

### Problem: Database connection error

1. Recheck `DATABASE_URL` in `server/.env`
2. Ensure PostgreSQL service is running
3. Ensure database `lab_inventory` exists

---

## 12. Safety and Compliance Reminders

- Change default passwords immediately after first login
- Restrict access to Main Computer admin account
- Keep daily backups of PostgreSQL database
- Ask IT for static IP so hospital URL never changes
- Do not share `.env` file outside authorized team

---

## 13. Print and Keep

Print this guide and keep one copy:

- At nursing station
- Near Main Computer
- With hospital operations manager
