const axios = require('axios');
const cheerio = require('cheerio');

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
};


module.exports = findContactLinks;
