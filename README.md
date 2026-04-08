# Northside Rentals Web App

## ReUI Components

Metronic now leverages [ReUI](https://v1.reui.io), our open-source React component library.

Star the [ReUI on GitHub](https://github.com/keenthemes/reui) to help us grow the project and stay updated on new features!

## Login with Supabase Auth

This project uses Supabase for authentication. Follow these steps to set up and test the login functionality:

### Prerequisites

- Node.js 16.x or higher
- Npm or Yarn
- Tailwind CSS 4.x
- React 19.x
- A Supabase account and project

### Installation

To set up the project dependencies, including those required for React 19, use the `--force` flag to resolve any dependency conflicts:

```bash
npm install --force
```

### Environment Setup

1. Make sure your `.env` file is configured with Supabase credentials:

```

VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-for-admin-functions

```

### Creating a Demo User

For testing purposes, you can create a demo user with:

```bash
npm run create-demo-user
```

This will create a user with the following credentials:

- Email: demo@kt.com
- Password: demo123

### Login Features

The login implementation includes:

- Email/Password authentication
- Google OAuth integration
- Password reset flow
- Error handling
- Token management
- Protected routes


### Development

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:5173/auth/signin` to test the login functionality.

### Testing Login

You can test login using:

1. The demo account credentials
2. Register a new account (when implemented)
3. Google Sign-in (requires proper OAuth setup in Supabase)


