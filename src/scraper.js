const axios = require('axios');
const extractURLs = require('./helpers/extract-urls');
const findContactLinks = require('./helpers/find-contact-links'); 
const extractCorrectEmails = require('./helpers/extract-correct-emails'); 
const { launch } = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { roleNameMap } = require("../data/index");

// STEPS =>
// parse csv (extract all website urls from csv file)
// for each website: fetch page, find staff/team/contact pages (< this can be extended! (looking for patterns...))
// for each link: fetch page, extract all emails from page
//    for each email: find context infront of email, see if there are any matches in the context
//    if there's a match > add to result
// map result into a row
// add row with emails to csv file (save in csv)
// (when all rows in the file have been written the script should end)


// tests when running script:
// gets correct links, are there any more?
// gets correct emails
// etc.

// NOT GONE OVER >>>>
// the raw html sometimes didnt have what I could see on the page
async function fetchDynamicHTML(url, browser) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' }); // wait for all JS to finish

  const html = await page.content();
    await page.close(); // Close the tab, not the browser
  return html;
}

// scrape a single school
async function scrapeSchool({ name, url }, browser) { 

    // make sure: result is being correctly filled in, & e.g. we arnt overriding emails found ect.
    let result = {
        dsl: [],
        pshe: [],
        pastoral: [],
        mental_health: [],
        safeguarding_officer: [],
        deputy_head: [],
        headteacher: [],
        head_of_year: [],
        head_of_school: [],
    }

    try {
        // fix url
        const invalidURL = url.includes("http") && !url.includes("www.");
        let fixedURL;

        if (invalidURL) { 
            /* if we have http & no www. => add www. */
            const startIndex = url.lastIndexOf("://") + "://".length;
            fixedURL = `http://www.${url.slice(startIndex)}`
            console.log("invalidURL! -> fixedURL", fixedURL);
        }

        const validURL = url.includes("http") ? fixedURL || url : !url.includes("www.") ? `http://www.${url}` : `http://${url}` /* if the url contains neither http(s) or www. */
        
        // find relevant links
        const { data } = await axios.get(validURL, { timeout: 20000 });
        const contactLinks = await findContactLinks(validURL, data);  
        console.log("contactLinks", contactLinks); 
         
        // .filter(contactLink => contactLink.includes()) //  \.pdf$/i // add homepage url?
        // improvement - filter out pdfs before u loop... // or convert pdf file to text...

        // call extractEmails on each page
        for (const link of contactLinks) {
            let data;
            // let dynamicHTML;
            try {
                const page = await axios.get(link, { timeout: 20000 });
                data = page.data;
                // dynamicHTML = await fetchDynamicHTML(link, browser); // ONLY USE IF ITS EMPTY FOR A SCHOOL! >> ON A SECOND ITERATION?
            } catch (err) {
                console.error(`COULDNT FETCH FROM LINK, url: ${link} - ERROR: ${err.message}`);
                continue;
            }

            result = await extractCorrectEmails(link, data, result);
        }
    } catch (error) {
        console.warn(`Ran into error whilst trying to scrape school: ${name}, error:`, error?.message);
    }
    
    console.log("final result:", result);
    return result;
}

const csvPath = 'scraped_schools.csv';

const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
        { id: 'la', title: 'LA (name)' },
        { id: 'schoolName', title: 'School Name' },
        { id: 'street', title: 'Street' },
        { id: 'postcode', title: 'Postcode' },
        { id: 'website', title: 'Website' },
        { id: 'telephone', title: 'TelephoneNum' },
        { id: 'headTitle', title: 'HeadTitle (name)' },
        { id: 'headFirstName', title: 'HeadFirstName' },
        { id: 'headLastName', title: 'HeadLastName' },
        { id: 'gor', title: 'GOR (name)' },
        { id: 'district', title: 'DistrictAdministrative (name)' },
        { id: 'dsl', title: roleNameMap.dsl },
        { id: 'pshe', title: roleNameMap.pshe },
        { id: 'pastoral', title: roleNameMap.pastoral },
        { id: 'mental_health', title: roleNameMap.mental_health },
        { id: 'safeguarding_officer', title: roleNameMap.safeguarding_officer },
        { id: 'deputy_head', title: roleNameMap.deputy_head },
        { id: 'headteacher', title: roleNameMap.headteacher },
        { id: 'head_of_year', title: roleNameMap.head_of_year },
        { id: 'head_of_school', title: roleNameMap.head_of_school},
    ]
});


let blankResult = {
    dsl: [],
    pshe: [],
    pastoral: [],
    mental_health: [],
    safeguarding_officer: [],
    deputy_head: [],
    headteacher: [],
    head_of_year: [],
    head_of_school: [],
};

// looked through except p-limit
(async () => {
    const [schools, existingRows] = await extractURLs();
    let emailsFound = 0;

    let browser;
    // const browser = await launch({ headless: true });


    // testing:
    // console.log("school name:", schools[18].name, "school url:", schools[18].url);
    // const testSchools = schools.slice(0,20);

    /* p-limit logic */
    const pLimit = await import('p-limit').then(mod => mod.default);
    const CHUNK_SIZE = 300;
    const limit = pLimit(5);

    // Helper to chunk array
    const chunkArray = (array, size) =>
        Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
            array.slice(i * size, i * size + size)
        );

    const chunks = chunkArray(schools, CHUNK_SIZE); // can we increase the chunks so its faster?
    /* */

    // const chunks = [schools.slice(0,2)]

    // understanding...
    // Math.ceil(array.length / size) --> most likely around 10 => chunks length is then 10
    // slices example -> (0, 300) (300, 600) (600, 900)
    // chunks -> [[], [], []]
    // chunk: has 300 schools...

    for (const chunk of chunks) {
        console.warn(`Processing batch of ${chunk.length} schools...`);

        const promises = chunk.map(school =>
            limit(async () => {
                let result = blankResult;

                try {
                    result = await scrapeSchool(school, browser);
                } catch (error) {
                    console.warn(`Failed to scrape school ${school.name}: ${error?.message}`);
                }

                for (const arr of Object.values(result)) {
                    emailsFound += arr.length;
                }

                const currentSchool = existingRows.find(row => row['School Name'] === school.name);

                const { 
                    dsl, 
                    pshe, 
                    pastoral, 
                    mental_health, 
                    safeguarding_officer, 
                    deputy_head, 
                    headteacher, 
                    head_of_year, 
                    head_of_school 
                } = result; 

                const row = {
                    la: currentSchool['LA (name)'],
                    schoolName: school.name,
                    street: currentSchool.Street,
                    postcode: currentSchool.Postcode,
                    website: currentSchool.Website,
                    telephone: currentSchool.TelephoneNum,
                    headTitle: currentSchool['HeadTitle (name)'],
                    headFirstName: currentSchool.HeadFirstName,
                    headLastName: currentSchool.HeadLastName,
                    gor: currentSchool['GOR (name)'],
                    district: currentSchool['DistrictAdministrative (name)'],
                    // found emails:
                    dsl: dsl.join(', '),
                    pshe: pshe.join(', '),
                    pastoral: pastoral.join(', '),
                    mental_health: mental_health.join(', '),
                    safeguarding_officer: safeguarding_officer.join(', '),
                    deputy_head: deputy_head.join(', '),
                    headteacher: headteacher.join(', '),
                    head_of_year: head_of_year.join(', '),
                    head_of_school: head_of_school.join(', '),
                };

                // write 1 row
                await csvWriter.writeRecords([row]);
            })
        );

        await Promise.all(promises); // do we want it in order... ehh
    }

    // await browser.close();
    console.log(`CSV writing complete! -- ${emailsFound} emails found`);
})();



// extraaaa: navigate all links on a site & find all emails & dump export them...