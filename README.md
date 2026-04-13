# 🗓 BrandTrack — Holiday Dashboard

A holiday and event tracking dashboard for brand managers. Auto-fetches holidays from nationaltoday.com, matches them to your brands, and pushes events to Google Calendar with browser reminders.

---

## ✨ Features

- **Auto-fetch holidays** from nationaltoday.com (current + next 2 months)
- **Brand management** with categories, colors, and keywords
- **Auto-matching** — holidays are matched to brands by keyword
- **Calendar view** — monthly grid with color-coded events per brand
- **Table view** — filterable event list with push actions
- **Manual events** — add any event with date, description, post brief
- **Google Calendar push** — one-click push with 1-day + 3-day reminders
- **Browser notifications** — reminders fire on schedule
- **Weekly auto-fetch** — Netlify scheduled function runs every Monday 9 AM

---

## 🚀 Deploy to Netlify (5 minutes)

### Step 1 — Push to GitHub

```bash
cd brand-holiday-tracker
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/brand-holiday-tracker.git
git push -u origin main
```

### Step 2 — Deploy on Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Connect your GitHub repo
3. Build settings (auto-detected from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click **Deploy site**

Your site will be live at `https://your-site-name.netlify.app`

---

## 🔑 Google Calendar Setup

### Step 1 — Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "BrandTrack")
3. Go to **APIs & Services** → **Enable APIs**
4. Search and enable: **Google Calendar API**

### Step 2 — Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: `BrandTrack`
5. Authorized JavaScript origins: Add your Netlify URL:
   ```
   https://your-site-name.netlify.app
   ```
   Also add `http://localhost:5173` for local dev
6. Click **Create** → Copy the **Client ID**

### Step 3 — Add to Dashboard

1. Open your deployed site
2. Go to **Settings**
3. Paste the Client ID in the Google Calendar section
4. Click **Connect Google Calendar** → authorize in popup

---

## 🔔 Notification Setup

1. Go to **Settings** → Enable Reminders toggle
2. Allow browser notification permission when prompted
3. Events pushed to calendar will auto-schedule browser reminders
4. Reminders fire 1 day before each event

---

## 💻 Local Development

```bash
npm install
npm run dev          # Start frontend at localhost:5173

# To test Netlify functions locally:
npm install -g netlify-cli
netlify dev          # Starts everything at localhost:8888
```

---

## 📁 Project Structure

```
brand-holiday-tracker/
├── netlify/
│   └── functions/
│       ├── fetch-holidays.mjs    # Scrapes nationaltoday.com
│       └── weekly-fetch.mjs     # Scheduled: runs every Monday 9 AM
├── public/
│   ├── sw.js                    # Service worker (notifications)
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Dashboard.jsx        # Overview + upcoming events
│   │   ├── BrandsView.jsx       # Brand management
│   │   ├── CalendarView.jsx     # Monthly calendar
│   │   ├── EventsView.jsx       # Table of all events
│   │   ├── Settings.jsx         # Google Calendar + notifications
│   │   ├── AddEventModal.jsx    # Manual event creation
│   │   └── Toast.jsx            # Notification toasts
│   ├── hooks/
│   │   └── useLocalStorage.js
│   ├── utils/
│   │   ├── googleCalendar.js    # Google Calendar API
│   │   └── notifications.js    # Browser notifications
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── netlify.toml
└── package.json
```

---

## 🎯 How Holiday Matching Works

Each brand has a list of **keywords** (e.g. `beauty, skincare, wellness`).

When holidays are fetched, each holiday's title, description, and URL slug are checked against every brand's keywords. If any keyword matches, the holiday is assigned to that brand.

**Example:**
- Brand: *Aesthetic Revival* → keywords: `beauty, skincare, wellness, self-care`
- Holiday: *"National Skin Care Awareness Month"* → matches `skincare`
- Result: Holiday is assigned to Aesthetic Revival ✓

Add more keywords to your brands to increase matches.

---

## 📝 Sharing with your boss

Since it's on Netlify, just share the URL:
```
https://your-site-name.netlify.app
```

All data is stored in the browser (localStorage), so each user has their own independent view.

---

## 🔧 Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Pure CSS (no framework) |
| Hosting | Netlify |
| Functions | Netlify Serverless Functions |
| Scheduler | Netlify Scheduled Functions |
| Calendar | Google Calendar API v3 |
| Notifications | Web Notifications API + Service Worker |
| Storage | localStorage (browser-side) |
| Fonts | Syne + DM Sans (Google Fonts) |
