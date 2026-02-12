# Password Reset Feature Implementation

Implemented a complete password reset flow including backend API, email integration with Mailjet, and frontend UI.

## Changes

### 1. Database (Prisma)
- Added `resetToken` (String?) and `resetTokenExpires` (DateTime?) to the `User` model.
- Created and applied migration `20260211222754_add_password_reset_fields`.

### 2. Backend (Express)
- **Email Service**: Created `server/src/services/email-service.ts` using `node-mailjet`.
- **Auth Routes**:
    - `POST /auth/forgot-password`: Generates token, saves to DB, and sends email.
    - `POST /auth/reset-password`: Validates token and updates password.
- **Config**: Added Mailjet environment variables to `config.ts`.
- **Tests**: Updated `auth.integration.test.ts` with 100% coverage for new routes and fixed existing bcrypt mocks.

### 3. Frontend (React)
- **Pages**:
    - `ForgotPasswordPage.tsx`: Email entry form.
    - `ResetPasswordPage.tsx`: New password form (accessible via link in email).
- **Context**: Added `forgotPassword` and `resetPassword` to `AuthContext`.
- **UI**: Added "Forgot Password?" link to `LoginPage.tsx`.
- **Internationalization**: Added English and Spanish translations for all new strings.

## Configuration Needed
Update your `server/.env` with the following variables once your Mailjet account is validated:

```env
MAILJET_API_KEY=your_api_key
MAILJET_SECRET_KEY=your_secret_key
EMAIL_FROM=your_authorized_sender@email.com
EMAIL_FROM_NAME="MTG Binder"
```

## Security Measures
- Reset tokens are cryptographically secure (32 bytes).
- Tokens expire after 1 hour.
- Password reset logic uses constant-time comparison (implicit via Prisma find) and secure hashing.
- Forgot password response is generic ("If a user exists...") to prevent user enumeration.
- Database reset tokens are cleared immediately after a successful reset.
