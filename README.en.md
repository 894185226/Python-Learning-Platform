# Python Learning Platform (with Admin Panel)

An interactive Python learning platform for middle school students, built on B/S architecture. It features 19 learning chapters, in-class quizzes, a discussion forum, an achievement system, and progress tracking. The homepage uses a W3Schools-style layout with light/dark theme support. The admin panel provides complete teaching management.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5 + CSS3 + JavaScript (W3.CSS style) + CodeMirror |
| Backend | Node.js + Express 5 |
| Database | MySQL 5.7 / 8.0 / 8.4 / 9.x |
| Real-time | WebSocket |

## Features

- **19 Learning Chapters** — From Python basics to data types, conditionals, loops, lists, and dictionaries
- **In-Class Quizzes** — Chapter quizzes with navigation, progress bar, and score radar chart
- **Discussion Forum** — Post/reply threads, filter by chapter (all 19 chapters)
- **Leaderboard** — Filter by grade/class, shows completed chapters and achievements
- **Mistake Book** — Auto-collect wrong answers, filter and delete by chapter
- **Code Snippets** — Save favorite code snippets
- **Learning Report** — Study calendar, streak days, strengths/weaknesses analysis
- **Learning Goals** — Set target chapters and due dates

## Highlights

- ⚡ **One-Click Setup** — Double-click `start_server.bat` to auto-install Node.js & MySQL
- 🎨 **W3Schools-Style Layout** — Colorful module navigation in 4 groups
- 🌓 **Light/Dark Theme** — One-click switch with smooth transitions
- 🏆 **Achievements** — 24 badges (19 chapters + 4 milestones + 1 champion)
- 🔒 **Chapter Lock** — Control chapter access by grade/class
- 🎓 **Admin Panel** — Student management, batch ops, statistics, class analytics, notices, CSV export, backup, chapter lock, registration management
- 👤 **Student Registration** — Grade and class selection
- 💬 **Real-Time Notifications** — WebSocket push for achievements and system notices

## Quick Start

Double-click `start_server.bat` and wait for auto-configuration.

Then visit:

- Student site: **http://localhost:3000**
- Admin panel: **http://localhost:3000/admin.html** (admin / admin123)

For manual setup:

1. Install Node.js 16+ and MySQL 5.7+
2. `npm install`
3. `node server.js`

## Project Structure

See the main [README.md](README.md) for the full structure.

## Database Tables

| Table | Purpose |
|-------|---------|
| `students` | Student accounts (grade, class, status) |
| `admins` | Admin accounts |
| `learning_progress` | Module completion and scores |
| `achievements` | Achievement records |
| `login_logs` | Login history |
| `notices` | System announcements |
| `mistake_book` | Mistake records |
| `code_snippets` | Code snippets |
| `discussion_posts` | Discussion threads |
| `discussion_replies` | Discussion replies |
| `chapter_locks` | Chapter lock rules |
| `learning_goals` | Learning goals |

## Repositories

- Gitee: https://gitee.com/fiveubisoft/Python-Learning-Platform
- GitHub: https://github.com/894185226/Python-Learning-Platform