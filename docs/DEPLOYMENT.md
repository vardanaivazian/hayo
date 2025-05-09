# Deployment Guide

## Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- Telegram Bot Token
- Access to Telegram channels for notifications
- Environment variables configured

## Environment Setup

1. Create a `.env` file in the root directory with the following variables:

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=your_channel_id

# API Configuration
API_KEY=your_api_key
API_BASE_URL=https://api.example.com

# Monitoring Configuration
MAIN_INTERVAL=300000  # 5 minutes in milliseconds
NEW_COLLECTION_INTERVAL=60000  # 1 minute in milliseconds

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/ortak-tg-signaler.git
cd ortak-tg-signaler
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Build the project:
```bash
npm run build
# or
yarn build
```

## Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
```

### Production Mode

```bash
npm start
# or
yarn start
```

## Docker Deployment

1. Build the Docker image:
```bash
docker build -t ortak-tg-signaler .
```

2. Run the container:
```bash
docker run -d \
  --name ortak-tg-signaler \
  --env-file .env \
  -p 3000:3000 \
  ortak-tg-signaler
```

## PM2 Deployment

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start the application:
```bash
pm2 start dist/index.js --name ortak-tg-signaler
```

3. Configure PM2 to start on system boot:
```bash
pm2 startup
pm2 save
```

## Monitoring

### Health Checks

The application exposes a health check endpoint at `/health` that returns:
- Application status
- Memory usage
- Uptime
- Active connections

### Logging

Logs are written to:
- Console (stdout/stderr)
- File: `./logs/app.log`
- Optional: External logging service

### Metrics

The application collects the following metrics:
- Request count
- Response times
- Error rates
- Memory usage
- CPU usage

## Scaling

### Horizontal Scaling

To scale horizontally:
1. Deploy multiple instances behind a load balancer
2. Use Redis for shared state
3. Configure sticky sessions if needed

### Vertical Scaling

To scale vertically:
1. Increase Node.js memory limit:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

2. Adjust PM2 settings:
```bash
pm2 start dist/index.js --name ortak-tg-signaler --max-memory-restart 4G
```

## Backup and Recovery

### Data Backup

1. Regular backups of:
    - Environment configuration
    - Log files
    - Database (if applicable)

2. Backup schedule:
    - Daily incremental backups
    - Weekly full backups

### Recovery Procedure

1. Restore from backup:
```bash
# Restore environment
cp backup/.env .

# Restore logs
cp -r backup/logs .

# Restore database (if applicable)
mongorestore backup/db
```

2. Verify application:
```bash
npm run test
```

## Security

### SSL/TLS Configuration

1. Generate SSL certificate:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout private.key -out certificate.crt
```

2. Configure HTTPS:
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private.key'),
  cert: fs.readFileSync('certificate.crt')
};

https.createServer(options, app).listen(443);
```

### Firewall Configuration

Required ports:
- 3000: Application
- 443: HTTPS (if applicable)

## Troubleshooting

### Common Issues

1. Memory Leaks
    - Check for unhandled promises
    - Monitor memory usage
    - Use heap snapshots

2. Connection Issues
    - Verify network connectivity
    - Check firewall settings
    - Validate API endpoints

3. Performance Issues
    - Monitor CPU usage
    - Check for blocking operations
    - Analyze response times

### Debug Mode

Enable debug mode:
```bash
DEBUG=* npm start
```

## Maintenance

### Regular Maintenance Tasks

1. Log Rotation
```bash
pm2 install pm2-logrotate
```

2. Dependency Updates
```bash
npm audit
npm update
```

3. Database Maintenance (if applicable)
```bash
npm run db:maintenance
```

### Monitoring and Alerts

1. Set up monitoring:
    - CPU usage > 80%
    - Memory usage > 80%
    - Error rate > 1%
    - Response time > 1s

2. Configure alerts:
    - Email notifications
    - Slack integration
    - SMS alerts

## Rollback Procedure

1. Identify the last stable version:
```bash
git log --oneline
```

2. Revert to the stable version:
```bash
git checkout <commit-hash>
npm install
npm run build
pm2 restart ortak-tg-signaler
```

## Support

For support:
1. Check the documentation
2. Review the issue tracker
3. Contact the development team
4. Submit a new issue if needed 