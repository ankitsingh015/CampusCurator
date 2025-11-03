# CampusCurator 🎓

A comprehensive campus-wide platform connecting students, mentors, and administrators to manage academic project drives efficiently through all stages - from group formation to final results.

## 🌟 Features

### For Students
- 📝 View and join active project drives
- 👥 Create or join project groups with invitation codes
- 🎯 Set mentor preferences for group allotment
- 📄 Submit project synopsis for mentor approval
- 📊 Submit checkpoint evaluations (mid-sem, end-sem)
- 🏆 View evaluation feedback and final results

### For Mentors
- 👀 View assigned groups and student details
- ✅ Review and approve/reject project synopsis
- 📝 Evaluate checkpoint submissions
- 💬 Provide feedback and improvement suggestions
- 📈 Track student progress throughout the drive

### For Admins
- 🚀 Create and manage project drives
- 👥 Manage student batches and mentor lists
- ⚙️ Configure group sizes and mentor capacity
- 🔄 Manual or automatic mentor allotment
- 📊 View comprehensive drive statistics
- 🎯 Manage stage transitions and deadlines
- 📢 Declare and publish final results

## 🏗️ Architecture

### Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Atlas)
- **ODM:** Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Validation:** express-validator

### Project Stages
1. **Drive Creation** - Admin sets up project drive with configuration
2. **Group Formation** - Students create/join groups with invitation codes
3. **Mentor Allotment** - Manual or automatic mentor assignment
4. **Synopsis Submission** - Groups submit project proposals for approval
5. **Checkpoints/Evaluations** - Progress tracking through multiple evaluations
6. **Result Declaration** - Final consolidated results publication

## 📁 Project Structure

```
CampusCurator/
├── backend/                    # Node.js/Express API
│   ├── config/                # Configuration files
│   │   └── database.js       # MongoDB connection
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── driveController.js
│   │   └── groupController.js
│   ├── middleware/           # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   ├── errorHandler.js  # Error handling
│   │   └── upload.js        # File upload config
│   ├── models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Drive.js
│   │   ├── Group.js
│   │   ├── Synopsis.js
│   │   ├── CheckpointSubmission.js
│   │   ├── Evaluation.js
│   │   ├── Result.js
│   │   └── Notification.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── drives.js
│   │   ├── groups.js
│   │   ├── synopsis.js
│   │   ├── checkpoints.js
│   │   ├── evaluations.js
│   │   ├── results.js
│   │   └── notifications.js
│   ├── uploads/            # File storage
│   ├── .env.example       # Environment template
│   ├── package.json
│   ├── server.js         # Entry point
│   └── README.md        # Backend docs
├── database/                # Database documentation
│   ├── SCHEMA.md          # Complete schema reference
│   └── DATABASE_SETUP.md # MongoDB Atlas setup guide
├── QUICKSTART.md         # Quick setup guide
├── README.md            # This file
└── LICENSE

```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- npm or yarn
- MongoDB Atlas account (free tier)

### 1. Clone Repository
```bash
git clone https://github.com/ankitsingh015/CampusCurator.git
cd CampusCurator
```

### 2. Setup MongoDB Atlas
Follow the detailed guide in `database/DATABASE_SETUP.md` to:
- Create a free MongoDB Atlas cluster
- Set up database user and network access
- Get your connection string

### 3. Install & Configure Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and other configs
```

### 4. Start Server
```bash
npm run dev
```

Server runs at http://localhost:5000

### 5. Test API
```bash
# Health check
curl http://localhost:5000/health

# Register admin user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'
```

📖 **For detailed setup instructions, see [QUICKSTART.md](QUICKSTART.md)**

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 steps
- **[Database Setup](database/DATABASE_SETUP.md)** - MongoDB Atlas configuration
- **[Database Schema](database/SCHEMA.md)** - Complete schema documentation
- **[Backend API](backend/README.md)** - API endpoints and usage

## 🔑 API Endpoints

### Authentication
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login user
GET    /api/auth/me          - Get current user
GET    /api/auth/logout      - Logout user
```

### Drives (Admin)
```
POST   /api/drives           - Create drive
GET    /api/drives           - List drives
GET    /api/drives/:id       - Get drive details
PUT    /api/drives/:id       - Update drive
DELETE /api/drives/:id       - Delete drive
GET    /api/drives/:id/stats - Get statistics
PUT    /api/drives/:id/stage - Update stage
```

### Groups (Students)
```
POST   /api/groups                      - Create group
GET    /api/groups                      - List groups
GET    /api/groups/:id                  - Get group details
POST   /api/groups/join                 - Join with code
PUT    /api/groups/:id/members/:mid    - Manage members
DELETE /api/groups/:id                  - Delete group
PUT    /api/groups/:id/mentor          - Allot mentor (Admin)
POST   /api/groups/auto-allot/:driveId - Auto-allot (Admin)
```

*Full API documentation in [backend/README.md](backend/README.md)*

## 🗄️ Database Schema

### Collections
1. **Users** - Students, Mentors, Admins
2. **Drives** - Project drive configurations
3. **Groups** - Student groups with members
4. **Synopsis** - Project proposals
5. **CheckpointSubmissions** - Progress submissions
6. **Evaluations** - Mentor evaluations
7. **Results** - Final consolidated results
8. **Notifications** - System notifications

*Detailed schema in [database/SCHEMA.md](database/SCHEMA.md)*

## 🔐 User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Create drives, manage all groups, allot mentors, publish results |
| **Mentor** | View assigned groups, review synopsis, evaluate checkpoints |
| **Student** | Create/join groups, submit synopsis & checkpoints, view results |

## 🛠️ Development

### Environment Variables
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
```

### Run in Development
```bash
cd backend
npm run dev  # Auto-reload with nodemon
```

### Run in Production
```bash
cd backend
npm start
```

## 🧪 Testing

### Manual Testing with curl
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123","role":"student","batch":"2025"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Use Postman for easier testing
```

## 🚧 Roadmap

- [x] Backend API with authentication
- [x] Drive management system
- [x] Group formation with invitation codes
- [x] Mentor allotment (manual & auto)
- [x] Database schema and models
- [ ] Complete synopsis submission workflow
- [ ] Checkpoint submission with file uploads
- [ ] Evaluation system with feedback
- [ ] Result declaration and publication
- [ ] Email notification system
- [ ] Real-time notifications (Socket.io)
- [ ] Frontend application (React/Vue)
- [ ] File preview and management
- [ ] Analytics dashboard
- [ ] Mobile responsive design

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the terms included in the LICENSE file.

## 👥 Authors

- Ankit Singh - [@ankitsingh015](https://github.com/ankitsingh015)

## 🙏 Acknowledgments

- MongoDB Atlas for database hosting
- Express.js community
- All contributors and testers

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check documentation in `/database` and `/backend`
- Review MongoDB Atlas and Express.js documentation

---

**Made with ❤️ for efficient campus project management**
