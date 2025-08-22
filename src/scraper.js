const axios = require('axios');
const extractURLs = require('./helpers/extract-urls');
const findContactLinks = require('./helpers/find-contact-links'); 
const loadExistingSchools = require('./helpers/find-already-processed'); 
const { extractCorrectEmails } = require('./helpers/extract-correct-emails'); 
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { roleNameMap } = require("../data/index");
const pdf = require('pdf-parse');
const { chromium } = require("playwright");
const fs = require('fs');

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
// tests: quick eye scan of emails to detect any weird emails


// the raw html sometimes didnt have what I could see on the page
async function fetchDynamicHTML(url, page) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 80000 }); // wait for all JS to finish
  // networkidle is not recommended

  return await page.content();
}

// networkidle2 =  waits until there are no more than 2 network connections for at least 500 milliseconds 
// (so the page has mostly finished loading)

// scrape a single school
async function scrapeSchool({ name, url }, page) { 
    const { default: chalk } = await import('chalk'); // temp
    console.warn(chalk.cyan(`Scraping School: ${name}...`));

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

    let occurances = {};      
    /*
        should look like: {
            @domain: 5
            @anotherDomain: 2
        } 
    */  

    try {
        // fix url
        const invalidURL = url.includes("http") && !url.includes("www.");
        let fixedURL;

        if (invalidURL) {  // && !url.includes("wkgs.org") << test this school doesnt need this anymore (bc of trywithoutWWW)
            /* if we have http & no www. => add www. */
            fixedURL = url.replace("://", "://www.");
            console.log("invalidURL! -> fixedURL", fixedURL);
        }

        let validURL = url.includes("http") ? fixedURL || url : !url.includes("www.") ? `https://www.${url}` : `https://${url}` /* if the url contains neither http(s) or www. */
        let trywithoutWWW = false;

        // find relevant links
        let html;
        if (page) {
            html = await fetchDynamicHTML(validURL, page); // need to extend no www w/ playwright?
        } else {

            let finalUrl;

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            };

            try {
                const { data, request } = await axios.get(validURL, { 
                    timeout: 60000,
                    headers
                });

                html = data;

                /* if we redirect...  */ // TEST THIS
                finalUrl = request?.res?.responseUrl;
            } catch (error) {
                console.log("error:", error?.message);

                if (error?.message?.includes("ENOTFOUND")) {
                    console.log(chalk.yellow("ENOTFOUND... trying without www."));
                    trywithoutWWW = true;
                    validURL = validURL.replace("www.", "");

                    // trying again               
                    const { data, request } = await axios.get(validURL, { 
                        timeout: 60000,
                        headers
                    }); 

                    html = data;
                    // still, if still nothing is found, playwright will throw: ERR_NAME_NOT_RESOLVED

                    finalUrl = request?.res?.responseUrl;
                } else {
                    throw error;
                }
            }

            console.log("url:", url);
            console.log("validURL:", validURL);
            console.log("finalUrl:", finalUrl);

            // if (finalUrl[finalUrl.length - 1] === "/") finalUrl = finalUrl.slice(0, finalUrl.length - 1);

            if (finalUrl && finalUrl !== validURL) { // not perfect, sometimes the difference is just http/https or an extra '/'
                console.log(chalk.bgMagenta(`Redirected from: ${validURL} to: ${finalUrl}`));
                validURL = finalUrl;

                // matching the www. logic in findcontactlinks...? (bc finalUrl might not have www.) (need to check this aint breaking stuff...)
                if (validURL.includes("http") && !validURL.includes("www.") && !trywithoutWWW) { // && !url.includes("wkgs.org")
                    validURL = validURL.replace("://", "://www.");
                    console.log("fixed url");
                }
            }
            // schools that dont work with www. => https://hurworth.nalp.org.uk/, https://wkgs.org/, https://tba.northerneducationtrust.org/
            /* */

        }  // can get TimeoutError >> retry if so?

        const contactLinks = await findContactLinks(validURL, html, page, trywithoutWWW);  
        console.log(`school: ${name} contactLinks`, contactLinks); // can be hugeee, 100+ long (pdfs) (or even '... 20467 more items' (--_- yikerss) in school: sjhcsc, 17745 in school: st-pauls.org.uk)
         
        // add homepage url?

        // call extractEmails on each page
        for (const link of contactLinks) {
            const isPDF = [".pdf", "type=pdf", "%2epdf"].some(s => link?.toLowerCase().includes(s)); // or match (symbol-pdf)??
            let data;
            // let dynamicHTML;
            // improvement: google docs
            try {
                if (isPDF) {
                    const { data: pdfData, headers } = await axios.get(link, {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                                          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                                          'Chrome/114.0.0.0 Safari/537.36',
                            Accept: 'application/pdf'
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
            data = null; // does this even help since we're looping anyway? // oh or will it free it up on the last call??

            // improvement: return mostCommonEmail/enquiries email, if result has nothing, stick it in headteacher... => or new column: 'backup'
        }
        console.log("final occurances", occurances);
    } catch (error) {
        console.warn(chalk.red(`Ran into error whilst trying to scrape school: ${name}, error:`), error, "status:", error?.status); 
    }

    //
    let mainDomain = "";
    let maxSoFar = 0;

    for (const domainKey in occurances) {
        const value = occurances[domainKey];

        if (value > maxSoFar) { // sometimes we clear stuff that we shouldnt, e.g. .. // some potential options ==>  && (value - maxSoFar > 5)
            mainDomain = domainKey;
            maxSoFar = value;
        }
    }

    const afterAt = mainDomain.slice(1);

    // sometimes wrong domains slip through before occurances has fully formed... // johnogaunt.excalibur.org.uk
    for (const key in result) {
        const emails = result[key];
        if (emails.length) {
            if (emails.some(e => !e.toLowerCase().includes(afterAt.toLowerCase()))) { // && !e.includes("@dret.co.uk") && !e.includes("@bobbymooreacademy.co.uk")
                console.log(chalk.yellow("clear wrong domains:"), emails); 
                result[key] = emails.filter(e => e.toLowerCase().includes(afterAt.toLowerCase()));
                console.log(chalk.yellow("after:"), result[key]);
            }
        }
    }
    // ^^ not tested.... hope it workss
    // not exactly, this is getting rid of some good stuff :-)
    // TODO: REWORK^^
    //
    
    console.log("final result:", result);
    return result;
}

const csvPath = 'final.csv'; // RERUN2

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
    ],
    // append: fs.existsSync(csvPath) /////
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

    const alreadyProcessed = await loadExistingSchools(csvPath);

    const [schools, existingRows] = await extractURLs(); // "empty_schools.csv" when re-running on empty schools
    console.log("schools length", schools.length);

    // there are 100 dupe school names, so I shouldn't have treated them as unique :-)

    let emailsFound = 0;

    // launch the browser
    const browser = await chromium.launch({ headless: true, args: [
        '--no-sandbox',
        '--disable-dev-shm-usage', // Prevent memory issues in containers
        '--disable-gpu',
        '--disable-web-security'
    ]});

    // waitForSelector

    // testing:
    // console.log("school name:", schools[18].name, "school url:", schools[18].url);
    // const testSchools = schools.slice(0,20);

    /* p-limit logic */
    const pLimit = await import('p-limit').then(mod => mod.default);
    const CHUNK_SIZE = 300;
    const limit = pLimit(8);

    // Helper to chunk array
    const chunkArray = (array, size) =>
        Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
            array.slice(i * size, i * size + size)
        );

    const chunks = chunkArray(schools, CHUNK_SIZE);
    /* */

    // const chunks = [schools.slice(15,20)]

    // const chunks = [[{
    //     name: "Holte School",
    //     url: 'https://frog.holte.bham.sch.uk/app/os#!welcome/home'
    // }]]

    // slices example -> (0, 300) (300, 600) (600, 900)
    // chunks -> [[], [], []]

    for (const chunk of chunks) {
        console.warn(`Processing batch of ${chunk.length} schools...`);

        const promises = chunk.map(school =>
            limit(async () => {
                // if (alreadyProcessed.find(({ name, url }) => name === school.name && url === school.url)) {
                //     // console.log(`⏩ Skipping already processed school: ${school.name}`);
                //     return;
                // }

                const context = await browser.newContext({ 
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' 
                    + ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
                }); 

                const page = await context.newPage();

                let result = blankResult;
                let currentSchoolEmails = 0;

                try {
                    result = await scrapeSchool(school);
                } catch (error) {
                    console.warn(chalk.red(`Failed to scrape school ${school.name}: ${error}`));
                } 

                for (const arr of Object.values(result)) {
                    currentSchoolEmails += arr.length;
                }

                if (currentSchoolEmails === 0) {
                    // try again with playwrite // < are we even getting anything the second time?
                    try {
                        console.warn(chalk.bgCyan(`ZERO emails found for school: ${school.name}, trying again with playwrite...`));
                        // await new Promise(resolve => setTimeout(resolve, 2000)); // wait before retry

                        // let page2;

                        // if (page.isClosed()) {
                        //     const context2 = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' +
                        //         ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36' 
                        //     }); 
                        //     page2 = await context2.newPage();
                        // }

                        result = await scrapeSchool(school, page); // page.isClosed() ? page2 : page
                    } catch (error) {
                        console.error(chalk.green(`Failed to scrape school with puppeteer ${school.name}: ${error?.message}`));
                    } 
                    // finally {
                    //     try {
                    //         if (page) await page.close();
                    //         if (context) await context.close();
                    //     } catch {
                    //         console.error(chalk.bgGreen("Failed to close page cleanly:"), err.message);
                    //     }
                    // }
                } // then count emails again

                for (const arr of Object.values(result)) {
                    emailsFound += arr.length;

                    if (result["headteacher"].length > 1) {
                        console.log(chalk.yellow("take out other headteachers..."));
                        console.log("before: ", result["headteacher"]);
                        result["headteacher"] = result["headteacher"].filter(email => !(/\boffice@|\badmin@|reception@/i.test(email)));
                        console.log("after: ", result["headteacher"]);
                    }
                }

                // for headteacher, if there is an info|admin email, but theres also another email in there that isnt that, remove it?

                const currentSchool = existingRows.find((row) => row['School Name'] === school.name && row.Website === school.url) || {};

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

// next time: KEYSSSSS (when working with data you need a unique key!)


/* pdf issue, invalid emails:
    - 7MsLauraHall3348l.hall@bremer.waltham.sch.uk
    - 7AHennaDhedih.dhedhi@bremer.waltham.sch.uk
    - Scottdsl@willowfield-school.co.uk
    - phyare@bordgrng.bham.sch.uksubject (not from pdf tho but from bad html)

   possible solutions:
   - pdfjs-dist gives better control? (but looks messy)
*/

// manually fixed urls ->
// http://www.harlingtonschool.co.uk/ => http://www.harlingtonschool.org 
// http://loretochorlton.org/ => https://www.loretochorlton.co.uk/

// possible changes to make the script work better: removing 'policy' from the key words (this could be added on retry?)
// try -> fully use playwrite for all but just restart script on failure...?

// if using pm2 => 
// pm2 start your-script.js --name "school-scraper" --node-args="--max-old-space-size=8192"

// to do at the end:
// reloop & check empty schools
// and check schools with 1
// manually remove wrong emails
// check for dupes
// check schools that: empty, then only1, then 2.
// rerun with 'policy'?


// extremely slow schools that didnt move:
// wigmore school
// https://wkgs.org/ (problems: doesnt need www. -> beginningofbaseurl was undefined -> 'email-protection#' urls taking ages) (this school is taking looong)
// https://www.broadway-academy.co.uk/ so extremely slow w playwright...
// https://www.bishopluffa.org.uk/ was taking YEARSSSS, why? (the amount of pages?) // << so did it manuallyy...
// https://www.bayleadershipacademy.com also taking years, i think bc the pdfs arnt loading, 
// https://www.eton-academy.uk/join-the-team
// http://www.kenstimpson.org.uk
// ^^ maybe its caused by 'waiting until "networkidle"'
/*
if happens again, try:
const anchor = page.locator('a');
await anchor.waitFor(); instead of "networkidle" 
*/



// email protection stuff: (not found a way around it yet)
// ohhhh -> <a href="/cdn-cgi/l/email-protection#6c0d...">[email protected]</a> (Cloudflare email protection)
// ^^ http://www.st-mary.blackpool.sch.uk


// script notes: fixed relevant context @ 2329

// improvement: when on policies page, look for 'next' & click if so...

// malformed emails => 
// MrMBournembourne@cheslynhay.windsoracademytrus
// AllDSLscanbecontactedbyemailingsafeguarding@watersidecst.org

// occurances stuff:
// things missed: the email domain might acc be different (e.g. sgreen@thatrust.org.uk)





/* issue -->>>>>> solution: let it pass if its in the top 2 domains?? / top 3? (TODO: FIX THISS)

final occurances {
  '@st-marks.org.uk': 33,
  '@stmarks.mnsp.org.uk': 33,
  '@msnpartnership.com': 6
}
clear wrong domains: [ 'kkeely@stmarks.mnsp.org.uk' ]
after: []
clear wrong domains: [ 'sleonard@stmarks.mnsp.org.uk - (Mental Health Lead)' ]
after: []
clear wrong domains: [ 'lderrick@stmarks.mnsp.org.uk' ]
after: [] 


final occurances {
  '@ashbyschool.org.ukemail': 75,
  '@lifemultiacademytrust.org.uk': 81,
  '@ashbyschool.org.uk': 51,
  ....}

   { '@coopfailsworth.co.uk': 64, '@coopacademies.co.uk': 125 } (both are valid...)

   also be wary of dont-push-f
   --> change so 'dont-push-f' doesnt happen, but we just check at the very end???


   final occurances {
  '@admin.byrchall.wigan.sch.uk': 343,
  '@byrchall.wigan.sch.uk': 298,

  need to account for >>'sub-domains'!!!<< - clears wrong values!

  // keep a lOG OF 'CLEAR WRONG DOMAINS'!!!!! <<<< best for debugging... <<<<<<<<<<<<< (also dont-push-f)

  final occurances {
  '@st-wilfrids.bkcat.co.uk': 623,
  '@veritau.co.uk': 4,
  '@st-wilfrids.bkcat.uk': 41, smh...
  (maybe have 2 valid domains - how?)

  final occurances {
  '@fourdwellingsacademy.org': 190,
  '@fourdwellingsprimaryacademy.org': 0, <<

  final occurances {
  '@wintertoncommunityacademy.co.uk': 96,
  '@wintertonca.com': 61, <<

  // @nishkamschools.org had 100 occurances but @pwps.nishkamschools.org was valid...
  // hmmm @orchard-tmet.uk && @tmet.uk // @sdcc-smhc.net && @scottcollege.co.uk
*/

// eton academy - why didnt it get emails: https://www.eton-academy.uk/safeguarding <<<
// do manually => http://www.okehamptoncollege.devon.sch.uk/, http://www.hcc.devon.sch.uk, http://tavistockcollege.org, http://tavistockcollege.org (they were getting the same emails...)
// added 1 manually => meophamschool

// WRONG EMAILS: sixthform@st-ignatius.enfield.sch.uk, itservices@tretherras.net, studentabsence@stourvalley.org,itsupport@stourvalley.org, smh.studentservices@ldst.org.uk (investivate why they were matched)
// errors: %20, %C2%A0

///////
    // findings:  (so that my manual search is not in vain...)
    // -safeguarding@sta.magnificat.org.uk => how did that get through :/
    // childprotection@oakwood.ac - (Deputy) && childprotection@oakwood.ac got through...
    // fiona.donnelly@cambridgeast.org.uk - (Deputy), fiona.donnelly@cambridgeast.org.uk - (Deputy) - got these dupes..
    // improvement: if its a deputy - look for one of our other matches & push it in there instead.. (yh bc why do we have to wait till its thats roles turn before we push?)
    // Lisa.Staniforth@oasissouthbank.org, headspa@moulshamhigh.org, mentalhealthline@chaileyschool.org, data.office@saa.woodard.co.uk, parentpay@lightcliffeacademy.co.uk - wrongly matched?
    // DesignatedSafeguardingLeadMrPMcLoughlinsafeguarding@stjohnplessington.com, Emailsmustbesenttosafeguarding@themarlboroughschool.org
    // -edwinsr@hillview.kent.sch.uk
    // Assistant Headteacher Safeguarding Lead KS3 - smithh@hillview.kent.sch.uk - was matched for safegaurding lead
    // immediatelyviaBromcomorsafeguarding@sjwms.org.uk, mwall1.312@lgflmail.orghaydonschool.com (supposed to be mwall1.312@lgflmail.org)
    // -cc@cranford.hounslow.sch.uk but was supposed to be tje-cc@cranford.hounslow.sch.uk....
    // matched: antibullying@keslichfield.org.uk w/ `This account is accessed daily by The Safeguarding Team.\nThe email address is: antibullying@keslichfield.org.uk `
    // DPO@stbarts.co.uk, firstname.surname@mhs.e-act.org.uk
    // 7k.lambert-hood@honley.tlt.school supposed to be k.lambert-hood@honley.tlt.school
    // firstname.surname@nia.emat.uk

    // try /[a-zA-Z0-9][a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g ?? .. remove %??