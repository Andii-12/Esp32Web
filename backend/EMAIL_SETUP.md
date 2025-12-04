# Email Notification Setup

This document explains how to configure email notifications for ESP32 alerts.

## Features

The system sends email notifications when:
- **Temperature > 40°C** (High temperature alert)
- **Temperature < -10°C** (Low temperature alert)
- **Rain sensor detects water** (Rain alert)
- **MQ2 gas sensor detects gas** (Gas alert)

## Email Configuration

Add the following environment variables to your `.env` file:

```env
# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com              # SMTP server hostname
EMAIL_PORT=587                         # SMTP port (587 for TLS, 465 for SSL)
EMAIL_SECURE=false                     # true for SSL (port 465), false for TLS (port 587)
EMAIL_USER=your-email@gmail.com        # Your email address
EMAIL_PASS=your-app-password          # Your email password or app password
EMAIL_RECIPIENT=recipient@email.com   # Recipient email (optional, defaults to EMAIL_USER)
```

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
EMAIL_RECIPIENT=alerts@yourdomain.com
```

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

- **Duplicate Prevention**: Each alert type is sent only once per condition. The alert resets when the condition returns to normal.
- **Example**: If temperature goes above 40°C, an email is sent. Another email won't be sent until temperature drops below 40°C and then goes above again.

## Troubleshooting

1. **Email not sending**: Check that all email environment variables are set correctly
2. **Authentication failed**: Verify your email password/app password is correct
3. **Connection timeout**: Check your firewall/network allows SMTP connections
4. **Gmail blocking**: Make sure you're using an App Password, not your regular password

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords for Gmail instead of your main password
- Consider using environment variables in production (Railway, Heroku, etc.)

