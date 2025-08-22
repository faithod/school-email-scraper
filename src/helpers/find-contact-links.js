const cheerio = require('cheerio');
const axios = require('axios');

const keyWords = [
    'staff', 'team', 'contact', 'lead', 'about', 'dsl', 'safeguarding', 
    'key', 'pshe', 'pshc', 'pastor', 'wellbeing', 'protect', "staff", 
    "support", 'health', "faculties", "safety", "counsel", "find", "safe", 
    "policies", "send", "complaint", "type=pdf", "operation", "parent", "bullying",
    "subject", "information", "statutory", "welfare", "pshe", "psce", "pshce", "well-being", "rshe", "behaviour", "care", "whistleblowing", "conduct",
    "policy", "designated"
    // removing & adding back policy (as it can match too much)
    // info // pdf was good but type=pdf to make it faster??
]; 

// go over this whole function again, not fully gone over
// confused at what currentUrl is doing


// changind how we check same domain, hope this doesnt break anything
// (make sure share links dont pass through)
function isSameDomain(urlA, urlB) {
  const domainA = new URL(urlA).hostname;
  const domainB = new URL(urlB).hostname;
  return domainA === domainB;
}

// find  staff/team/contact links for a url
async function findContactLinks(baseUrl, homepageHtml, page, trywithoutWWW, currentUrl = baseUrl, maxDepth = 6, currentDepth = 0, visited = new Set ()) {
    const { default: chalk } = await import('chalk'); // temp

    if (visited.has(currentUrl) || currentDepth > maxDepth) return [];
    visited.add(currentUrl);

    let html = homepageHtml;

    if (currentUrl.includes(".pdf")) return []; // this correct..?
    // if (currentUrl.includes("email-protection#")) return []; (wkgs)

    if (currentDepth === 0) console.warn(chalk.cyan(`findContactLinks for: ${baseUrl}...`));

    if (currentDepth !== 0) {
        try {
            if (page) {
                await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 60000 });
                html = await page.content();
            } else {
                const { data } = await axios.get(currentUrl, { timeout: 60000 });
                html = data;
            }
        } catch (err) {
            console.error(chalk.red(`Failed to load nested page - ${currentUrl}: ${err.message}`));
            return [];
        }
    }

    const $ = cheerio.load(html || "");
    const anchors = $('a').toArray() || [];
    const foundLinks = new Set();

    // console.log("anchorssss", anchors.map(a => ($(a).attr('href') || "")));

    // need to add back 'PA'..

    // check all pdfs without checking keywords?


    // console.log("anchorssss", anchors.filter(a => ($(a).attr('href') || "").includes("pdf")).map(a => ($(a).attr('href') || "")));
    

    for (const a of anchors) {
        const href = ($(a).attr('href') || "").toLowerCase();
        const title = ($(a).attr('title') || "").toLowerCase();
        // const textContent = ($(a).text() || "").toLowerCase();
        const ariaLabel = ($(a).attr('aria-label') || "").toLowerCase(); // OR just look into allll pdfs??

        const isPDF = href.includes('.pdf');
        // const isPDF = [".pdf", "type=pdf", "%2epdf"].some(s => link.includes(s)); // ???? use this here aswell??? <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

        const hrefCaseSentitive = ($(a).attr('href') || "");

        if (!href) continue;

        // add 'communications'?? Curriculum? // chatgpt said: ''directory' aswell // "touch"

        let fullUrl = href.startsWith('http') ? href : new URL(href, currentUrl).href; // necessary?
        const fullUrlCaseSensitive = hrefCaseSentitive.startsWith('http') ? hrefCaseSentitive : new URL(hrefCaseSentitive, currentUrl).href;

        if (fullUrl.includes("http") && !fullUrl.includes("www.") && !trywithoutWWW) { // && !fullUrl.includes("wkgs.org")
            fullUrl = fullUrl.replace("://", "://www.");
            // could it (like with the base) contain neither?

            // ^^ dont think we need this for pdfs?? // bc pdfs can be: ..  'https://4905753ff3cea231a8...'
        }

        const matchesKeyword = keyWords.some(word => href.includes(word) || title.includes(word) || ariaLabel.includes(word)); // textContent === "next"
        const sameDomain = isSameDomain(fullUrl, baseUrl);


        // console.log("samedomain",sameDomain);
        // console.log("matchesKeyword",matchesKeyword);


        // have i broken something w the urls? beacon high is acring weird... think its fine now?

        // found a website with 2 obscure links that none of my matches can find
        let mainPageHasLessThan3Links = false;

        if (currentDepth === 0 && anchors.length < 6) {
            mainPageHasLessThan3Links = true;
        }

        // filter out docs for now

        // sameDomain will fail if it redirects...

        const unsupported = [".docx", ".pptx", ".doc", ".jpg", ".xlsx", ".mp3"];
        const doesntHaveUnsupported = unsupported.every(suffix => !fullUrl.endsWith(suffix));

        if (((matchesKeyword && (sameDomain || isPDF) && doesntHaveUnsupported) || mainPageHasLessThan3Links) && !fullUrl.includes("email-protection#")) {
            const urlToUse = isPDF ? fullUrlCaseSensitive : fullUrl;
            foundLinks.add(urlToUse); // s3 urls are case sentitive (pdf may live on s3)

            try {
                // Fetch and parse nested page
                const childLinks = await findContactLinks(baseUrl, null, page, trywithoutWWW, urlToUse, maxDepth, currentDepth + 1, visited);
                // if its a pdf, should we call: findContactLinks ??....
                for (const link of childLinks) {
                    foundLinks.add(link);
                }
            } catch (err) {
                console.error(chalk.red(`Failed to call findContactLinks for nested page - ${urlToUse}:`), err.message);
                continue;
            }
        }
    };

    // console.log("visited", visited);
    return [...foundLinks];
};


module.exports = findContactLinks;