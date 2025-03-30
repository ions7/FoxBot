const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function getFotoLink_By_Topic(keyword, count = 1, download = false) {
    const startTime = Date.now(); // Start measuring execution time

    try {
        // Configurarea accesului la API-ul Unsplash
        const UNSPLASH_ACCESS_KEY = 'q286XqIk2rHkcpDl6OMlfTn1aBb5bTqCruXsPoW3804'; // Înlocuiește cu cheia ta
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=${count}&client_id=${UNSPLASH_ACCESS_KEY}`;

        // Facem cererea către Unsplash
        const response = await axios.get(url);
        const photos = response.data.results;

        if (photos.length === 0) {
            throw new Error('Nu s-au găsit poze pentru acest cuvânt cheie.');
        }

        // Extragem URL-urile imaginilor
        const photoUrls = photos.map(photo => photo.urls.regular);

        // Dacă dorim să descărcăm imaginile
        if (download) {
            const downloadDir = path.join(__dirname, 'downloads');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            for (let i = 0; i < photoUrls.length; i++) {
                const photoResponse = await axios.get(photoUrls[i], { responseType: 'stream' });
                const filePath = path.join(downloadDir, `${keyword}_${i}.jpg`);
                const writer = fs.createWriteStream(filePath);
                photoResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            }
        }

        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000; // Convert to seconds
        console.log(`Funcția a rulat în ${executionTime} secunde`);

        return photoUrls;
    } catch (error) {
        const endTime = Date.now();
        const executionTime = (endTime - startTime) / 1000;
        console.error(`Eroare la preluarea pozelor după ${executionTime} secunde:`, error.message);
        throw error;
    }
}

// Exemplu de utilizare:
// getFotoLink_By_Topic('nature', 3, true)
//   .then(urls => console.log('URL-uri poze:', urls))
//   .catch(err => console.error(err));

// Pentru a folosi în condiția ta:

    const startTime = Date.now();

    // Exemplu: preia 2 poze pentru cuvântul cheie "ocean" și le descarcă
    getFotoLink_By_Topic('devices', 6, true)
        .then(urls => {
            const endTime = Date.now();
            const totalTime = (endTime - startTime) / 1000;
            console.log(`Operațiunea completă a durat ${totalTime} secunde`);
            console.log('Poze găsite:', urls);
            // Poți face ceva cu aceste URL-uri aici
        })
        .catch(err => {
            const endTime = Date.now();
            const totalTime = (endTime - startTime) / 1000;
            console.error(`Operațiunea a eșuat după ${totalTime} secunde:`, err);
        });
