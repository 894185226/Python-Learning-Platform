# python-variable-adventure

Python variable learning platform for middle school students, featuring 10 interactive learning modules, 8 achievement badges, and a complete admin dashboard for teacher management.

## Features

- **10 Learning Modules** — From concept introduction to final quiz
- **8 Achievement Badges** — Steam-style popup notifications
- **Admin Dashboard** — Student management, batch operations, data export, notices
- **One-Click Setup** — `start_server.bat` auto-installs everything
- **Dark/Light Theme** — Full theme support with smooth transitions
- **Responsive Design** — Works on desktop, tablet, and mobile

## Quick Start

Double-click `start_server.bat` and wait for auto-configuration.

Then visit:
- Student site: **http://localhost:3000**
- Admin panel: **http://localhost:3000/admin.html** (admin / admin123)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5 + CSS3 + JavaScript |
| Backend | Node.js + Express |
| Database | MySQL 5.7+ |

## Project Structure

```
├── index.html          # Main website
├── style.css           # Main styles
├── script.js           # Frontend logic
├── admin.html          # Admin panel page
├── admin.css           # Admin styles
├── admin.js            # Admin logic
├── server.js           # Backend server (auto DB setup)
├── database.sql        # SQL schema (backup)
├── package.json        # Node.js config
├── start_server.bat    # One-click launcher
└── 使用手册.md          # User manual (Chinese)
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `students` | Student accounts (grade, class, status) |
| `admins` | Admin accounts |
| `learning_progress` | Module completion records |
| `achievements` | Achievement badges |
| `login_logs` | Login history |
| `notices` | System announcements |

## Repositories

- Gitee: https://gitee.com/fiveubisoft/python-variable-adventure
- GitHub: https://github.com/894185226/python-variable-adventure