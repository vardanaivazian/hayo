const axios = require('axios');
const {ChartJSNodeCanvas} = require('chartjs-node-canvas');
const cron = require('node-cron');
const {isSnowBall} = require('../util/common');

class ChartService {
    constructor() {
        this.baseUrl = 'https://sss.ortak1.me';
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: 800,
            height: 400,
            backgroundColour: 'white'
        });
        this.cachedData = null;
        const redisConfig = process.env.NODE_ENV === 'production'
            ? { tls: { rejectUnauthorized: false } }
            : {};

        //redis disabled
        this.redis = null;//new Redis(process.env.REDIS_URL, redisConfig);
        this.initializeScheduler();
    }

    async loadStoredData() {
        if (this.cachedData !== null) {
            return this.cachedData;
        }

        try {
            const data = await this.redis.hgetall('chart_data');
            this.cachedData = Object.entries(data).reduce((acc, [key, value]) => {
                acc[key] = JSON.parse(value);
                return acc;
            }, {});
            return this.cachedData;
        } catch (error) {
            console.error('Error loading stored data from Redis:', error);
            this.cachedData = {};
            return this.cachedData;
        }
    }

    async saveData(slug, data) {
        try {
            if (!this.cachedData) {
                this.cachedData = {};
            }
            this.cachedData[slug] = data;

            // Save to Redis
            await this.redis.hset('chart_data', slug, JSON.stringify(data));
            console.log(`Data saved to Redis for slug: ${slug}`);
        } catch (error) {
            console.error('Error saving data to Redis:', error);
            throw error;
        }
    }

    initializeScheduler() {
        // Schedule task to run at 01:00 Yerevan time (UTC+4)
        // In cron: minute hour day month day-of-week
        cron.schedule('0 1 * * *', async () => {
            console.log('Starting scheduled Redis cleanup at:', new Date().toISOString());
            try {
                await this.cleanOldData(20);
                console.log('Scheduled Redis cleanup completed successfully');
            } catch (error) {
                console.error('Error in scheduled Redis cleanup:', error);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Yerevan"
        });
    }

    async cleanOldData(daysToKeep = 20) {
        try {
            const data = await this.redis.hgetall('chart_data');
            const currentDate = new Date();
            let cleanedData = {};
            let hasUpdates = false;

            for (const [key, value] of Object.entries(data)) {
                const entries = JSON.parse(value);

                // Filter entries to keep only recent data
                const filteredEntries = entries.filter(entry => {
                    const [month, day] = entry.label.split(' - ');
                    const dateStr = `${month} ${day}, ${currentDate.getFullYear()}`;
                    const entryDate = new Date(dateStr);

                    // Handle year boundary
                    if (currentDate.getMonth() === 0 && month === 'Dec') {
                        entryDate.setFullYear(currentDate.getFullYear() - 1);
                    }

                    const diffTime = currentDate - entryDate;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    return diffDays <= daysToKeep;
                });

                if (filteredEntries.length !== entries.length) {
                    hasUpdates = true;
                }

                if (filteredEntries.length > 0) {
                    cleanedData[key] = filteredEntries;
                }
            }

            if (hasUpdates) {
                for (const [key, entries] of Object.entries(cleanedData)) {
                    await this.redis.hset('chart_data', key, JSON.stringify(entries));
                }
                console.log(`Redis cleanup completed. Data older than ${daysToKeep} days removed.`);
            } else {
                console.log('No old data to clean');
            }

            return cleanedData;
        } catch (error) {
            console.error('Error cleaning old Redis data:', error);
            throw error;
        }
    }

    async fetchChartData(collection, period) {
        try {
            const slug = collection.slug;
            const collectionId = collection.id;
            const payload = {
                slug,
                partnerId: 99,
                period: period,
                collectionId: collectionId
            };

            if (isSnowBall(collection)) {
                payload.dynamic = 1;
                payload.slug = slug;
            } else {
                payload.slug = slug + "-1";
            }
            const response = await axios.post(
                `${this.baseUrl}/panel/collections/chart`,
                payload,
                {
                    headers: {
                        'accept': '*/*',
                        'accept-language': 'en-US,en;q=0.9',
                        'content-type': 'text/plain;charset=UTF-8',
                        'origin': 'https://sss.ortak1.me',
                        'referer': `https://sss.ortak1.me/en/nfts/${slug}`,
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                    }
                }
            );

            if (response.data.code === 0 && response.data.data) {
                return response.data.data;
            }
            console.error('Invalid response from chart API');
            return null;
        } catch (error) {
            console.error('Error fetching chart data:', error);
            return null;
        }
    }

    async getLatestGGR(collection, data) {
        if (collection.type !== 8) {
            return null;
        }
        try {
            if (!data || data.length < 2) {
                console.log(`Insufficient GGR data for collection ${collection.name}`);
                return null;
            }

            const latest = data[data.length - 1];
            const prevLatest = data[data.length - 2];

            if (!latest?.ggr || !prevLatest?.ggr) {
                console.log(`Missing GGR values for collection ${collection.name}`);
                return null;
            }

            return {
                ggr: latest.ggr,
                prevGgr: prevLatest.ggr,
                predictedGgr: latest.predictedGgr,
                timestamp: latest.label
            };
        } catch (error) {
            console.error('Error fetching latest GGR:', error);
            return null; // Return null instead of throwing
        }
    }

    async updateDailyData(collection) {
        try {
            const apiData = await this.fetchChartData(collection, "day");
            const slug = collection.slug;
            if (!this.cachedData) {
                await this.loadStoredData();
            }

            // Get today's date and format it
            const today = new Date();
            const todayLabel = this.formatDateLabel(today);

            // Create a map to store the latest point for each unique date
            const latestPoints = new Map();

            // Process existing data first
            const existingData = this.cachedData[slug] || [];
            existingData.forEach(point => {
                if (point.label !== todayLabel) { // Keep historical data as is
                    latestPoints.set(point.label, point);
                }
            });

            // Process new data, overwriting any existing points for today
            apiData.forEach(item => {
                if (item.label === todayLabel) {
                    latestPoints.set(item.label, {
                        label: item.label,
                        percent: item.percent,
                        ...(item.ggr && { ggr: item.ggr }),
                        ...(item.predictedGgr && { predictedGgr: item.predictedGgr })
                    });
                }
            });

            // Convert map back to sorted array
            this.cachedData[slug] = Array.from(latestPoints.values())
                .sort((a, b) => {
                    const [monthA, dayA] = a.label.split(' - ');
                    const [monthB, dayB] = b.label.split(' - ');
                    const dateA = new Date(new Date().getFullYear(), this.getMonthIndex(monthA), parseInt(dayA));
                    const dateB = new Date(new Date().getFullYear(), this.getMonthIndex(monthB), parseInt(dayB));
                    return dateA - dateB;
                });

            await this.saveData(slug, this.cachedData[slug]);
            return this.cachedData[slug];
        } catch (error) {
            console.error('Error updating daily data:', error);
            throw error;
        }
    }

    getMonthIndex(shortMonth) {
        const months = {'Jan':0, 'Feb':1, 'Mar':2, 'Apr':3, 'May':4, 'Jun':5,
            'Jul':6, 'Aug':7, 'Sep':8, 'Oct':9, 'Nov':10, 'Dec':11};
        return months[shortMonth];
    }

    formatDateLabel(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} - ${date.getDate()}`;
    }

    async generateRuntimeChart(collection, previousPercentage, chartData) {
        try {
            let displayData;
            if (!chartData || chartData.length === 0) {
                displayData = this.getDefaultDisplayData(previousPercentage, collection);
            } else {
                // Only add today's data for non-snowball collections
                if (!isSnowBall(collection)) {
                    // Check if the latest data point is from today
                    this.adjustLastPercentageInChartData(chartData, collection);
                }

                // Process the chart data based on collection type
                if (!isSnowBall(collection)) {
                    // For non-snowball collections, filter by percent change first
                    const filteredByPercentChange = this.filterByPercentChange(chartData);
                    displayData = this.processChartDataPoints(filteredByPercentChange);
                } else {
                    // For snowball collections, use original data without filtering
                    displayData = this.processChartDataPoints(chartData);
                }
            }

            // Color scheme based on collection type
            const colorScheme = this.getColorScheme(collection);

            const configuration = this.getConfiguration(displayData, collection, colorScheme);

            const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
            console.log('Runtime chart generated successfully');

            if (!imageBuffer) {
                console.error('Error generating runtime chart:');
                return null;
            }
            return imageBuffer;

        } catch (error) {
            console.error('Error generating runtime chart:', error);
            return null;
        }
    }

// Helper method to calculate monthly reward for a given percent
    calculateMonthlyReward(percent, originalPrice) {
        if (!originalPrice || percent === null || percent === undefined) {
            return null;
        }

        return parseFloat(((originalPrice * percent / 100) / 12).toFixed(3));
    }

    adjustLastPercentageInChartData(chartData, collection) {
        const today = new Date();
        const todayLabel = `${today.toLocaleString('en-US', {month: 'short'}).slice(0, 3)} - ${String(today.getDate()).padStart(2, '0')}`;
        const latestEntry = chartData[chartData.length - 1];
        const todayExists = latestEntry.label === todayLabel;

        // If today's entry doesn't exist, add it
        if (!todayExists) {
            console.log(`Adding today's data point (${todayLabel}) with percent: ${collection.percent}`);
            chartData.push({
                label: todayLabel,
                ggr: 0,
                marketPrice: latestEntry.marketPrice, // Use the latest available market price
                percent: collection.percent,
                predictedGgr: 0
            });
        } else if (latestEntry.percent !== collection.percent) {
            // If the latest point is today but percent doesn't match collection.percent, update it
            console.log(`Updating latest data point's percent from ${latestEntry.percent} to ${collection.percent}`);
            latestEntry.percent = collection.percent;
        }
    }

    getDefaultDisplayData(previousPercentage, collection) {
        console.log('No monthly data available, using current and previous percentages');
        const today = new Date();
        const previousTime = new Date(today.getTime() - (60 * 60 * 1000));

        const defaultData = [
            {
                label: previousTime.toLocaleDateString('en-US'),
                percent: previousPercentage,
                ggr: null,
                predictedGgr: null
            },
            {
                label: today.toLocaleDateString('en-US'),
                percent: collection.percent,
                ggr: null,
                predictedGgr: null
            }
        ];

        return defaultData;
    }

    filterByPercentChange(data) {
        if (!data || data.length === 0) return [];

        const result = [data[0]]; // Always include the first point

        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const lastAdded = result[result.length - 1];

            // Only add this point if the percent is different from the last added point
            if (current.percent !== lastAdded.percent) {
                result.push(current);
            }
        }

        return result;
    }

    processChartDataPoints(data) {
        if (!data || data.length === 0) return [];

        // Keep the most recent 2 points separate
        const recentPoints = data.slice(-2);
        const olderPoints = data.slice(0, -2);

        // Group older points by day and keep the last point of each day
        const dailyPoints = olderPoints.reduce((acc, point) => {
            const date = new Date(point.label).toLocaleDateString('en-US');
            acc[date] = point;
            return acc;
        }, {});

        // Sort points chronologically
        const sortedDailyPoints = Object.values(dailyPoints).sort((a, b) =>
            new Date(a.label) - new Date(b.label)
        );

        // Combine sorted daily points with recent points
        return [...sortedDailyPoints, ...recentPoints];
    }

    getConfiguration(displayData, collection, colorScheme) {
        // For snowball collections, keep the original configuration
        if (isSnowBall(collection)) {
            return this.getSnowballConfiguration(displayData, collection, colorScheme);
        } else {
            // For non-snowball collections, add the reward dataset
            return this.getNonSnowballConfiguration(displayData, collection, colorScheme);
        }
    }

    getSnowballConfiguration(displayData, collection, colorScheme) {
        return {
            type: 'line',
            data: {
                labels: displayData.map(d => d.label),
                datasets: [
                    {
                        label: 'Percent %',
                        data: displayData.map(d => d.percent),
                        borderColor: colorScheme.percentColor,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: colorScheme.pointRadius,
                        yAxisID: 'y',
                    },
                    {
                        label: 'GGR',
                        data: displayData.map(d => d.ggr),
                        borderColor: colorScheme.ggrColor,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: colorScheme.pointRadius,
                        yAxisID: 'y1',
                    },
                    {
                        label: 'Predicted GGR',
                        data: displayData.map(d => d.predictedGgr),
                        borderColor: colorScheme.predictedColor,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: colorScheme.pointRadius,
                        yAxisID: 'y1',
                    }
                ]
            },
            options: this.getChartOptions(collection, colorScheme)
        };
    }

    getNonSnowballConfiguration(displayData, collection, colorScheme) {
        return {
            type: 'line',
            data: {
                labels: displayData.map(d => d.label),
                datasets: [
                    {
                        label: 'Percent and Monthly Reward',
                        data: displayData.map(d => d.percent),
                        borderColor: colorScheme.percentColor,
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: colorScheme.pointRadius,
                        yAxisID: 'y'
                    }
                ]
            },
            options: this.getNonSnowballChartOptions(collection, colorScheme, displayData)
        };
    }

    getChartOptions(collection, colorScheme) {
        return {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${collection.name}`,
                    color: colorScheme.titleColor,
                    font: {
                        size: 36,
                        weight: 'bold'
                    },
                    padding: {
                        top: 20,
                        bottom: 20
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            if (value === null) return `${context.dataset.label}: No data`;
                            return `${context.dataset.label}: ${value.toFixed(2)}${context.dataset.label.includes('%') ? '%' : ''}`;
                        },
                        title: function (context) {
                            const label = context[0].label;
                            const date = new Date(label);
                            return date.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: colorScheme.gridColor
                    },
                    ticks: {
                        font: {size: 12},
                        color: '#4b5563',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Percent %'
                    },
                    grid: {
                        color: colorScheme.gridColor
                    },
                    ticks: {
                        callback: (value) => `${value}%`,
                        font: {size: 12},
                        color: '#4b5563'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'GGR Values'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        font: {size: 12},
                        color: '#4b5563'
                    }
                }
            },
            layout: {
                padding: {
                    left: 15,
                    right: 15
                }
            },
            backgroundColor: colorScheme.backgroundColor
        };
    }

    getNonSnowballChartOptions(collection, colorScheme, displayData) {
        // Calculate min and max values for reward scale based on percent values
        const percentValues = displayData.map(d => d.percent);
        const minPercent = Math.min(...percentValues);
        const maxPercent = Math.max(...percentValues);

        // Calculate corresponding reward values for min and max percents
        const minReward = this.calculateMonthlyReward(minPercent, collection.originalPrice);
        const maxReward = this.calculateMonthlyReward(maxPercent, collection.originalPrice);

        return {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${collection.name}`,
                    color: colorScheme.titleColor,
                    font: {
                        size: 36,
                        weight: 'bold'
                    },
                    padding: {
                        top: 20,
                        bottom: 20
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            if (value === null) return `${context.dataset.label}: No data`;

                            // Add reward value to tooltip even though it's not a separate line
                            if (context.dataset.label.includes('%')) {
                                const idx = context.dataIndex;
                                const reward = displayData[idx]?.monthlyReward;
                                return [
                                    `${context.dataset.label}: ${value.toFixed(2)}%`,
                                    `Monthly Reward: ${reward?.toFixed(3) || 'N/A'}`
                                ];
                            }
                            return `${context.dataset.label}: ${value.toFixed(2)}`;
                        },
                        title: function (context) {
                            const label = context[0].label;
                            const date = new Date(label);
                            return date.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: colorScheme.gridColor
                    },
                    ticks: {
                        font: {size: 12},
                        color: '#4b5563',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Percent %'
                    },
                    grid: {
                        color: colorScheme.gridColor
                    },
                    ticks: {
                        callback: (value) => `${value}%`,
                        font: {size: 12},
                        color: '#4b5563'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Monthly Reward (FTN)'
                    },
                    min: Math.max(0, minReward * 0.9), // Set reasonable min value
                    max: maxReward * 1.1, // Give some headroom
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: (value) => `${value.toFixed(2)}`,
                        font: {size: 12},
                        color: colorScheme.rewardColor
                    }
                }
            },
            layout: {
                padding: {
                    left: 15,
                    right: 15
                }
            },
            backgroundColor: colorScheme.backgroundColor
        };
    }

    getColorScheme(collection) {
        return (isSnowBall(collection))
            ? {
                percentColor: '#10b981',          // Green
                ggrColor: '#ef4444',             // Red
                predictedColor: '#eab308',        // Yellow/Gold
                backgroundColor: '#ffffff',       // White Background
                gridColor: '#e5e7eb',            // Light Gray Grid Lines
                titleColor: '#1e293b',           // Slate Gray for Title
                pointRadius: 2
            }
            : {
                percentColor: '#10b981',          // Green
                rewardColor: '#6366f1',          // Indigo for reward line
                backgroundColor: '#f9fafb',       // Light Gray Background
                gridColor: '#e5e7eb',            // Light Gray Grid Lines
                titleColor: '#1e3a8a',           // Darker Blue for Title
                pointRadius: 2
            };
    }
}

module.exports = new ChartService();