# Email Notification Setup

This document explains how to configure email notifications for ESP32 alerts.

## Features

The system sends email notifications when:
- **Temperature > 40°C** (High temperature alert)
- **Temperature < -10°C** (Low temperature alert)
- **Humidity > 30%** (High humidity alert)
- **Rain sensor detects water** (Rain alert)
- **MQ2 gas sensor detects gas** (Gas alert)

## Email Configuration

### Step 1: Configure Brevo (recommended – HTTP API, no SMTP ports)

Add the following environment variables to your `.env` / Railway variables:

```env
# Brevo Email Configuration (recommended)
BREVO_API_KEY=your_brevo_api_key       # Brevo (Sendinblue) API key
EMAIL_USER=your-email@example.com      # Sender email (must be a validated sender in Brevo)
```

The backend now uses Brevo's HTTPS API at `https://api.brevo.com/v3/smtp/email`, which works well on
platforms (like Railway) that block direct SMTP ports.

**Note**: `EMAIL_RECIPIENT` is not needed. Recipients are managed through the web dashboard.

### Step 2: Add Email Recipients via Web Dashboard

1. Log in to the dashboard
2. Go to the "📧 Email Alert Recipients" section
3. Add email addresses that should receive alerts
4. You can add multiple recipients - all will receive notifications

## Gmail Setup (Example)

If using Gmail, you need to:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as `EMAIL_PASS`

Example Gmail configuration:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=yourname@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  # App password (16 characters, spaces optional)
```

Then add recipients through the web dashboard (no need to set EMAIL_RECIPIENT).

## Other Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Custom SMTP Server
```env
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-password
```

## Testing

After configuring email settings, restart your backend server. You should see:
- `✅ Email service initialized` if configuration is correct
- `⚠️ Email service not configured` if email settings are missing

## Alert Behavior

- **Multiple Recipients**: All active email recipients in the database will receive alert notifications
- **Duplicate Prevention**: Each alert type is sent only once per condition. The alert resets when the condition returns to normal.
- **Example**: If temperature goes above 40°C, an email is sent to all recipients. Another email won't be sent until temperature drops below 40°C and then goes above again.

## Managing Recipients

Email recipients are managed through the web dashboard:
- **Add Recipients**: Enter email address (and optional name) in the dashboard
- **Remove Recipients**: Click "Remove" button next to any recipient
- **Multiple Recipients**: Add as many email addresses as needed - all will receive alerts

## Troubleshooting

1. **Email not sending**: Check that all email environment variables are set correctly
2. **Authentication failed**: Verify your email password/app password is correct
3. **Connection timeout**: Check your firewall/network allows SMTP connections
4. **Gmail blocking**: Make sure you're using an App Password, not your regular password

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords for Gmail instead of your main password
- Consider using environment variables in production (Railway, Heroku, etc.)

