// test_unsplash.js
const axios = require('axios');

async function getFotoLink_By_Topic(keyword, count = 1, download = false) {
    try {
        // Înlocuiește cu cheia ta reală de la Unsplash
        const UNSPLASH_ACCESS_KEY = 'q286XqIk2rHkcpDl6OMlfTn1aBb5bTqCruXsPoW3804';
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=${count}&client_id=${UNSPLASH_ACCESS_KEY}`;

        console.log(`Se caută poze pentru: "${keyword}"...`);
        const response = await axios.get(url);
        const photos = response.data.results;

        if (photos.length === 0) {
            console.log('Nu s-au găsit poze pentru acest cuvânt cheie.');
            return [];
        }

        const photoUrls = photos.map(photo => photo.urls.regular);
        console.log(`S-au găsit ${photoUrls.length} poze:`);
        photoUrls.forEach((url, index) => console.log(`${index + 1}. ${url}`));

        return photoUrls;
    } catch (error) {
        console.error('Eroare:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Testează funcția
(async () => {
    console.log('Încep testul...');

    try {
        // Test 1: Caută o singură poză
        console.log('\nTest 1: Căutare "mountain" (1 poză)');
        await getFotoLink_By_Topic('iphone', 3);

        // Test 2: Căutare cu răspuns multiplu
        console.log('\nTest 2: Căutare "ocean" (3 poze)');
        await getFotoLink_By_Topic('latop', 3);

        // Test 3: Căutare fără rezultate
        console.log('\nTest 3: Căutare "sunset" (ar trebui să returneze empty)');
        await getFotoLink_By_Topic('asdfghjkl');

        console.log('\nToate testele au fost finalizate!');
    } catch (err) {
        console.error('Testul a eșuat:', err);
    }
})();