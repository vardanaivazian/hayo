# Ortak Telegram Signaler

A real-time monitoring and notification system for NFT collections and snowball events, with Telegram integration.

## Overview

This project monitors NFT collections and snowball events, tracking percentage changes and sending notifications to Telegram channels. It's designed to provide real-time updates about collection status, percentage changes, and important milestones.

## Features

- **Collection Monitoring**: Tracks regular collections, partner collections, and snowball collections
- **Percentage Change Detection**: Monitors and reports significant percentage changes
- **Telegram Integration**: Sends formatted notifications to Telegram channels
- **Snowball Tracking**: Special handling for snowball collections with unique thresholds
- **Chart Generation**: Creates visual charts for percentage changes and GGR data
- **Developer Testing**: Includes comprehensive test suite for simulating events

## Project Structure

```
ortak-tg-signaler/
├── src/
│   ├── monitor/              # Collection monitoring logic
│   │   ├── collectionMonitor.js
│   │   └── newCollectionMonitor.js
│   ├── service/              # Service layer
│   │   ├── tgNotificationService.js
│   │   ├── chartService.js
│   │   └── multyChannelNotificationService.js
│   ├── util/                 # Utility functions
│   │   ├── constants.js
│   │   ├── common.js
│   │   ├── messageFormatter.js
│   │   └── calculators.js
│   └── test/                 # Test suite
│       ├── test.js
│       ├── snowballPercentageTest.js
│       └── mockData/
│           └── snowballSimulator.js
├── config.js                 # Configuration settings
├── .env.example             # Example environment variables
└── README.md                # This file
```

## Configuration

### Environment Variables

The project uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```env
# Environment
NODE_ENV=development  # or production

# API Configuration
API_BASE_URL=https://api.example.com
API_KEY=your_api_key_here

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_DEV_CHANNEL_ID=-100xxxxxxxxxx
TELEGRAM_PROD_CHANNEL_ID=-100xxxxxxxxxx

# Monitoring Intervals (in milliseconds)
MAIN_MONITORING_INTERVAL=12000
NEW_COLLECTION_INTERVAL=60000

# Notification Thresholds
MINIMUM_PERCENTAGE_DELTA=0.1
SNOWBALL_NOTIFICATION_THRESHOLD=1.0

# Debug Mode
DEBUG=true  # Set to false in production
```

### Configuration Files

1. **Development Configuration**
    - Create `.env.development` for development-specific settings
    - Debug mode enabled
    - Uses development Telegram channel
    - Shorter monitoring intervals for testing

2. **Production Configuration**
    - Create `.env.production` for production settings
    - Debug mode disabled
    - Uses production Telegram channel
    - Standard monitoring intervals

### Loading Configuration

The project uses the following priority for loading configurations:
1. Environment variables
2. `.env` file
3. `.env.{NODE_ENV}` file
4. Default values in `config.js`

Example usage in code:
```javascript
require('dotenv').config({
    path: process.env.NODE_ENV === 'production' 
        ? '.env.production' 
        : '.env.development'
});
```

### Security Notes

- Never commit `.env` files to version control
- Keep API keys and tokens secure
- Use different channels for development and production
- Rotate tokens regularly
- Use environment-specific configurations

## Key Components

### Collection Monitor

The `CollectionMonitor` class is the core component that:
- Fetches collection data at regular intervals
- Tracks percentage changes
- Determines when to send notifications
- Manages collection state

### Snowball Simulator

The `SnowballSimulator` class provides testing capabilities:
- Creates mock snowball collections
- Simulates percentage changes
- Tests notification thresholds
- Verifies Telegram message formatting

### Telegram Notification Service

The `TgNotificationService` handles:
- Message formatting for Telegram
- Sending text and image notifications
- Channel management
- Hashtag generation

## Testing

The project includes a comprehensive test suite:

```bash
# Run the main test
node src/test/test.js

# Run the snowball percentage test
node src/test/snowballPercentageTest.js
```

## Usage

1. Install dependencies:
```bash
npm install
```

2. Set up environment:
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

3. Start the monitoring service:
```bash
# Development
NODE_ENV=development node src/index.js

# Production
NODE_ENV=production node src/index.js
```

## Development

### Adding New Tests

1. Create a new test file in `src/test/`
2. Use the `SnowballSimulator` for mocking
3. Implement test cases
4. Run with `node src/test/your-test-file.js`

### Extending Functionality

- Add new collection types in `constants.js`
- Implement new notification formats in `messageFormatter.js`
- Extend the monitor in `collectionMonitor.js`