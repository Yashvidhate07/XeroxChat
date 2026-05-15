# XeroxChat - Production-Grade Real-Time Chat Application

XeroxChat is a production-grade real-time chat application developed using **TypeScript, Node.js, Express.js, Socket.IO, and MySQL**.

The main purpose of this project was to understand real-time bidirectional communication, WebSocket architecture, and scalable backend development.

The application allows multiple users to join chat rooms and communicate instantly without refreshing the page. Socket.IO is used for real-time messaging, room-based communication, typing indicators, and live user updates.

Initially, the project supported only temporary messaging during active sessions, but later MySQL database integration was added to permanently store chat history. Messages are now saved along with usernames, room information, and timestamps, and previous conversations are automatically loaded when users rejoin rooms.

The project also includes a smart chatbot system that generates automated conversational replies based on user messages. Both user messages and bot responses are stored in the database in real time.

The application follows a modular TypeScript architecture with separated socket handlers, services, validation layers, and middleware, making the project scalable and maintainable.

Through this project, I improved my skills in backend development, real-time systems, database integration, event-driven programming, API architecture, GitHub version control, and deployment workflows.

---

## 🚀 Features

- Real-time messaging using Socket.IO
- Multiple chat rooms
- Live user join/leave notifications
- Typing indicators
- Persistent chat history using MySQL
- Smart chatbot auto replies
- Previous message loading
- Responsive UI
- TypeScript support
- Zod validation
- Structured logging
- XSS protection
- Graceful shutdown handling
- Modular backend architecture

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- Socket.IO
- TypeScript
- MySQL
- Zod
- Vitest
- WebSockets
- HTML
- CSS
- JavaScript

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/Yashvidhate07/XeroxChat.git
```

Go to project folder:

```bash
cd XeroxChat
```

Install dependencies:

```bash
npm install
```

Create `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=xeroxchat
PORT=3000
```

---

## 🗄️ MySQL Setup

Login to MySQL:

```bash
mysql -u root -p
```

Create database:

```sql
CREATE DATABASE xeroxchat;
```

Use database:

```sql
USE xeroxchat;
```

Create messages table:

```sql
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  room VARCHAR(100),
  text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ▶️ Run Project

Start development server:

```bash
npm run dev
```

Application will run on:

```text
http://localhost:3000
```

---

## 📚 Learning Outcomes

- Real-time communication using WebSockets
- Socket.IO event handling
- Backend architecture using TypeScript
- MySQL database integration
- Persistent message storage
- Smart chatbot logic
- GitHub version control
- Production-level backend structure

---

## 👨‍💻 Author

**Yash Vidhate**
