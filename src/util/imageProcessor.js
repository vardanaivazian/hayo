const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { headers } = require('../config'); // Import headers from config

class ImageProcessor {
    constructor() {
        this.cachePath = path.join(process.cwd(), 'cache', 'thumbnails');
        this.processedCollections = new Set();
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.cachePath, { recursive: true });
            console.log('Cache directory created at:', this.cachePath);
        } catch (error) {
            console.error('Error creating cache directory:', error.message);
        }
    }

    async processCollectionThumbnail(collection) {
        const collectionId = collection.id;

        if (this.processedCollections.has(collectionId)) {
            return this.getCachedPath(collectionId);
        }

        try {
            const thumbnailPath = this.getCachedPath(collectionId);

            try {
                await fs.access(thumbnailPath);
                this.processedCollections.add(collectionId);
                return thumbnailPath;
            } catch {
                // File doesn't exist, proceed with download
            }

            // Download image with headers
            const response = await axios.get(collection.thumbnail, {
                responseType: 'arraybuffer',
                headers: {
                    ...headers,
                    'Referer': 'https://sss.ortak1.me/',
                }
            });

            // Resize to rectangle shape while maintaining aspect ratio
            await sharp(response.data)
                .resize({
                    width: 260,    // wider
                    height: 100,   // shorter
                    fit: 'inside', // keeps aspect ratio, won't exceed these dimensions
                    withoutEnlargement: true // prevent small images from being stretched
                })
                .toFile(thumbnailPath);

            this.processedCollections.add(collectionId);
            console.log(`Successfully processed thumbnail for collection ${collectionId}`);
            return thumbnailPath;

        } catch (error) {
            console.error(`Error processing thumbnail for collection ${collectionId}:`, error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
            }
            return null;
        }
    }

    getCachedPath(collectionId) {
        return path.join(this.cachePath, `collection_${collectionId}.png`);
    }

    async clearCache() {
        try {
            const files = await fs.readdir(this.cachePath);
            console.log(`Clearing ${files.length} cached thumbnails...`);

            for (const file of files) {
                const filePath = path.join(this.cachePath, file);
                await fs.unlink(filePath);
            }

            this.processedCollections.clear();
            console.log('Cache cleared successfully');
        } catch (error) {
            console.error('Error clearing cache:', error.message);
        }
    }
}

module.exports = new ImageProcessor();