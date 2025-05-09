const WebSocket = require('ws');
const {wsUrl} = require('./config');
const nftMonitor = require('./monitor/nftMonitor');

class WebSocketHandler {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    connect() {
        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.on('open', () => {
                console.log('WebSocket connection established');
                this.reconnectAttempts = 0;
                this.requestLowestPrices();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);

                    // Handle initial response
                    if (message.rid === 1 && Array.isArray(message.data) && !nftMonitor.isInitialized) {
                        nftMonitor.initializeLowestPrices(message.data);
                        return;
                    }

                    // Handle price updates
                    if (message.event === 'updateLowestPrices') {
                        nftMonitor.handlePriceUpdates(message.data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.reconnect();
            });

            this.ws.on('close', () => {
                console.log('WebSocket connection closed');
                this.reconnect();
            });
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            this.reconnect();
        }
    }

    requestLowestPrices() {
        if (this.ws.readyState === WebSocket.OPEN) {
            const request = {
                rid: 1,
                partnerId: 99,
                page: 1,
                action: "lowestPrices"
            };
            this.ws.send(JSON.stringify(request));
        }
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }
}

module.exports = new WebSocketHandler();