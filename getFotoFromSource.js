// unsplash_fetch_images.js
const axios = require('axios');

const UNSPLASH_ACCESS_KEY = 'q286XqIk2rHkcpDl6OMlfTn1aBb5bTqCruXsPoW3804';

async function fetchImagesForKeywords(keywords, count = 5) {
    const keywordImages = {};

    for (const keyword of keywords) {
        try {
            console.log(`Fetching images for keyword: "${keyword}"...`);

            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=${count}&client_id=${UNSPLASH_ACCESS_KEY}`;

            const response = await axios.get(url);
            const photos = response.data.results;

            if (photos.length === 0) {
                console.log(`No images found for keyword: "${keyword}".`);
                keywordImages[keyword] = [];
                continue;
            }

            keywordImages[keyword] = photos.map(photo => trimUnsplashUrl(photo.urls.regular));
            console.log(`Found ${photos.length} images for keyword: "${keyword}".`);

        } catch (error) {
            console.error(`Error fetching images for keyword "${keyword}":`, error.message);
            keywordImages[keyword] = [];
        }
    }

    return keywordImages;
}

function trimUnsplashUrl(url) {
    return url.split('?')[0];
}

function appendImageDimensions(baseUrl, width, height) {
    return `${baseUrl}?w=${width}&h=${height}&auto=format&fit=crop`;
}

// Example usage:
(async () => {
    const keywords = ['device', 'ocean', 'laptop', 'city', 'sunset']; // Replace with your keywords from GPT-4
    const images = await fetchImagesForKeywords(keywords);

    // Selecting one image per category
    const landscapeImages = appendImageDimensions(images['device'][0], 1200, 628);
    const squareImages = appendImageDimensions(images['laptop'][0], 1200, 1200);
    const logoImages = appendImageDimensions(images['city'][0], 1200, 1200);

    console.log({ landscapeImages, squareImages, logoImages });
})();
