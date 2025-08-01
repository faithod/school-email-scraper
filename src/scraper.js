const axios = require('axios');
const extractURLs = require('./helpers/extract-urls');
const findContactLinks = require('./helpers/find-contact-links'); 
const { extractCorrectEmails } = require('./helpers/extract-correct-emails'); 
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { roleNameMap } = require("../data/index");
const pdf = require('pdf-parse');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer-extra => a powerful extension to the Puppeteer framework
//  it introduces the plugin puppeteer-extra-plugin-stealth (which enhances stealth and anonymity during web scraping) (applies various evasion techniques to make it harder for websites to detect the requests as coming from a bot)
//  & also other plugins designed to address common challenges encountered during scraping tasks (like for battling captcha: puppeteer-extra-plugin-recaptcha)

// use the Stealth plugin
puppeteer.use(StealthPlugin());

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

// the raw html sometimes didnt have what I could see on the page
async function fetchDynamicHTML(url, page) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 }); // wait for all JS to finish

  return await page.content();
//   await page.close(); // Close the tab, not the browser
}

// networkidle2 =  waits until there are no more than 2 network connections for at least 500 milliseconds 
// (so the page has mostly finished loading)

// scrape a single school
async function scrapeSchool({ name, url }, page) { 
    const { default: chalk } = await import('chalk'); // temp

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
            fixedURL = url.replace("://", "://www.");
            console.log("invalidURL! -> fixedURL", fixedURL);
        }

        const validURL = url.includes("http") ? fixedURL || url : !url.includes("www.") ? `http://www.${url}` : `http://${url}` /* if the url contains neither http(s) or www. */
        
        // find relevant links
        let html;
        if (page) {
            html = await fetchDynamicHTML(validURL, page);
        } else {
            const { data } = await axios.get(validURL, { timeout: 60000 }); 
            html = data;
        }  // can get TimeoutError >> retry if so?
        const contactLinks = await findContactLinks(validURL, html, page);  
        console.log("contactLinks", contactLinks); 
         
        // .filter(contactLink => contactLink.includes()) //  \.pdf$/i // add homepage url?
        // improvement - filter out pdfs before u loop... // or convert pdf file to text...

        let occurances = {};      
        /*
            should look like: {
                @domain: 5
                @anotherDomain: 2
            } 
        */      

        // call extractEmails on each page
        for (const link of contactLinks) {
            const isPDF = [".pdf", "type=pdf", "%2epdf"].some(s => link?.toLowerCase().includes(s)); // or match (symbol-pdf)??
            let data;
            // let dynamicHTML;
            try {
                if (isPDF) {
                    const { data: pdfData, headers } = await axios.get(link, { // dont need pupeteer for pdfs i guess..?
                        responseType: 'arraybuffer', // get raw binary data
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                                          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                                          'Chrome/114.0.0.0 Safari/537.36',
                            Accept: 'application/pdf'
                            // ^^ will this work for other schools?
                            // added this bc I was getting: 'ERROR: Request failed with status code 403'
                        }
                    });

                    const contentType = headers['content-type'];

                    if (!contentType.includes('pdf')) {
                        console.warn(chalk.yellow(`Not a real PDF: ${headers['content-type']}, link: ${link}`));

                        if (contentType.includes("html")) {
                            console.error(chalk.red("Unhandled content type: html"));
                            continue;

                            // should I be skipping? should I still extract text?
                        } else {
                            console.error(chalk.red(`Unhandled content type: ${contentType}`));
                            continue;
                        }
                        
                        // ^^ bc I was getting: 'Warning: Ignoring invalid character "104" in hex string'
                        // & the pdf didnt seem to be handled/seemed to be skipped
                        // for summerhill.dudley school
                        // getting: "ERROR: Invalid PDF structure"
                    }

                    const dataBuffer = Buffer.from(pdfData);
                    const parsed = await pdf(dataBuffer);

                    data = parsed.text // error: "Warning: TT: undefined function: 32" means that parsed.text might be missing text
                } else {
                    if (page) {
                        data = await fetchDynamicHTML(link, page);
                    } else {
                        const pageData = await axios.get(link, { timeout: 20000 });
                        data = pageData.data;
                    }
                    // ONLY USE IF ITS EMPTY FOR A SCHOOL! >> ON A SECOND ITERATION?
                }
            } catch (err) {
                console.error(chalk.red(`COULDNT FETCH FROM FOUND LINK, url: ${link} - ERROR: ${err.message}`));
                continue;
            }

            result = await extractCorrectEmails(link, data, result, isPDF, occurances);
        }
        console.log("final occurances", occurances);
    } catch (error) {
        console.warn(chalk.red(`Ran into error whilst trying to scrape school: ${name}, error:`), error, "status:", error?.status); 
    }
    
    console.log("final result:", result);
    return result;
}

const csvPath = 'final_scraped_schools.csv';

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
    // console.log(require('os').cpus().length);
    console.time();
    const { default: chalk } = await import('chalk'); // temp

    const [schools, existingRows] = await extractURLs();
    let emailsFound = 0;

    const browser = await puppeteer.launch({
        headless: true,
        protocolTimeout: 60000 * 4,
        args: ["--disable-gpu", "--no-sandbox", "--disable-setuid-sandbox"],
        dumpio: true
     });
    

    // testing:
    // console.log("school name:", schools[18].name, "school url:", schools[18].url);
    // const testSchools = schools.slice(0,20);

    /* p-limit logic */
    const pLimit = await import('p-limit').then(mod => mod.default);
    const CHUNK_SIZE = 300;
    const limit = pLimit(4); // next time: try again on 3

    // Helper to chunk array
    const chunkArray = (array, size) =>
        Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
            array.slice(i * size, i * size + size)
        );

    const chunks = chunkArray(schools, CHUNK_SIZE); // can we increase the chunks so its faster?
    /* */

    // const chunks = [schools.slice(0,2)]

    // const chunks = [[{
    //     name: "Plumstead Manor School",
    //     url: 'http://www.plumsteadmanor.com'
    // }]];

    // understanding...
    // Math.ceil(array.length / size) --> most likely around 10 => chunks length is then 10
    // slices example -> (0, 300) (300, 600) (600, 900)
    // chunks -> [[], [], []]
    // chunk: has 300 schools...

    for (const chunk of chunks) {
        console.warn(`Processing batch of ${chunk.length} schools...`);

        const promises = chunk.map(school =>
            limit(async () => {
                const page = await browser.newPage();

                let result = blankResult;
                let currentSchoolEmails = 0;

                try {
                    result = await scrapeSchool(school);
                } catch (error) {
                    console.warn(chalk.red(`Failed to scrape school ${school.name}: ${error?.message}`));
                } 

                for (const arr of Object.values(result)) {
                    currentSchoolEmails += arr.length;
                }

                if (currentSchoolEmails === 0) {
                    // try again with pupetteer
                    try {
                        console.warn(chalk.bgCyan(`ZERO emails found for school: ${school.name}, trying again with puppeteer...`));
                        // await new Promise(resolve => setTimeout(resolve, 2000)); // wait before retry
                        result = await scrapeSchool(school, page);
                    } catch (error) {
                        console.error(chalk.green(`Failed to scrape school with puppeteer ${school.name}: ${error?.message}`));
                    } 
                    // finally {
                    //     try {
                    //         await page.close();
                    //     } catch (err) {
                    //         console.warn(chalk.bgGreen("Failed to close page cleanly:"), err.message);
                    //     }
                    // }
                } // then count emails again

                for (const arr of Object.values(result)) {
                    emailsFound += arr.length;
                }

                // for headteacher, if there is an info|admin email, but theres also another email in there that isnt that, remove it?

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

        await Promise.allSettled(promises); // do we want it in order... ehh
    }

    await browser.close();
    console.log(`CSV writing complete! -- ${emailsFound} emails found`);
    console.timeEnd(); // can be up to 4 mins long rn...(whats the longest?)
})();



// extraaaa: navigate all links on a site & find all emails & dump export them...


/* pdf issue, invalid emails:
    - 7MsLauraHall3348l.hall@bremer.waltham.sch.uk
    - 7AHennaDhedih.dhedhi@bremer.waltham.sch.uk
    - Scottdsl@willowfield-school.co.uk
    - phyare@bordgrng.bham.sch.uksubject (not from pdf tho but from bad html)

   possible solutions:
   - pdfjs-dist gives better control? (but looks messy)
*/

// fixed urls ->
// http://www.harlingtonschool.co.uk/ => http://www.harlingtonschool.org 
// http://loretochorlton.org/ => https://www.loretochorlton.co.uk/