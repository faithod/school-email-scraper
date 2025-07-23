const axios = require('axios');
const cheerio = require('cheerio');
const extractURLs = require ('./helpers/extract-urls');
const { launch } = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { roleRegexMap, roleNameMap } = require("../data/index");

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



// commit then add to its own file
// find  staff/team/contact links for a url
async function findContactLinks(baseUrl, homepageHtml) {
    const $ = cheerio.load(homepageHtml);
    const anchors = $('a').toArray();

    const keyWords = ['staff', 'team', 'contact', 'lead', 'about', 'dsl', 'safeguarding', 'key', 'pshe', 'pshc', 'pastor', 'wellbeing', 'protection', "staff", "support", 'health', "faculties", "safety", "counsel", "find"];
    const foundLinks = [];

    for (const a of anchors) {
        const href = ($(a).attr('href') || "").toLowerCase();
        const title = ($(a).attr('title') || "").toLowerCase();

        if (!href) continue;

        if (keyWords.some(word => href.includes(word) || title.includes(word))) { 
            // add 'communications'?? Curriculum? // chatgpt said: ''directory' aswell // "touch"
            const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href; // necessary?


            // make sure share links dont pass through
            const begginingOfBaseUrl = baseUrl.match(/www\.[^\.]+/)?.[0];
            const altBaseUrl = baseUrl.replace(/^http(?!s)/, "https");

            // >> is this whole if needed?
            if (fullUrl.includes(begginingOfBaseUrl) && (fullUrl.startsWith(baseUrl) || fullUrl.startsWith(altBaseUrl))) {

                foundLinks.push(fullUrl); // could filter out pdfs before you push?

                // does this work? >
                // Fetch and parse nested page
                try {
                    const { data: nestedHtml } = await axios.get(fullUrl, { timeout: 20000 });
                    const $$ = cheerio.load(nestedHtml);

                    const nestedLinks = $$('a').toArray();

                    for (const nestedLink of nestedLinks) {
                        const nestedHref = ($$(nestedLink).attr('href') || "").toLowerCase();
                        const nestedTitle = ($$(nestedLink).attr('title') || "").toLowerCase();

                        if (!nestedHref) continue;

                        if (keyWords.some(word => nestedHref.includes(word) || nestedTitle.includes(word))) {
                            const fullUrl2 = nestedHref.startsWith('http') ? nestedHref : new URL(nestedHref, fullUrl).href; // should it be baseUrl?
                            if (fullUrl2.includes(begginingOfBaseUrl) && (fullUrl2.startsWith(baseUrl) || fullUrl2.startsWith(altBaseUrl))) {
                                foundLinks.push(fullUrl2);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Failed to load nested page: ${fullUrl}`, err.message);
                    continue;
                }
            }
        }
    };

    return [...new Set(foundLinks)];
} 

// NOT GONE OVER >>>>
// the raw html sometimes didnt have what I could see on the page
async function fetchDynamicHTML(url, browser) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' }); // wait for all JS to finish

  const html = await page.content();
    await page.close(); // Close the tab, not the browser
  return html;
}

// extract all emails from a page & return only the correct emails
async function extractEmails(link, html, result) {
    // for each email, go abit backwards by some characters (decision -- only looking behind the email)
    // use this snippet - if there is a role match - push it inn?

    if (!html) return result;

    // this is so we can find internal links in a page with the format: <a href="javascript:mt('kaltmann','williamellis.camden.sch.uk','','')">Karl Altmann</a> // not tested 
    let modifiedHtml = html.replace(/<a\s+href=["']javascript:mt\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*\)["']\s*>(.*?)<\/a>/gi, (_, user, domain, name) => {
            const email = `${user}@${domain}`;
            return `${name} <a href="mailto:${email}">${email}</a>`;
        })

    // modifiedHtml = html.replace(/<a\s+href=["']mailto:([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, emailHref, linkText) => {
    //     return `${emailHref}`;
    // });
    //

    // mt >>
    // replace js formatted 'mailto' emails with actual emails
    // const allText = body.replace(/mt\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*\)/g, (match, user, domain) => {
    //     console.log("match", match)
    //     return `${user}@${domain}`;
    // });

    const $ = cheerio.load(modifiedHtml);
    const allText = $('body').text();

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
    const emailMatches = [...allText.matchAll(emailRegex)]

    if (!emailMatches?.length) return result;

    console.log("emails:", emailMatches.map(e => e[0]));

    for (const match of emailMatches) {
        const email = match[0];
        const emailIndex = match.index;
        if (emailIndex === undefined) continue;

        const whereToStart = allText.slice(0, emailIndex).length <= 115 ? 0 : emailIndex - 115 // change num <<<*
        const context = allText.slice(whereToStart, emailIndex);

        console.log("Current Email:", email);
        console.log("context:", `(${context})`);
        // improvent: only get context after email if....it has a match and theres no email infront of that match?? <<<

        // find matches within the context
        for (const [roleKey, regex] of Object.entries(roleRegexMap)) {
            const altMatch = (roleKey === "dsl" && email.toLowerCase().includes("safeguarding")) || (roleKey === "pshe" && email.toLowerCase().includes(roleKey)) || (roleKey === "headteacher" && email.toLowerCase().match(/office@|admin|head/i) && !email.includes(".gov.uk") && result[roleKey]?.length === 0) // is that accurate for headteachers...?
            
            if (regex.test(context) || altMatch) {
                console.log("role:", roleKey);
                console.log("context with matches:", `(${context})`);

                // logic for matching 'DSL':
                // ADDD TO altMatch =>>>>>>>>>  || /DSL/.test(context)) 
                // uppercase so make sure we dont match random 'dsl' letters in words
                //     const regexToUse = role === "dsl" && !regex.test(context) ? otherRegex : regex


                if (roleKey === "deputy_head") {
                    if (!context.toLowerCase().includes("pastor") && !context.toLowerCase().includes("safeguarding") && !context.includes("DSL")){
                        console.log("ignoreee")
                        continue;
                    }
                }
              

                //
                // make sure we arnt getting the wrong emails....?
                let push = true;


                const emailsWithinTheContext = [...context.matchAll(emailRegex)]
                if (emailsWithinTheContext.length) {
                    // console.log("emailsWithinTheContext", emailsWithinTheContext.map(e => e[0]));

                    for (const match of emailsWithinTheContext) {
                        const matchedEmail = match[0];
                        // const index = match.index;
                        const matchedEmailIndex = emailMatches.find(m => m[0] === matchedEmail)?.index

                        if (matchedEmail !== email && matchedEmailIndex < emailIndex) {
                            const start = matchedEmailIndex;
                            const relevantContext = allText.slice(start, emailIndex);

                            if (!regex.test(relevantContext)) push = false;
                            if (altMatch) push = true;
                        }
                    }
                }
                //

                let emailToPush = email;


                //
                // make sure there isnt another match with a higher index...
                for (const [key, otherRegex] of Object.entries(roleRegexMap)) {
                    // if there is another match in the context...
                    if (key !== roleKey && otherRegex.test(context)) {
                        const actualRoleMatch = context.match(regex); // should this be index in line?
                        const otherMatch = context.match(otherRegex);

                        // check this when less tired // is this needed since its already true..?
                        // if (!actualRoleMatch && altMatch) {
                        //     push = true;
                        // }  // JUST COMMENTED OUT ^^^^...should i?

                        console.log("actualRoleMatch", actualRoleMatch);
                        console.log("otherMatch", otherMatch);


                        if (actualRoleMatch) {
                            // if the other match is greater/closer to the email, dont match??
                            if (otherMatch.index > actualRoleMatch.index) {
                                push = false
                                // fixes the wrong match in school 6
                            }

                            // could this go wrong? // test...
                            // this is extra tbh...
                            const deputyDSLMatch = context.match(/Deputy Designated Safeguarding Lead/i); // think of other ways this is written
                            if (roleKey === "dsl" && deputyDSLMatch && otherMatch.index < deputyDSLMatch.index) {
                                emailToPush = `${emailToPush} - (Deputy)`
                            }
                        }
                        
                    }
                }
                //


                // don't save dupe values
                // also dont have the same email in 2 places?
                for (const resultKey in result) {
                    const emailArray = result[resultKey];

                    // make sure the added text doesnt affect identifying dupes
                    for (const e of emailArray) {
                        const indexBeforeRole = emailToPush.indexOf("- ");
                        const actualEmail = emailToPush.slice(0, indexBeforeRole)?.toLowerCase();
                        if (e.toLowerCase().startsWith(actualEmail)) {
                            push = false;
                        }
                    }
                    
                    if (emailArray.includes(emailToPush)) {
                        push = false;
                    }
                }
       


                if (roleKey === "headteacher") { 
                    // forget this for now... // need to fine tune it... // extra stufff
                    // if (context.toLowerCase().includes("headteacher's pa") || context.toLowerCase().includes("headteacher pa") || context.includes("PA")) {
                    //     emailToPush = `${emailToPush} - (PA)`
                    // }
                }

                if (roleKey === "mental_health") {
                    emailToPush = `${emailToPush} - (${context.match(regex)?.[0]})`
                }

                // improvement: >>>>>>>>
                    ` Pastoral: pastoral@oaklandsschool.com

                    Premises: premises@oaklandsschool.com` // >> premises@oaklandsschool.com was matched for pastoral
                // suggestion: if theres an email after the match -> forget everything after it...
                // make a clear list & notes with these edge cases ^^ (inside the function)
                /// ^^^^^^^^^


                if (!result[roleKey].includes(emailToPush) && push) {
                    result[roleKey].push(emailToPush);
                }             
            }
        }
  
    }

  return result;
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

            result = await extractEmails(link, data, result);
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