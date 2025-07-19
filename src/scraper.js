const axios = require('axios');
const cheerio = require('cheerio');
const extractURLs = require ('./helpers/extract-urls');
const { launch } = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

// ohh they show based on priority...
 const roleRegexMap = {
  dsl: /designated safeguarding lead|safeguarding lead/i, // DOES ADDING JUST 'SAFEGAURDING' CHANGE THINGS??
  pshe: /pshe lead|pshe teacher|personal, social/i, // Personal, Social, Health hmmm
  pastoral: /head of pastoral care|pastoral lead|pastoral care|pastoral/i,
  mental_health: /mental health lead|school counsellor|wellbeing lead|counsellor|Counselling/i, // Wellbeing Practitioner?
  safeguarding_officer: /safeguarding officer|child protection officer/i,
  deputy_head: /deputy headteacher|assistant headteacher/i, 
  headteacher: /(?<!deputy\s|assistant\s)headteacher|principal/i, // Executive Headteacher << put this first? // if 'headteacher' - `find the mainn headteacher not assistant headteacher`
  head_of_year: /\bHead of Year\b(?!\s*(\d|or\b))/i, // was: /head of year/i
  head_of_school: /head of school/i
  // add new 1 -> Headteacher's PA??
};
// update this as you come accross websites^^
// checked: 1
// others found: head of inclusion // todo: on other websites find if theyre worded differently & add here...
// 'assistant headteacher' can be followed by the specific role... 

// {} another object to get other alternatives of the name?

// emails found: ==>> output this.... <<<<<

// headers
const roleNameMap = {
  dsl: "Designated Safeguarding Lead / Safeguarding lead / DSL",
  pshe: "PSHE Lead / PSHE Teacher",
  pastoral: "Head of Pastoral Care / Pastoral Lead",
  mental_health: "Mental Health Lead / School Counsellor / Wellbeing Lead",
  safeguarding_officer: "Safeguarding Officer / Child Protection Officer",
  deputy_head: "Deputy Headteacher / Assistant Headteacher (pastoral / safeguarding remit)",
  headteacher: "Headteacher / Principal", 
  head_of_year: "Head of Year",
  head_of_school: "Head of School"
};

// psuedocode:
// for each link found... with the html =>
// for each line in the html
// for each role...
//      first check to see if there's an email? // nvm
//      see if theres a match in the line
//      if there is, get the index, and slice before & after -> send this to gpt-4
//          // no email? (var) -- different prompt // or just 1 prompt....
//      map to result



// find  staff/team/contact links for a url
// test this on 5 other sites
// testtttt
// going ovee 1 rn
async function findContactLinks(baseUrl, homepageHtml) {
    const $ = cheerio.load(homepageHtml);
    const links = [];

    const anchors = $('a').toArray()

    // not gone over:
    for (const el of anchors) {
        const href = $(el).attr('href');
        if (!href) continue;
        const lowerHref = href.toLowerCase();
        if (['staff', 'team', 'contact', 'lead', 'about', 'dsl', 'safeguarding', 'key', 'pshe', 'pshc', 'pastor', 'wellbeing', 'protection', "staff", "support", "faculties", "safety", "counsel", "find"].some(k => lowerHref.includes(k))) { // "touch"
            // add 'communications'?? Curriculum? health?
            const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;

            // mine

            const begginingOfBaseUrl = baseUrl.match(/www\.[^\.]+/)?.[0];

            // make sure share links dont pass through
            const altBaseUrl = baseUrl.replace(/^http(?!s)/, "https");
            // console.log("beginingg", begginingOfBaseUrl);

            if (fullUrl.includes(begginingOfBaseUrl) && (fullUrl.startsWith(baseUrl) || fullUrl.startsWith(altBaseUrl))) {

                //
                // Fetch and parse nested page
                try {
                    const { data: nestedHtml } = await axios.get(fullUrl, { timeout: 20000 });
                    const $$ = cheerio.load(nestedHtml);

                    const nestedLinks = $$('a').toArray();

                    for (const el2 of nestedLinks) {
                        const href2 = $$(el2).attr('href');
                        if (!href2) continue;

                        const lowerHref2 = href2.toLowerCase();
                        if (['staff', 'team', 'contact', 'lead', 'about', 'dsl', 'safeguarding', 'key', 'pshe', 'pshc', 'pastor', 'wellbeing', 'protection', "staff", "support", "faculties", "safety", "counsel", "find"].some(k2 => lowerHref2.includes(k2))) {
                            const fullUrl2 = href2.startsWith('http') ? href2 : new URL(href2, fullUrl).href;
                            if (fullUrl2.includes(begginingOfBaseUrl) && (fullUrl2.startsWith(baseUrl) || fullUrl2.startsWith(altBaseUrl))) {
                                links.push(fullUrl2);
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to load nested page: ${fullUrl}`, err.message);
                    continue;
                }
                //

                links.push(fullUrl);
            }
            
            // test regex with unit tests...
        }
    };

    return [...new Set(links)];

    // get the names with AI? >> didn't work
} // attributes: href, title, 
// children might have anchor tags?....* // hmm actually $('a')[3] which is a nested link seems to be fine (1st website)
// checked: 1, 

// keywords: staff/team/contact/lead/about us*/safeguarding/key*/ // chatgpt said: ''directory' aswell
// plan -> get the pages then use ai...?
// not contact us?

// tryna see with this 1 website if i can find the correct pages using code...



// the raw html sometimes didnt have what I could see on the page
async function fetchDynamicHTML(url, browser) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' }); // wait for all JS to finish

  const html = await page.content();
    await page.close(); // Close the tab, not the browser
  return html;
}

async function extractEmails(link, html, result) { 
    // get whole page
    // match all emails
    // for each email, go abit forward by some characters
    // use this snippet - for each role, match role-regex, if passes - push it inn?

    // not tested // this is so we can find internal links in a page with the format: <a href="javascript:mt('kaltmann','williamellis.camden.sch.uk','','')">Karl Altmann</a>
    let modifiedHtml = html.replace(/<a\s+href=["']javascript:mt\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*\)["']\s*>(.*?)<\/a>/gi, (_, user, domain, name) => {
            const email = `${user}@${domain}`;
            return `${name} <a href="mailto:${email}">${email}</a>`;
        })

    // modifiedHtml = html.replace(/<a\s+href=["']mailto:([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, emailHref, linkText) => {
    //     return `${emailHref}`;
    // });
    //

    const $ = cheerio.load(modifiedHtml);
    const allText = $('body').text();

    // console.log("RAW HTML:", html.slice(0, 500));

    // replace js formatted 'mailto' emails with actual emails
    // const allText = body.replace(/mt\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*\)/g, (match, user, domain) => {
    //     console.log("match", match)
    //     return `${user}@${domain}`;
    // });

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;

    const emailMatches = [...allText.matchAll(emailRegex)]

    if (!emailMatches?.length) return result;

    console.log("emails:", emailMatches.map(e => e[0]));

    // new decision -- we're just gonna look before the email.......



    for (const match of emailMatches) {
        const email = match[0];
        const indexInLine = match.index;
        if (indexInLine === undefined) continue;

        const whereToStart = allText.slice(0, indexInLine).length <= 115 ? 0 : indexInLine - 115

        // only getting the part before the email?...
        const context = allText.slice(whereToStart, indexInLine)

        console.log("EMAIL:", email);
        console.log("context:", `(${context})`);


        for (const [roleKey, regex] of Object.entries(roleRegexMap)) {
            const altMatch = (roleKey === "dsl" && email.toLowerCase().includes("safeguarding")) || (roleKey === "pshe" && email.toLowerCase().includes(roleKey) || (roleKey === "headteacher" && email.toLowerCase().match(/office@|admin|head/i) && !email.includes(".gov.uk") && result[roleKey]?.length === 0)) // is that accurate for headteachers...?
            if (regex.test(context) || altMatch) {
                console.log("role:", roleKey);
                console.log("context with matches:", `(${context})`);
                console.log("the email after:", `(${allText.slice(indexInLine, indexInLine + 60)})`);


                // ADDD =>>>>>>>>>
                // make sure we dont match random 'dsl' letters in words
                // const otherRegex = /DSL/;
                //     if (regex.test(line) || (role === "dsl" && otherRegex.test(line))) {
                //     const regexToUse = role === "dsl" && !regex.test(line) ? otherRegex : regex





                        // const startIndex = context.match(regex).index; // add safety?
                        // const whereToStart = line.slice(0, startIndex).length <= 80 ? 0 : startIndex - 80;
                        // // const whereToStart = startIndex - 80 > 0 ? startIndex - 80 : startIndex - 70 > 0 ? startIndex - 70 : startIndex - 60 > 0 ? startIndex - 60 : startIndex - 50 > 0 ? startIndex - 50 : startIndex - 40 > 0 ? startIndex - 40 : startIndex;
                        // const snippet = line.slice(whereToStart, whereToStart + 170); // alter numbers with each case...?


                        // add logic for matching 'DSL' <<


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

                        const index = emailMatches.find(matchh => matchh[0] === matchedEmail)?.index

                        // console.log("main email:", email);
                        // console.log("INDEX:", index);
                        // console.log("indexInLine:", indexInLine);



                        if (matchedEmail !== email && index < indexInLine) {
                            const start = index;
                            const relevantContext = allText.slice(start, indexInLine);

                            if (!regex.test(relevantContext)) push = false; // bit messy mate
                            if (altMatch) push = true;
                        }
                    }
                }
                //

                let emailToPush = email;


                //
                // make sure there isnt another match with a higher index...
                for (const [key, otherRegex] of Object.entries(roleRegexMap)) {
                    if (key !== roleKey && otherRegex.test(context)) {
                        const actualRoleMatch = context.match(regex); // should this be index in line?
                        const otherMatch = context.match(otherRegex);

                        // check this when less tired
                        if (!actualRoleMatch && altMatch) {
                            console.log("here")
                            push = true;
                        } 

                        console.log("actualRoleMatch", actualRoleMatch);
                        console.log("otherMatch", otherMatch);


                        if (actualRoleMatch) {
                            // const relevantSlice = context.slice()

                            // if the other match is greater/closer to the email, dont match??? i think idk
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



                // dont think this is doing anything? => bc of the new system i put down..?
                // don't save dupe values
                for (const resultKey in result) {
                    const emailArray = result[resultKey];
                    // if (roleKey === "safeguarding_officer" || roleKey === "deputy_head") {
                    //     console.log("resultKey:", resultKey, "emailArray:", emailArray, "emailToPush:", emailToPush)

                    // }

                    for (const emaill of emailArray) {
                        const indexBeforeRole = emailToPush.indexOf("- ");
                        const startt = emailToPush.slice(0, indexBeforeRole)?.toLowerCase();
                        if (emaill.toLowerCase().startsWith(startt)) {
                            push = false;
                        }
                    }
                    
                    if (emailArray.includes(emailToPush)) {
                        push = false;
                    }
                }
       


                if (roleKey === "headteacher") { 

                    // forget this for now... // need to fine tune it...
                    // if (context.toLowerCase().includes("headteacher's pa") || context.toLowerCase().includes("headteacher pa") || context.includes("PA")) {
                    //     emailToPush = `${emailToPush} - (PA)`
                    // }
                }

                if (roleKey === "mental_health") {
                    emailToPush = `${emailToPush} - (${context.match(regex)?.[0]})`
                }


                if (!result[roleKey].includes(emailToPush) && push) {
                    result[roleKey].push(emailToPush);
                }             
            }
        }
  
    }

  return result;
}


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
}

async function scrapeSchool({ name, url }, browser) { // scrape a single school
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
        const invalidURL = url.includes("http") && !url.includes("www.");
        let fixedURL;

        if (invalidURL) {
            console.log("invalidURL");
            const startIndex = url.lastIndexOf("://") + "://".length;
            fixedURL = `http://www.${url.slice(startIndex)}`
            console.log("fixedURL", fixedURL);
        }

        const validURL = url.includes("http") ? fixedURL || url : !url.includes("www.") ? `http://www.${url}` : `http://${url}`
        const { data } = await axios.get(validURL, { timeout: 20000 });
        const contactLinks = await findContactLinks(validURL, data);//  // .filter(contactLink => contactLink.includes()) //  \.pdf$/i // add homepage url?
        console.log("contactLinks", contactLinks);

        // new change: this will be an array of emails... // was null values before
        

        for (const link of contactLinks) {
            let data;
            let dynamicHTML;
            try {
                const page = await axios.get(link, { timeout: 20000 });
                data = page.data;
                // dynamicHTML = await fetchDynamicHTML(link, browser); // ONLY USE IF ITS EMPTY FOR A SCHOOL! >> ON A SECOND ITERATION?
            } catch (err) {
                console.warn(`COULDNT FETCH FROM LINK, url: ${link} - ERROR: ${err.message}`);
                continue;
            }
            // result = await extractByRole(link, data, result);
            result = await extractEmails(link, data, result); // new

            // for (const key in found) {
            //     if (found[key].length){
            //         result[key] = [...new Set([...result[key], ...found[key]])]
            //     }
            // }
        }
    } catch (error) {
        console.warn(`ran into error whilst trying to scrape school: ${name}, error:`, error?.message);
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

(async () => {
    const [schools, existingRows] = await extractURLs();
    let browser;
    // const browser = await launch({ headless: true });


    const csvRows = [];
    let emailsFound = 0;


    // console.log("schools", schools);
    // console.log("school name:", schools[18].name, "school url:", schools[18].url);

    // const testSchools = schools.slice(0,20);

    // improvement - filter out pdfs before u loop...

    // improvement: 
    ` Pastoral: pastoral@oaklandsschool.com

               Premises: premises@oaklandsschool.com` // >> premises@oaklandsschool.com was matched for pastoral
               // suggestion: if theres an email after the match -> forget everything after it...

    const pLimit = await import('p-limit').then(mod => mod.default);
    const CHUNK_SIZE = 300;
    const limit = pLimit(5);

    // Helper to chunk array
    const chunkArray = (array, size) =>
        Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
            array.slice(i * size, i * size + size)
        );

    const chunks = chunkArray(schools, CHUNK_SIZE);

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
                    dsl: result.dsl.join(', '),
                    pshe: result.pshe.join(', '),
                    pastoral: result.pastoral.join(', '),
                    mental_health: result.mental_health.join(', '),
                    safeguarding_officer: result.safeguarding_officer.join(', '),
                    deputy_head: result.deputy_head.join(', '),
                    headteacher: result.headteacher.join(', '),
                    head_of_year: result.head_of_year.join(', '),
                    head_of_school: result.head_of_school.join(', '),
                };

                await csvWriter.writeRecords([row]); // write 1 row
                // csvRows.push(row);
            })
        );

        await Promise.all(promises);
    }
    // await browser.close();
    // await csvWriter.writeRecords(csvRows);
    console.log(`CSV writing complete! -- ${emailsFound} emails found`);
})();


// steps:
// parse csv
// for each website, look for staff/team/contact pages << doin this
//      im gonna check for patterns in 10 websites ...
// Extract: Use text patterns and role-based keywords (or ai) to find relevant names and emails
// Filter: Keep only 3–8 contacts per school, matching the desired roles.
// Output: Save in CSV

// Validate Page Content with AI

// extraaaa: navigate all links on a site & find all emails & dump export them...