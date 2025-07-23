const fs = require('fs');
const csv = require("csv-parser");

// extract school urls from csv file
async function extractURLs() {
    return new Promise((resolve, reject) => {
        const schools = [];
        const existingRows = []

        fs.createReadStream("data/list-of-schools.csv")
            .pipe(csv())
            .on('data', (row) => {
                schools.push({ name: row['School Name'] || '', url: row.Website || '' });
                existingRows.push(row);
            })
            .on('end', () => resolve([schools, existingRows])) // improvement: just return existingRows(w/ a different name) and map to make { name, url } ...
            .on('error', reject);
    });
}

module.exports = extractURLs