const OpenAI = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const openAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

// scrapped :
// this AI model isn't great, it's not doing what I want it to do
// its not geting the right names & roles (also: didn't identify names correctly & was making up emails)
// I could attempt this again another time with a different AI model
// also you are limited per minute so I could delay a minute after a certain amount of requests


// Validate Page Content with AI - using AI to get names and emails after using selectors....
async function getGPTResponse(html) {

    const prompt = 
        `From the following html snippet - extract the staff member name, role and email, 
        return a JSON object with "name", "role", and "email" fields. 
        If any property is missing, return null for them. Respond ONLY with JSON, 
        but if all property fields are null then return null.
        
        HTML: ${html}`

    const chat = await openAI.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "user", content: prompt },
        ],
    });

  return chat.choices[0].message.content;
}

// Make sure the name is an actual name, if there is no name return null for that field. 
// Make sure the name & roles are extracted straight from the snippet and not made up or fake.

module.exports = getGPTResponse;
