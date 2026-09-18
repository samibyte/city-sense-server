  # City Sense API

  City Sense is a TypeScript backend for a city services workflow: citizens can register, submit service requests or complaints, pay for paid services, and track request progress; administrators manage departments, services, and assignment workflows; approved resolvers receive and act on assigned work. The implementation is a Prisma-backed Express API with JWT auth, Redis-backed OTP storage, Cloudinary uploads, Google sign-in, and Stripe Checkout integration.

  ## Project overview

  This project solves the operational problem of coordinating public-service requests between citizens, administrators, and field resolvers. The system models three core roles:

  - Citizen: submits requests, pays for paid services when required, and provides feedback once a request is resolved.
  - Resolver: applies to work in a department, receives assignments, accepts or rejects them, and updates progress.
  - Admin: manages departments, categories, services, user status, request status, and assignment decisions.

  The code is organized around a modular Express service layer and a PostgreSQL schema generated via Prisma. It emphasizes auditability through request status history, transactional updates for assignments and payments, and soft-delete protection for catalog entities.

  ## Why it exists

  The backend exists to bring request intake, assignment logic, service catalog maintenance, payment processing, and approval workflows into a single system. In the current implementation, the business flow is:

  1. Citizen creates a request or complaint tied to a department/category/location.
  2. If the service is paid, the request enters a pending state and a Stripe checkout session is created.
  3. Once payment is confirmed, the request becomes submitted and is routed for assignment.
  4. The system tries to auto-assign the request to an approved resolver in the same department and city, respecting workload limits and rejection history.
  5. Resolver accepts/rejects the assignment and moves work through status milestones.
  6. Admins can manually assign, reassign, or update status, and can review resolver applications.

  ## Key features and workflows

  ### Citizen-facing workflow

  - Email/password registration with profile image upload and OTP-based email verification.
  - Login and refresh-token flow using JWTs stored in httpOnly cookies and also returned in the response body.
  - Password reset and forgot-password flows using Redis-backed OTPs and SMTP email delivery.
  - Google sign-in for citizen accounts.
  - Request creation for either `COMPLAINT` or `SERVICE_REQUEST` with `location` metadata and optional attachments.
  - Paid service handling through Stripe Checkout and a confirmation fallback.
  - Request status tracking and feedback submission after resolution.

  ### Resolver-facing workflow

  - Resolver application with resume and supporting file uploads to Cloudinary.
  - Admin review and approval/rejection of applications with generated initial credentials on approval.
  - Assignment listing and detail retrieval scoped to the resolver's profile.
  - Accept/reject assignment decisions and update assignment status to `IN_PROGRESS` or `COMPLETED`.
  - Resolver file uploads and user profile updates.

  ### Admin workflow

  - Dashboard stats for platform-level overview.
  - List and filter requests and users.
  - Assign or reassign requests to approved resolvers.
  - Update request status with status-history tracking.
  - Manage departments, categories, and catalog services.
  - Review available resolvers by department and city.
  - Toggle user status (`ACTIVE`, `BANNED`, `DELETED`) and manage resolver verification.

  ## Architecture

  ```mermaid
  flowchart LR
      Client[Frontend / API consumer] --> App[Express app]
      App --> Routes[Route modules]
      Routes --> Services[Service layer]
      Services --> Prisma[Prisma + PostgreSQL]
      Services --> Redis[Redis for OTPs]
      Services --> Cloudinary[Cloudinary uploads]
      Services --> Stripe[Stripe Checkout + Webhooks]
      Services --> Email[Nodemailer SMTP]
      Services --> Google[Google OAuth verification]
  ```

  The app is mounted in `src/app.ts` and bootstraps runtime dependencies in `src/server.ts`. Each domain module follows the same pattern:

  - Route file defines HTTP paths and middleware chain.
  - Controller handles request parsing and standard API response shape.
  - Service contains business logic and database operations.
  - Validation layer uses Zod schemas before service logic runs.
  - Prisma models define persistent state and relationships.

  The service layer is intentionally modular, but not fully layered by repository interface beyond a Prisma extension used for user-specific query helpers.

  ## File structure

  ```text
  .
  ├── prisma/
  │   ├── schema/                  # Prisma models and enums split by domain
  │   ├── migrations/             # Database migration history
  │   └── seed.ts                 # Demo users, departments, services, and resolver profiles
  ├── src/
  │   ├── app.ts                  # Express app setup and route mounting
  │   ├── server.ts               # Runtime bootstrap for DB, Redis, SMTP verification
  │   ├── app/
  │   │   ├── config/env.ts       # Environment validation and config loading
  │   │   ├── errorHelpers/
  │   │   ├── lib/                # Prisma, Redis, Stripe, Cloudinary, SMTP clients
  │   │   ├── middleware/         # Auth, validation, rate limiting, errors
  │   │   ├── module/             # Feature modules: auth, request, payment, admin, resolver, etc.
  │   │   ├── templates/          # EJS email templates
  │   │   └── utils/              # Token helpers, response helpers, Cloudinary upload utility
  │   └── generated/prisma/       # Generated Prisma client and types
  ├── env.example                 # Environment variable template
  ├── package.json                # Scripts and dependency set
  ├── tsconfig.json               # TypeScript configuration
  ├── tsup.config.ts              # Build configuration
  ├── vercel.json                 # Vercel deployment routing
  ├── README.md                   # Project overview and setup
  └── City Sense.postman_collection.json
  ```

  Notable implementation files:

  - `src/app/middleware/checkAuth.ts`: central RBAC and JWT validation middleware.
  - `src/app/middleware/rateLimiter.ts`: auth and OTP rate limiting.
  - `src/app/middleware/globalErrorHandler.ts`: consistent JSON error formatting for AppError, Prisma errors, and Zod errors.
  - `src/app/lib/redis-client.ts`: Redis connection lifecycle and OTP storage helper.
  - `src/app/module/assignment/assignment.service.ts`: resolver matching and auto-assignment logic.
  - `src/app/module/payment/payment.service.ts`: Stripe session creation, confirmation, and webhook handling.

  ## Tech stack

  | Technology | Role in the project |
  | --- | --- |
  | TypeScript | Primary application language with explicit types and structured modules. |
  | Node.js + Express 5 | HTTP server, middleware chain, route handling, and request lifecycle. |
  | Prisma 7 + PostgreSQL | Data access layer, schema validation, migrations, and relational modeling. |
  | Redis | OTP storage and short-lived auth-related data with expiration. |
  | Stripe | Paid request checkout and webhook-based payment status updates. |
  | Cloudinary | File upload and media storage for profile images, resumes, attachments, and support documents. |
  | PostgreSQL `@prisma/adapter-pg` | Database driver integration used by Prisma. |
  | JWT + cookie-parser | Access and refresh token generation/verification, cookie-based auth. |
  | Zod | Request validation for input payloads and API contracts. |
  | Nodemailer + SMTP | Email verification, password reset, assignment, and approval notifications. |
  | Google OAuth | `google-auth-library` ID token validation for Google citizen login. |
  | Helmet + CORS + express-rate-limit | HTTP hardening and request throttling. |
  | Vercel | Deployment target defined in `vercel.json`. |
  | bcrypt | Password hashing. |
  | Multer | In-memory file upload handling for multipart requests. |

  ## API route structure

  Base path for all routes is `/api/v1`.

  ### Auth

  | Method | Path | Auth | Purpose |
  | --- | --- | --- | --- |
  | `POST` | `/api/v1/auth/register` | No | Create citizen account with optional profile image. |
  | `POST` | `/api/v1/auth/login` | No | Email/password login; sets access and refresh tokens. |
  | `GET` | `/api/v1/auth/me` | `ADMIN`, `CITIZEN`, `RESOLVER` | Return current user profile. |
  | `POST` | `/api/v1/auth/refresh-token` | No | Refresh JWT pair. |
  | `POST` | `/api/v1/auth/send-verification-otp` | No | Send email verification OTP. |
  | `POST` | `/api/v1/auth/forgot-password` | No | Trigger reset email if account is eligible. |
  | `POST` | `/api/v1/auth/reset-password` | No | Validate OTP and set new password. |
  | `POST` | `/api/v1/auth/verify-email` | No | Validate OTP and confirm email. |
  | `POST` | `/api/v1/auth/login/google` | No | Verify Google ID token and sign in the citizen. |

  ### Departments

  | Method | Path | Auth | Purpose |
  | --- | --- | --- | --- |
  | `GET` | `/api/v1/departments` | No | List active departments. |
  | `GET` | `/api/v1/departments/:id` | No | Fetch department with categories and services. |
  | `POST` | `/api/v1/departments` | `ADMIN` | Create department. |
  | `PATCH` | `/api/v1/departments/:id` | `ADMIN` | Update department. |
  | `DELETE` | `/api/v1/departments/:id` | `ADMIN` | Soft-delete department if no active services remain. |

  ### Services and categories

  | Method | Path | Auth | Purpose |
  | --- | --- | --- | --- |
  | `GET` | `/api/v1/services/categories` | No | List categories. |
  | `GET` | `/api/v1/services/categories/:id` | No | Fetch category details and its services. |
  | `POST` | `/api/v1/services/categories` | `ADMIN` | Create category. |
  | `PATCH` | `/api/v1/services/categories/:id` | `ADMIN` | Update category. |
  | `DELETE` | `/api/v1/services/categories/:id` | `ADMIN` | Soft-delete category if no active services remain. |
  | `GET` | `/api/v1/services` | No | List services with pagination/filter support. |
  | `GET` | `/api/v1/services/:id` | No | Fetch service detail. |
  | `POST` | `/api/v1/services` | `ADMIN` | Create service. |
  | `PATCH` | `/api/v1/services/:id` | `ADMIN` | Update service. |
  | `DELETE` | `/api/v1/services/:id` | `ADMIN` | Soft-delete service. |

  ### Requests

  | Method | Path | Auth | Purpose |
  | --- | --- | --- | --- |
  | `POST` | `/api/v1/requests` | `CITIZEN` | Create complaint or service request with optional attachments. |
  | `GET` | `/api/v1/requests/my-requests` | `CITIZEN` | List the current citizen's requests with filters. |
  | `GET` | `/api/v1/requests/:id` | `CITIZEN`, `RESOLVER`, `ADMIN` | Fetch a request and its nested history. |
  | `PATCH` | `/api/v1/requests/:id/cancel` | `CITIZEN` | Cancel a pending or submitted request. |
  | `POST` | `/api/v1/requests/:id/feedback` | `CITIZEN` | Submit rating and comment for a resolved/completed request. |
  | `PATCH` | `/api/v1/requests/:id/confirm` | `CITIZEN` | Confirm completion after resolver work is done. |

  ### Resolver lifecycle

  | Method | Path | Auth | Purpose |
  | --- | --- | --- | --- |
  | `POST` | `/api/v1/resolver/apply-as-resolver` | No | Apply with resume and optional supporting files. |
  | `GET` | `/api/v1/resolver/applications` | `ADMIN` | List resolver applications. |
  | `GET` | `/api/v1/resolver/applications/:id` | `ADMIN` | Fetch one application. |
  | `PATCH` | `/api/v1/resolver/application-review` | `ADMIN` | Approve or reject a resolver application. |
  | `GET` | `/api/v1/resolver/assignments` | `RESOLVER` | List assignments for a resolver. |
  | `GET` | `/api/v1/resolver/assignments/:id` | `RESOLVER` | Fetch one assignment and the request context. |
  | `PATCH` | `/api/v1/resolver/assignments/:id/accept` | `RESOLVER` | Accept a pending assignment. |
  | `PATCH` | `/api/v1/resolver/assignments/:id/reject` | `RESOLVER` | Reject assignment with a reason and trigger reassignment. |
  | `PATCH` | `/api/v1/resolver/assignments/:id/status` | `RESOLVER` | Update progress to `IN_PROGRESS` or `COMPLETED`. |

  ### Admin operations

  | Method | Path | Auth | Purpose |
  | --- | --- | --- | --- |
  | `GET` | `/api/v1/admin/stats` | `ADMIN` | Returns dashboard summary. |
  | `GET` | `/api/v1/admin/requests` | `ADMIN` | List requests with admin filters. |
  | `GET` | `/api/v1/admin/resolvers/available` | `ADMIN` | List candidate resolvers by department/city. |
  | `POST` | `/api/v1/admin/requests/assign` | `ADMIN` | Assign a request to a resolver. |
  | `POST` | `/api/v1/admin/requests/reassign` | `ADMIN` | Reassign an active request. |
  | `PATCH` | `/api/v1/admin/requests/:id/status` | `ADMIN` | Manual request status update. |
  | `GET` | `/api/v1/admin/users` | `ADMIN` | List users with role and status filters. |
  | `PATCH` | `/api/v1/admin/users/:id/status` | `ADMIN` | Update a user's status. |

  ### Users

  | Method | Path | Auth | Purpose |
  | --- | --- | --- | --- |
  | `PATCH` | `/api/v1/users/profile` | `CITIZEN`, `RESOLVER`, `ADMIN` | Update profile name, phone, address, or image. |

  ### Payments

  | Method | Path | Auth | Purpose |
  | --- | --- | --- | --- |
  | `POST` | `/api/v1/payments/create` | `CITIZEN` | Create Stripe Checkout session for a pending paid request. |
  | `POST` | `/api/v1/payments/confirm` | `CITIZEN` | Confirm payment manually using Stripe session ID. |
  | `GET` | `/api/v1/payments/:requestId` | `CITIZEN` | Fetch payment state for a request. |
  | `POST` | `/api/v1/payments/webhook` | No, raw webhook endpoint | Stripe webhook endpoint for session completion and expiry events. |

  ## Authentication and authorization

  Authentication is enforced centrally in `src/app/middleware/checkAuth.ts`.

  - JWT verification is performed against the configured access token secret.
  - Tokens may be accepted from either the `accessToken` cookie or the `Authorization: Bearer ...` header.
  - User identity is re-fetched from the database and must still match the JWT email, role, and status.
  - Role checks are enforced via `auth(Role.ADMIN, Role.CITIZEN, Role.RESOLVER)` and route-level middleware.
  - The middleware also blocks deleted or banned accounts and denies access to inactive user records.

  The application defines these roles:

  - `ADMIN`
  - `RESOLVER`
  - `CITIZEN`

  Supported user state checks include `ACTIVE`, `BANNED`, and `DELETED`, and request workflows push status history into `RequestStatusHistory` for auditability.

  ## Validation, errors, and security measures

  - Input validation is performed with Zod schemas under `src/app/module/**/validation.ts` and enforced with `validateRequest` middleware.
  - The global error handler standardizes response payloads for:
    - custom `AppError`
    - Zod validation issues
    - Prisma client errors (`P2002`, `P2003`, `P2025`, initialization issues)
  - `helmet()` is mounted globally.
  - `cors()` is configured to allow the configured `FRONTEND_URL` with credentials.
  - Auth and OTP endpoints are rate-limited with `express-rate-limit`.
  - Stripe webhooks are mounted before JSON parsing using `express.raw({ type: "application/json" })` to preserve the exact payload for signature verification.
  - File uploads are handled in-memory via `multer.memoryStorage()`, then uploaded to Cloudinary or stored in JSON metadata arrays.
  - Cookies are set as `httpOnly` and `sameSite: "none"` with `secure: false`, which is suited to local development and should be reviewed before production deployment over HTTPS.

  ## Database schema and important relationships

  The main Prisma schema is split across domain files under `prisma/schema/` and the generated client is in `src/generated/prisma`.

  ### Core entities

  | Model | Key purpose |
  | --- | --- |
  | `User` | Auth identity and role metadata; has one `CitizenProfile` or one `ResolverProfile`. |
  | `CitizenProfile` | Citizen-specific profile, address, and request history. |
  | `ResolverProfile` | Department-affiliated resolver profile with verification status and assignments. |
  | `Department` | Organizational unit for services and resolver responsibility. |
  | `ServiceCategory` | Grouping of services under departments. |
  | `Service` | Catalog item with pricing and department/category linkage. |
  | `Location` | Request location structure with `address`, `area`, `city`, and coordinates. |
  | `Request` | Common item for complaint or service request with status, assignment, and event history. |
  | `Assignment` | Resolver-to-request linkage with status transitions and reassignment chain. |
  | `Payment` | Stripe/payment state per request, including `amount`, `status`, `transactionId`, and raw gateway data. |
  | `Feedback` | Citizen rating/comment tied to a request and resolver. |
  | `RequestStatusHistory` | Audit trail of status changes. |

  ### Important relationships

  - `User` is the root identity for `citizen` and `resolver` profiles.
  - Each `Request` belongs to a `CitizenProfile`, a `Location`, and optionally a `Service` and `ServiceCategory`.
  - `Request` owns a list of `Assignment` records and a single `Payment` row.
  - Each `Assignment` belongs to exactly one `Request` and one `ResolverProfile`.
  - `ResolverProfile` tracks `verificationStatus` (`PENDING`, `APPROVED`, `REJECTED`) and `maxConcurrentAssignments`.
  - Soft-delete flags exist on departments, categories, services, and inactive user records.

  ## Key engineering decisions and trade-offs

  - Prisma schema-driven modeling keeps database contracts explicit and easy to evolve alongside the service layer.
  - `statusHistory` rows are created alongside status changes so admin and resolver actions remain auditable.
  - Auto-assignment is intentionally asynchronous: `assignmentService.assignNextResolver(...).catch(...)` avoids blocking request creation when assignment logic is delayed or fails.
  - Resolver matching filters by department, city, approval status, and prior rejection history; it also respects `maxConcurrentAssignments` to avoid overload.
  - Payment lifecycle includes both Stripe webhook processing and a manual confirmation fallback when the webhook is delayed or not received.
  - The system uses `Promise.all` for file uploads and email dispatch to reduce latency for multi-file or multi-recipient operations.
  - Redis-backed OTP storage keeps temporary authentication artifacts separate from the database and gives them expiration windows.
  - Email sending is fail-open: verification and notification email errors are logged, but the user flow continues instead of crashing the whole process. This prioritizes availability.
  - The app re-establishes DB and Redis connectivity on each request in serverless mode to improve resilience in cold starts.
  - Soft-delete behavior is favored over hard deletes for catalog records, which reduces operational risk when historical data is still relevant.

  ## Performance, scalability, and optimization work present

  The codebase shows several practical optimization and resilience patterns:

  - Pagination support on list endpoints with `page` and `limit` query parameters.
  - Indexed Prisma fields for common search and filter paths such as email, role, status, request category, request status, and assignment lifecycle.
  - Parallel data fetching with `Promise.all` for list endpoints and multi-file uploads.
  - Redis with reconnection logic and retry strategy to tolerate temporary connection loss.
  - Transactional database updates for critical paths such as:
    - payment confirmation
    - assignment acceptance/rejection
    - admin assignment/reassignment flows
    - status updates with request history creation
  - Request and assignment operations are designed to keep the database as the source of truth while offloading media and messaging to external services.

  There is no application-level distributed queue or worker system in the current codebase; notification, reassignment, and assignment logic are triggered inline or as fire-and-forget asynchronous tasks.

  ## External services and integrations

  - PostgreSQL via Prisma and `@prisma/adapter-pg`
  - Redis for OTP storage
  - Stripe Checkout + webhook signatures
  - Cloudinary media hosting
  - Google OAuth token validation
  - SMTP via Nodemailer for transactional email
  - Vercel deployment configuration

  ## Setup and local development

  ### Prerequisites

  - Node.js
  - pnpm
  - PostgreSQL database
  - Redis instance
  - Stripe account for secret keys and webhook secret
  - Cloudinary account
  - SMTP provider for email sending
  - Google OAuth client credentials

  ### Install and run

  ```bash
  pnpm install
  pnpm generate
  pnpm migrate
  pnpm seed
  pnpm dev
  ```

  ### Production build

  ```bash
  pnpm build
  pnpm start
  ```

  ### Useful scripts

  | Script | Purpose |
  | --- | --- |
  | `pnpm dev` | Starts the app in watch mode with `tsx watch src/server.ts`. |
  | `pnpm build` | Builds the project with `tsup`. |
  | `pnpm start` | Runs the compiled server from `dist/server.js`. |
  | `pnpm generate` | Regenerates the Prisma client. |
  | `pnpm migrate` | Runs Prisma migration in development mode. |
  | `pnpm push` | Pushes schema changes without migration files. |
  | `pnpm studio` | Opens Prisma Studio. |
  | `pnpm seed` | Runs the seed script for demo data. |
  | `pnpm lint:check` / `pnpm lint:fix` | Biome lint checks. |
  | `pnpm format:check` / `pnpm format:fix` | Biome formatting checks. |

  ### Required environment variables

  The repository includes `env.example` with the expected keys. The app validates critical values in `src/app/config/env.ts` before startup. Required groups include:

  - `NODE_ENV`, `PORT`, `DATABASE_URL`, `FRONTEND_URL`, `APP_URL`
  - JWT secrets and expiration values
  - SMTP credentials and sender config
  - Google OAuth credentials
  - Cloudinary credentials
  - Stripe secret and webhook secret
  - Redis connection details

  Example environment names from the codebase:

  ```env
  DATABASE_URL="postgresql://..."
  FRONTEND_URL="http://localhost:3000"
  APP_URL="http://localhost:5000"
  ACCESS_TOKEN_SECRET="..."
  REFRESH_TOKEN_SECRET="..."
  EMAIL_SENDER_SMTP_HOST="smtp.gmail.com"
  EMAIL_SENDER_SMTP_PORT="587"
  EMAIL_SENDER_SMTP_USER="..."
  EMAIL_SENDER_SMTP_PASS="..."
  GOOGLE_CLIENT_ID="..."
  GOOGLE_CLIENT_SECRET="..."
  CLOUDINARY_CLOUD_NAME="..."
  CLOUDINARY_API_KEY="..."
  CLOUDINARY_API_SECRET="..."
  STRIPE_SECRET_KEY="..."
  STRIPE_WEBHOOK_SECRET="..."
  REDIS_HOST="..."
  REDIS_PORT="..."
  REDIS_USER="default"
  REDIS_PASS="..."
  ```

  ## Example API usage

  ### Login

  ```http
  POST /api/v1/auth/login
  Content-Type: application/json

  {
    "email": "citizen@citysense.com",
    "password": "Citizen@123"
  }
  ```

  Response includes JWTs and sets cookies for `accessToken` and `refreshToken`.

  ### Create a request

  ```http
  POST /api/v1/requests
  Authorization: Bearer <accessToken>
  Content-Type: multipart/form-data

  {
    "type": "SERVICE_REQUEST",
    "serviceId": "<service-id>",
    "location": {
      "address": "Road 5, Dhanmondi",
      "area": "Dhanmondi",
      "city": "Dhaka",
      "latitude": "23.7542",
      "longitude": "90.3677"
    }
  }
  ```

  The code also accepts `attachments` as an uploaded file array, up to 5 files per request.

  ### Create Stripe payment session

  ```http
  POST /api/v1/payments/create
  Authorization: Bearer <accessToken>
  Content-Type: application/json

  {
    "requestId": "<request-uuid>"
  }
  ```

  The response returns a `checkoutUrl` and a payment record, and the payment is later confirmed through the Stripe session or the webhook.

  ## Future improvements

  The most logical next steps, based on the current code, are:

  - stronger production hardening for cookies and CORS in HTTPS deployments
  - a dedicated job queue for asynchronous assignment and email processing
  - additional admin analytics and export endpoints for platform operations
  - more explicit notification channels beyond email for assignment and status changes
  - more comprehensive observability, retries, and failure monitoring around external services

  These follow naturally from the existing architecture and would preserve the codebase’s current transaction-first, service-oriented structure.

  ## Summary

  City Sense is a role-based city services backend built around Express, Prisma, and PostgreSQL, with strong enforcement of identity, request lifecycle, payment processing, and assignment workflows. The code is organized for maintainability, includes transactional safeguards where data integrity matters, and integrates with the external services necessary to support media uploads, email, OAuth, and payment processing.
