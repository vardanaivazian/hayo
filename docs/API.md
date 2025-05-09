# API Documentation

## Collection Monitor API

### CollectionMonitor Class

#### Constructor
```javascript
new CollectionMonitor()
```
Creates a new instance of the collection monitor.

#### Methods

##### start(options)
```javascript
async start({
    mainInterval: number,
    newCollectionInterval: number
}): Promise<{ message: string, mainInterval: number, newCollectionInterval: number }>
```
Starts the collection monitoring process.

**Parameters:**
- `options.mainInterval`: Interval for main monitoring in milliseconds
- `options.newCollectionInterval`: Interval for new collection monitoring in milliseconds

**Returns:**
- Object containing status message and intervals

##### stop()
```javascript
stop(): void
```
Stops all monitoring processes.

##### getCollection(id, type)
```javascript
getCollection(id: number, type: string): Collection
```
Retrieves a specific collection by ID and type.

**Parameters:**
- `id`: Collection ID
- `type`: Collection type (REGULAR, PARTNER, REGULAR_SNOWBALL)

**Returns:**
- Collection object or undefined

##### updateCollectionStore(collections, type)
```javascript
async updateCollectionStore(collections: Collection[], type: string): Promise<void>
```
Updates the collection store with new data.

**Parameters:**
- `collections`: Array of collection objects
- `type`: Collection type

## Telegram Notification API

### TgNotificationService Class

#### Constructor
```javascript
new TgNotificationService()
```
Creates a new instance of the Telegram notification service.

#### Methods

##### sendMessage(channelId, message, options)
```javascript
async sendMessage(
    channelId: string,
    message: string,
    options?: {
        parse_mode?: string,
        disable_web_page_preview?: boolean
    }
): Promise<TelegramResponse>
```
Sends a message to a Telegram channel.

**Parameters:**
- `channelId`: Telegram channel ID
- `message`: Message text
- `options`: Additional Telegram API options

**Returns:**
- Telegram API response

##### sendPhoto(channelId, imageBuffer, caption, options)
```javascript
async sendPhoto(
    channelId: string,
    imageBuffer: Buffer,
    caption: string,
    options?: {
        parse_mode?: string
    }
): Promise<TelegramResponse>
```
Sends a photo with caption to a Telegram channel.

**Parameters:**
- `channelId`: Telegram channel ID
- `imageBuffer`: Image data buffer
- `caption`: Photo caption
- `options`: Additional Telegram API options

**Returns:**
- Telegram API response

## Chart Service API

### ChartService Class

#### Methods

##### generateRuntimeChart(collection, previousPercentage, chartData)
```javascript
async generateRuntimeChart(
    collection: Collection,
    previousPercentage: number,
    chartData: ChartData
): Promise<Buffer>
```
Generates a chart image for collection data.

**Parameters:**
- `collection`: Collection object
- `previousPercentage`: Previous percentage value
- `chartData`: Chart data object

**Returns:**
- Buffer containing chart image

##### getLatestGGR(collection, chartData)
```javascript
async getLatestGGR(
    collection: Collection,
    chartData: ChartData
): Promise<GGRData>
```
Retrieves the latest GGR data for a collection.

**Parameters:**
- `collection`: Collection object
- `chartData`: Chart data object

**Returns:**
- GGR data object

## Data Types

### Collection
```typescript
interface Collection {
    id: number;
    name: string;
    slug: string;
    percent: number;
    type: number;
    rewardDate: number;
    calcDate: string;
    // ... other properties
}
```

### ChartData
```typescript
interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
        // ... other properties
    }[];
}
```

### GGRData
```typescript
interface GGRData {
    ggr: number;
    predictedGgr: number;
    prevGgr?: number;
}
```

## Error Handling

### Error Types
```typescript
interface APIError extends Error {
    code: string;
    status: number;
    details?: any;
}
```

### Error Codes
- `COLLECTION_NOT_FOUND`: Collection not found
- `INVALID_CHANNEL`: Invalid Telegram channel
- `CHART_GENERATION_FAILED`: Failed to generate chart
- `API_ERROR`: General API error

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Maximum 30 requests per minute for collection updates
- Maximum 20 messages per minute for Telegram notifications
- Maximum 10 chart generations per minute

## Authentication

All API requests require authentication:
- API key in headers: `X-API-Key: your-api-key`
- Telegram bot token for notification endpoints

## Response Format

### Success Response
```json
{
    "success": true,
    "data": {
        // Response data
    },
    "timestamp": "2024-02-20T12:00:00Z"
}
```

### Error Response
```json
{
    "success": false,
    "error": {
        "code": "ERROR_CODE",
        "message": "Error description",
        "details": {}
    },
    "timestamp": "2024-02-20T12:00:00Z"
}
``` 