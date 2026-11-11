# Backend Architecture & Developer Guide (`ss-hr-BE`)

Welcome to the backend service for **SS Human Resource Consultancy** and **Full Stack Solutions**. This document serves as a persistent guide for AI assistants (such as Claude) and developers working on this codebase.

> [!IMPORTANT]
> **Git Operations Policy**:
> Do NOT execute Git commands (`git add`, `git commit`, `git push`, `git checkout`, etc.). The repository owner manually handles all Git staging, commits, branches, and pushes. AI assistants must focus solely on reading, modifying, verifying, building, and testing code, leaving all Git operations entirely to the user.

---

## 1. Project Overview & Role

- **Repository**: `ss-hr-BE`
- **Application**: Modular RESTful API and WebSocket server built with Express and TypeScript.
- **Key Responsibilities**:
  1. **SS HR Consultancy Core**: User/Candidate authentication, job application pipelines, recruitment package management, visa & ticket inquiries, staff duty tracking, accounting, bills, and payment records.
  2. **Full Stack Solutions (FSS)**: B2B lead generation, telecalling logs, scheduled follow-up tracking, AI-powered sales call summarization, website audit reports, and staff lead assignments.

---

## 2. Tech Stack

- **Runtime & Framework**: [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Database & ODM**: [MongoDB](https://www.mongodb.com/) via [Mongoose 8](https://mongoosejs.com/)
- **Caching**: [Upstash Redis](https://upstash.com/) (`@upstash/redis`)
- **Authentication & Security**:
  - JWT (`jsonwebtoken`) + Cookie Parser
  - Google OAuth 2.0 (`passport`, `passport-google-oauth20`)
  - Password hashing (`bcryptjs`)
  - Security headers via `helmet`, CORS via `cors`, and DDoS/brute-force defense via `rate-limiter-flexible`
- **Real-Time Communication**: [Socket.io](https://socket.io/)
- **Logging & Monitoring**: `winston` + `morgan`
- **Validation**: `zod` and `joi`
- **Email & File Storage**: `nodemailer`, `multer`, AWS S3 / S3-compatible storage

---

## 3. Directory Layout (`src/`)

The backend follows a **Clean / Domain-Driven Architecture**:

```
src/
├── application/       # Business logic, application use cases, and service classes
├── config/            # DB connection, Redis client, Passport strategies, environment config
├── domain/            # Core enterprise models, interfaces, entity contracts
│   ├── entities/      # Core entities (User, Contact, Application, Job, Package, etc.)
│   └── repositories/  # Repository abstraction interfaces
├── infrastructure/    # External interfaces and framework adapters
│   ├── database/      # Mongoose schemas & models (FullStackContactModel, UserModel, etc.)
│   ├── external/      # Third-party integrations (S3, Nodemailer, AI APIs)
│   └── cache/         # Redis caching client & key management
├── presentation/      # HTTP & WebSocket delivery mechanism
│   ├── controllers/   # Request/response controllers
│   ├── middleware/    # Auth, role-based guard, error handler, rate-limiters
│   └── routes/        # Express router declarations
│       ├── adminFullStackContactRouter.ts
│       ├── adminUserRouter.ts
│       ├── authRouter.ts
│       ├── enquiryRouter.ts
│       └── ...
└── server.ts          # Application entrypoint & HTTP server bootstrapping
```

---

## 4. Key Workflows & Commands

Run all commands from within the `ss-hr-BE/` directory:

| Task | Command | Description |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Runs live server via `tsx watch src/server.ts` |
| **Build** | `npm run build` | Cleans `dist/` and compiles TypeScript with `tsc` |
| **Start Production** | `npm start` | Runs the compiled production code `node dist/server.js` |
| **Tests** | `npm test` | Runs test suite via Jest (`ts-jest`) |
| **Lint** | `npm run lint` | Runs ESLint across `src/**/*.ts` |
| **Lint Fix** | `npm run lint:fix` | Automatically fixes ESLint rule violations |

---

## 5. Domain Rules & Core Conventions

### A. Full Stack Solutions (`adminFullStackContactRouter.ts`)
- **Pagination**: Default limit is **8 contacts per page** (`parseInt(req.query.limit) || 8`).
- **Role-Based Access Control**:
  - Staff users (`req.user.role === 'staff'`) are automatically scoped to contacts where `assignedTo = currentUserId`.
  - Admin users can view all contacts, filter by assigned staff, and reassign contacts.
- **Activity Log Persistence**:
  - Whenever a telecaller updates a contact's status, comment, or follow-up schedule, an activity entry is appended to `contact.activityLog`:
    ```ts
    {
      type: "comment" | "status" | "schedule" | "assignment",
      from: string,
      to: string,
      at: Date,
      by: string
    }
    ```
- **AI Comment Summarization**:
  - `POST /admin/full-stack-contacts/summarize-comment` summarizes telecaller activity notes into actionable B2B pitch insights and next steps.

### B. Error Handling & Response Standards
- Standard API response structure:
  ```json
  {
    "success": true,
    "message": "Human-readable description",
    "data": {}
  }
  ```
- All unhandled exceptions in routes should be forwarded to Express `next(error)` to ensure centralized logging via Winston and consistent error payloads.

### C. Authentication & Middleware
- Protect admin routes with `authMiddleware` and verify user identity from `req.user`.
- Store sensitive secrets strictly in `.env` (never commit `.env` to Git).

