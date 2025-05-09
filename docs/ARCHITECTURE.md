# Architecture Documentation

## System Overview

The Ortak Telegram Signaler is built with a modular architecture that separates concerns into distinct layers:

```
┌─────────────────┐
│   Monitor Layer │
├─────────────────┤
│  Service Layer  │
├─────────────────┤
│  Utility Layer  │
└─────────────────┘
```

## Core Components

### 1. Monitor Layer

#### CollectionMonitor
- **Purpose**: Main orchestrator for collection monitoring
- **Key Responsibilities**:
    - Fetches and updates collection data
    - Manages monitoring intervals
    - Tracks percentage changes
    - Triggers notifications
- **Key Methods**:
  ```javascript
  async checkPercentageChange(collection)
  async checkFinishingSnowballs(collections)
  resolveDelta(collection)
  ```

#### NewCollectionMonitor
- **Purpose**: Handles new collection detection
- **Key Responsibilities**:
    - Scans for new collections
    - Manages collection scheduling
    - Triggers new collection notifications
- **Key Methods**:
  ```javascript
  async scanForNewCollections()
  handleCollectionScheduling(collection)
  ```

### 2. Service Layer

#### TgNotificationService
- **Purpose**: Manages Telegram communications
- **Key Features**:
    - Message formatting
    - Channel management
    - Image handling
    - Hashtag generation
- **Key Methods**:
  ```javascript
  async sendMessage(channelId, message, options)
  async sendPhoto(channelId, imageBuffer, caption)
  getPercentageChangeHash(collection)
  ```

#### ChartService
- **Purpose**: Generates visual data representations
- **Key Features**:
    - Chart generation
    - Data visualization
    - GGR tracking
- **Key Methods**:
  ```javascript
  async generateRuntimeChart(collection, previousPercentage, chartData)
  getSnowballConfiguration(displayData, collection, colorScheme)
  ```

### 3. Utility Layer

#### MessageFormatter
- **Purpose**: Formats messages for different channels
- **Key Features**:
    - Message templates
    - Emoji handling
    - Link formatting
- **Key Methods**:
  ```javascript
  formatChangeMessage(collection, oldPercentage, latestGGR, isTg)
  formatRewardMessage(collections, isSnowballs, isTg)
  ```

#### Calculators
- **Purpose**: Handles mathematical operations
- **Key Features**:
    - Percentage calculations
    - Time formatting
    - GGR calculations
- **Key Methods**:
  ```javascript
  calculateYearlyStats(collection, originalPrice)
  formatTimeUntilReward(rewardDate)
  ```

## Data Flow

1. **Collection Monitoring**:
   ```
   CollectionMonitor
   └── Fetches Collection Data
       └── Updates Collection Store
           └── Checks Percentage Changes
               └── Triggers Notifications
   ```

2. **Notification Process**:
   ```
   TgNotificationService
   └── Formats Message
       └── Generates Chart (if needed)
           └── Sends to Telegram
   ```

3. **New Collection Detection**:
   ```
   NewCollectionMonitor
   └── Scans for New Collections
       └── Schedules Alerts
           └── Triggers Notifications
   ```

## State Management

### Collection Store
- Uses Map data structure
- Organized by collection type
- Maintains previous percentages
- Tracks notification history

### Configuration State
- Environment-based settings
- Runtime configuration
- Channel management
- Threshold tracking

## Error Handling

### Error Types
1. **API Errors**
    - Network failures
    - Rate limiting
    - Invalid responses

2. **Processing Errors**
    - Invalid data
    - Calculation errors
    - Formatting issues

3. **Notification Errors**
    - Channel access
    - Message formatting
    - Image generation

### Error Recovery
- Automatic retries
- Fallback mechanisms
- Error logging
- Alert notifications

## Performance Considerations

### Optimization Strategies
1. **Caching**
    - Collection data
    - Chart data
    - Configuration

2. **Batch Processing**
    - Collection updates
    - Notifications
    - Chart generation

3. **Resource Management**
    - Memory usage
    - API rate limits
    - Image processing

## Security

### Authentication
- API key management
- Telegram bot tokens
- Channel access control

### Data Protection
- Environment variables
- Secure configuration
- Token rotation

## Monitoring and Logging

### Metrics
- Collection updates
- Notification success
- Error rates
- Performance metrics

### Logging
- Error tracking
- Debug information
- Audit trails
- Performance logs 