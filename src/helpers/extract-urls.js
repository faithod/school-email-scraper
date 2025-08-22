const fs = require('fs');
const csv = require("csv-parser");

/* 
*  main use: extract school urls from given csv file - for use in the scraper.js file
*/
async function extractURLs(csvFile = "data/list-of-schools.csv") { // csvFile can also be: empty_schools.csv if you want to debug empty schools etc.
    return new Promise((resolve, reject) => {
        const schools = [];
        const existingRows = [];

        const debuggingEmptySchools = csvFile.includes("empty_schools");

        if (debuggingEmptySchools) {
            // so that I can use existingRows
            fs.createReadStream("data/list-of-schools.csv")
                .pipe(csv())
                .on('data', (row) => {
                    existingRows.push({ ...row, Website: row.Website || ''});
                })
                .on('end', () => {}) 
                .on('error', () => {});
        }


        fs.createReadStream(csvFile) 
            .pipe(csv())
            .on('data', (row) => {
                schools.push({ name: row['School Name'] || '', url: row.Website || '' });
                if (!debuggingEmptySchools) existingRows.push({ ...row, Website: row.Website || ''});
            })
            .on('end', () => resolve([schools, existingRows])) // improvement: just return existingRows(w/ a different name) and map to make { name, url } ...
            .on('error', reject);
    });
}

module.exports = extractURLs