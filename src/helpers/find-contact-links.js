const cheerio = require('cheerio');

const keyWords = [
    'staff', 'team', 'contact', 'lead', 'about', 'dsl', 'safeguarding', 
    'key', 'pshe', 'pshc', 'pastor', 'wellbeing', 'protect', "staff", 
    "support", 'health', "faculties", "safety", "counsel", "find", "safe", 
    "policies", "send"// policy (but sometimes matches too much...)
]; 
// pdf

const visited = new Set();

// go over this whole function again, not fully gone over

// find  staff/team/contact links for a url
async function findContactLinks(baseUrl, homepageHtml, page, currentUrl = baseUrl, maxDepth = 6, currentDepth = 0) {
    if (visited.has(currentUrl) || currentDepth > maxDepth) return [];
    visited.add(currentUrl);

    let html = homepageHtml;

    if (currentDepth !== 0) {
        try {
            await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 20000 }); // ["domcontentloaded", "networkidle2"] (more robust?)
            html = await page.content();
        } catch (err) {
            console.error(`Failed to load nested page - ${currentUrl}: ${err.message}`);
            return [];
        }
    }


    const $ = cheerio.load(html || "");
    const anchors = $('a').toArray() || [];
    const foundLinks = new Set();


    // check all pdfs without checking keywords?

    // make sure share links dont pass through
    const begginingOfBaseUrl = baseUrl.match(/www\.[^\.]+/)?.[0]; // test this
    const altBaseUrl = baseUrl.replace(/^http(?!s)/, "https");
    

    for (const a of anchors) {
        const href = ($(a).attr('href') || "").toLowerCase();
        const title = ($(a).attr('title') || "").toLowerCase();
        const isPDF = href.includes('.pdf');


        if (!href) continue;

        // add 'communications'?? Curriculum? // chatgpt said: ''directory' aswell // "touch"

        const fullUrl = href.startsWith('http') ? href : new URL(href, currentUrl).href; // necessary?


        const matchesKeyword = keyWords.some(word => href.includes(word) || title.includes(word));
        const sameDomain = fullUrl.includes(begginingOfBaseUrl) && (fullUrl.startsWith(baseUrl) || fullUrl.startsWith(altBaseUrl)); // << is this whole thing needed? 

        if (matchesKeyword && (sameDomain || isPDF)) {
            foundLinks.add(isPDF ? ($(a).attr('href') || "") : fullUrl); // s3 urls are case sentitive (pdf may live on s3)

            try {
                // Fetch and parse nested page
                const childLinks = await findContactLinks(baseUrl, null, page, fullUrl, maxDepth, currentDepth + 1);
                for (const link of childLinks) {
                    foundLinks.add(link);
                }
            } catch (err) {
                console.error(`Failed to call findContactLinks for nested page - ${fullUrl}:`, err.message);
                continue;
            }
        }
    };

    return [...foundLinks];
};


module.exports = findContactLinks;