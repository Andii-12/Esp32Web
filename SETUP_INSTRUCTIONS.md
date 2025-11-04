# Setup Instructions - ESP32 Data Dashboard

## Default Login Credentials

**There are NO default credentials!** You have two options:

### Option 1: Register a New Account (Recommended)

1. Start the application:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm install
   npm start

   # Terminal 2 - Frontend
   cd frontend
   npm install
   npm start
   ```

2. Open your browser to `http://localhost:3000`
3. You'll see the login page
4. Click "Register here" link or go to `http://localhost:3000/register`
5. Fill in:
   - **Username**: (choose any username, min 3 characters)
   - **Email**: (your email address)
   - **Password**: (min 6 characters)
   - **Confirm Password**: (same as password)
6. Click "Register"
7. You'll be automatically logged in and redirected to the dashboard

### Option 2: Create a Default Test User

If you want to create a default test user quickly:

1. Make sure MongoDB is running
2. Navigate to backend directory:
   ```bash
   cd backend
   ```

3. Create default user:
   ```bash
   npm run create-user
   ```

4. Default credentials will be:
   - **Username**: `admin`
   - **Email**: `admin@esp32.com`
   - **Password**: `admin123`

5. **IMPORTANT**: Change this password after first login!

## Login After Registration/Creation

Once you have an account:

1. Go to `http://localhost:3000` (or `/login`)
2. Enter either:
   - Your **username** OR
   - Your **email**
3. Enter your **password**
4. Click "Login"

## Where are Credentials Stored?

- **Database**: MongoDB
- **Collection**: `users` (in the database specified in your `.env` file)
- **Security**: 
  - Passwords are **hashed** using bcrypt (10 rounds)
  - Plain passwords are **NEVER** stored in the database
  - Only the hashed version is saved

## View Users in MongoDB

If you want to see users in MongoDB:

```bash
# Connect to MongoDB
mongosh

# Switch to your database
use esp32data

# View users (passwords will be hashed)
db.users.find().pretty()
```

## Requirements

- Username: Minimum 3 characters, must be unique
- Email: Must be valid email format, must be unique
- Password: Minimum 6 characters

