const fs = require('fs');
const csv = require('csv-parser');
const { roleNameMap } = require("../../../data/index") 

// these don't seem to be a problem*
const ignoreForNow = [
        'safeguarding@oasisuk.org',
        'admin@basildonacademies.org.uk',
        'admin@coopacademies.co.uk',
        'mmitchley@wigstonmat.org',
        'clh@knutsfordacademy.org.uk',
        'ajo@knutsfordacademy.org.uk - (Deputy)',
        'safeguarding@knutsfordacademy.org.uk',
        'kky@knutsfordacademy.org.uk',
        'cjorsling-thomas@trhat.org',
        'erin.docherty@oasisuk.org - (Mental Health Lead)',
        'sjohnson@whmat.academy',
        'sridley@tmet.uk',
        'admin@utcsheffield.org.uk',
        'georgia.strong@reachacademy.org.uk',
        'skelly@sdcc-smhc.net',
        'ehermonwright@sdcc-smhc.net - (Deputy)',
        'moakes@sdcc-smhc.net',
        'dnicholls@twhf.org.uk',
        'enquiries@swale.at'
];

// sanity check this script bc....idk

/*
 * find dupes & also output the amount of emails found
 */ 
async function findDupes(csvPath) {
    console.log(`finding dupes in file: ${csvPath}`);
    const urls = [];
    const dupeUrls = new Set();

    const allEmails = [];
    const dupeEmails = new Set();

    return new Promise((resolve, reject) => {
        if (!fs.existsSync(csvPath)) return resolve([dupeUrls, dupeEmails]);

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.Website) {
                    const website = row.Website?.toLowerCase();
                    if (urls.includes(website)) dupeUrls.add(website);

                    urls.push(website);
                }

                const allEmailsInRow = [];

                for (const key in roleNameMap) {
                    const header = roleNameMap[key];

                    const value = row[header] || "";
                    if (value) allEmailsInRow.push(...value.split(", "))
                }

                const allRowEmailsLowercase = allEmailsInRow.map(e => e.toLowerCase());
                const dupeInRow = allRowEmailsLowercase.filter(e => allRowEmailsLowercase.indexOf(e) !== allRowEmailsLowercase.lastIndexOf(e)); // find dupes in the same row
            
                for (const email of dupeInRow) {
                    dupeEmails.add(email);
                }

                if (allEmails.some(email => allRowEmailsLowercase.includes(email.toLowerCase()))) {
                    const dupes = allEmails.filter(email => allRowEmailsLowercase.includes(email.toLowerCase()))
                    for (const email of dupes) {
                        dupeEmails.add(email);
                    }
                }

                allEmails.push(...allEmailsInRow);

            })
            .on('end', () => {
                const tempDupes = [...dupeEmails].filter(email => !ignoreForNow.includes(email));

                if (dupeUrls.size) console.log(`✅ found ${dupeUrls.size} dupe urls: `, dupeUrls);
                if (tempDupes.length) console.log(`✅ found ${tempDupes.length} dupe emails: `, tempDupes);

                // resolve([dupeUrls, tempDupes]);

                // emails found:
                console.log(`❤️❤️ ${allEmails.length} emails found ‼️ ❤️❤️`);
                console.log(`non dupe emails ${[...new Set(allEmails)].length}`);
            })
            .on('error', reject);
    });
}

findDupes("final_with_filled_in.csv"); // final.csv