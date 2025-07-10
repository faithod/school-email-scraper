const axios = require('axios');
const cheerio = require('cheerio');
const extractURLs = require ('./helpers/extract-urls');
const getGPTResponse = require ('./helpers/get-gpt-response');

// ohh they show based on priority...
const roleRegexMap = {
  dsl: /designated safeguarding lead|safeguarding lead/i,
  pshe: /pshe lead|pshe teacher/i,
  pastoral: /head of pastoral care|pastoral lead|pastoral/i,
  mental_health: /mental health lead|school counsellor|wellbeing lead|counsellor/i,
  safeguarding_officer: /safeguarding officer|child protection officer/i,
  deputy_head: /deputy headteacher|assistant headteacher/i, 
  headteacher: /(?<!deputy\s|assistant\s)headteacher|principal/i, // Executive Headteacher << put this first? // if 'headteacher' - `find the mainn headteacher not assistant headteacher`
  head_of_year: /head of year/i,
  head_of_school: /head of school/i
};
// update this as you come accross websites^^
// checked: 1
// others found: head of inclusion // todo: on other websites find if theyre worded differently & add here...
// 'assistant headteacher' can be followed by the specific role... 

// {} another object to get other alternatives of the name?

// psuedocode:
// for each link found... with the html =>
// for each line in the html
// for each role...
//      first check to see if there's an email? // nvm
//      see if theres a match in the line
//      if there is, get the index, and slice before & after -> send this to gpt-4
//          // no email? (var) -- different prompt // or just 1 prompt....
//      map to result


// rename?
async function scrapeEmails(url) { 

}

// find  staff/team/contact links for a url
// test this on 5 other sites
// testtttt
// going ovee 1 rn
function findContactLinks(baseUrl, homepageHtml) {
    const $ = cheerio.load(homepageHtml);
    const links = [];

    // not gone over:
    $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const lowerHref = href.toLowerCase();
        if (['staff', 'team', 'contact', 'lead', 'about', 'dsl', 'safeguarding', 'key', 'pshe', 'pshce', 'pastoral', 'wellbeing', 'protection', "staff"].some(k => lowerHref.includes(k))) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
            links.push(fullUrl);
        }
    });

    return [...new Set(links)];

    // get the names with AI?

    // console.log($('a')[3])
    // console.log($('a')[0], $('a')[1], $('a')[2])
    // console.log($('a').map(el => el.attribs));
} // attributes: href, title, 
// children might have anchor tags?....* // hmm actually $('a')[3] which is a nested link seems to be fine (1st website)
// checked: 1, 

// keywords: staff/team/contact/lead/about us*/safegaurding/key*/ // chatgpt said: ''directory' aswell
// plan -> get the pages then use ai...?
// not contact us?

// tryna see with this 1 website if i can find the correct pages using code...


async function extractByRole(link, html, result) {
    const $ = cheerio.load(html);
    const textBlocks = $('body')
     .text()
     .split('\n')
     .map(line => line.trim())
     .filter(Boolean);
     // dont do line by line! sometimes the info is on the next line?

     for (const line of textBlocks) {
        for (const [role, regex] of Object.entries(roleRegexMap)) {

            // make sure we dont match random 'dsl' letters in words
            const otherRegex = /DSL/;

            if (regex.test(line) || (role === "dsl" && otherRegex.test(line))) {

                console.log("role:", role);

                const regexToUse = role === "dsl" && !regex.test(line) ? otherRegex : regex

                const startIndex = line.match(regexToUse).index; // add safety?
                const whereToStart = line.slice(0, startIndex).length <= 80 ? 0 : startIndex - 80;
                // const whereToStart = startIndex - 80 > 0 ? startIndex - 80 : startIndex - 70 > 0 ? startIndex - 70 : startIndex - 60 > 0 ? startIndex - 60 : startIndex - 50 > 0 ? startIndex - 50 : startIndex - 40 > 0 ? startIndex - 40 : startIndex;
                const snippet = line.slice(whereToStart, whereToStart + 170); // alter numbers with each case...?


                if (role === "deputy_head") {
                    if (!snippet.toLowerCase().includes("pastor") && !snippet.toLowerCase().includes("safegaurding") && !snippet.toLowerCase().includes("dsl")){
                        continue;
                    }
                }

                
                console.log("line:", `(${line})`)
                console.log("link:", `(${link})`)

                console.log("\n")
                console.log("snippet:", `(${snippet})`)
                console.log("\n\n\n")


                // for headteacher -- reject it if starts with assistant

                const response = await getGPTResponse(snippet); // wait a minute before each...
                let responseObj;
                console.log("response:", response)

                try {
                    responseObj = JSON.parse(response)
                } catch {
                    console.log("couldn't parse:", response);
                }

                console.log("responseObj:", responseObj)

                // works
                if (!responseObj || !(responseObj.name || responseObj.role || responseObj.email)) {
                    console.log("rejected!!!!", responseObj)
                    continue;
                }

                // replace null fields...
                // test to see if it works
                // unit test for this...?
                if (result[role]) {
                    console.log("what we already have:", result[role])
                    console.log("new:", responseObj)
                    
                    let newValues = false;

                    for (const key in result[role]) {
                        if (!result[role][key]) {
                            if (responseObj[key]) { 
                                result[role][key] = responseObj[key]
                                newValues = true;
                                console.log("newValues!")
                            }
                         
                        }
                    }

                    if (!newValues) continue;
                }




                // const name = extractName(line);
                // const email = emails[0];

                result[role] = responseObj; // map over later to make this <<<<

                // result[role] = name ? `${name} – ${email}` : email; // map over later to make this <<<<
            }
            // later: replace null fields individually??
        }
     }
     
     return result
}

// Scrape a single school
async function scrapeSchool({ name, url }) {
    try {
        const { data } = await axios.get(url, { timeout: 7000 });
        const contactLinks = findContactLinks(url, data); // add homepage url?
        console.log("contactLinks", contactLinks);

        let result = {
            dsl: null,
            pshe: null,
            pastoral: null,
            mental_health: null,
            safeguarding_officer: null,
            deputy_head: null,
            headteacher: null,
            head_of_year: null,
            head_of_school: null,
        }

        for (const link of contactLinks) {
            const { data } = await axios.get(link, { timeout: 7000 });
            result = await extractByRole(link, data, result);
        }

        console.log("final result:", result);


    } catch (error) {
        console.log("error:", error);
    }
}

(async () => {
    const schools = await extractURLs();
    // console.log("schools", schools);


    console.log("school name:", schools[1].name, "school url:", schools[1].url);


    // for (const { name, url } of schools) {
        const result = await scrapeSchool(schools[1]); // change to scrapeSchool(name, url)

    // }



//   const url = 'https://www.haverstock.camden.sch.uk/';
//   const response = await fetch(url);

//   const $ = cheerio.load(await response.text());
// //   console.log($.html());

//   const anchor = $('a');
// //   console.log("anchor:", anchor)
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