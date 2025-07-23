const axios = require('axios');
const cheerio = require('cheerio');

const keyWords = [
    'staff', 'team', 'contact', 'lead', 'about', 'dsl', 'safeguarding', 
    'key', 'pshe', 'pshc', 'pastor', 'wellbeing', 'protection', "staff", 
    "support", 'health', "faculties", "safety", "counsel", "find", "safe", 
    "policies", "send"
]; 
// pdf


// find  staff/team/contact links for a url
// improvement: this does check deep enough
async function findContactLinks(baseUrl, homepageHtml) {
    const $ = cheerio.load(homepageHtml);
    const anchors = $('a').toArray() || [];
    const foundLinks = new Set();


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
                foundLinks.add(fullUrl);

                // does this work? >
                // Fetch and parse nested page
                try {
                    const { data: nestedHtml } = await axios.get(fullUrl, { timeout: 10000 });

                    const $$ = cheerio.load(nestedHtml);
                    const nestedLinks = $$('a').toArray();

                    for (const nestedLink of nestedLinks) {
                        const nestedHref = ($$(nestedLink).attr('href') || "").toLowerCase();
                        const nestedTitle = ($$(nestedLink).attr('title') || "").toLowerCase();

                        if (!nestedHref) continue;

                        if (keyWords.some(word => nestedHref.includes(word) || nestedTitle.includes(word))) {
                            const fullUrl2 = nestedHref.startsWith('http') ? nestedHref : new URL(nestedHref, fullUrl).href; // should it be baseUrl?
                            if (fullUrl2.includes(begginingOfBaseUrl) && (fullUrl2.startsWith(baseUrl) || fullUrl2.startsWith(altBaseUrl))) {
                                foundLinks.add(fullUrl2);

                                /* 
                                    go 1 more level deep since recursive function isn't working... this makes it take ages though..
                                    this was needed to find: http://www.hampsteadschool.org.uk/_site/data/files/policies/c7c36782ccb9a1c712ec0546164e3e5b.pdf

                                    (this makes it very slow)
                                */
                                    try {
                                        const res = await axios.get(fullUrl2, { timeout: 10000 });
                                        const $$$ = cheerio.load(res.data);
                                        const deeperLinks = $$$('a').toArray();

                                        for (const deeperLink of deeperLinks) {
                                            const href3 = ($$$(deeperLink).attr('href') || "").toLowerCase();
                                            const title3 = ($$$(deeperLink).attr('title') || "").toLowerCase();

                                            if (!href3) continue;

                                            if (keyWords.some(word => href3.includes(word) || title3.includes(word))) {
                                                const fullUrl3 = href3.startsWith('http') ? href3 : new URL(href3, fullUrl2).href; // should it be baseUrl?
                                                if (fullUrl3.includes(begginingOfBaseUrl) && (fullUrl3.startsWith(baseUrl) || fullUrl3.startsWith(altBaseUrl))) {
                                                    foundLinks.add(fullUrl3);
                                                }
                                            }
                                        }
                                    } catch (err) {
                                        console.error(`Failed to load nested page (3 levels deep): ${fullUrl2}`, err.message);
                                        continue;
                                    }
                                /* */
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

    return [...foundLinks];
};


module.exports = findContactLinks;
