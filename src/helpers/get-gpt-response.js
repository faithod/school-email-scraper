const  OpenAI =require("openai");
const dotenv = require("dotenv");

dotenv.config();

const openAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

// this AI is wackkkkkkkkk
// its not geting the right names & roles - back to the drawing board
// might attempt this again later with a different AI model


// actuallyyy -- just use this to get names and emials after using selectors....
async function getGPTResponse(html) {

    const prompt = 
        `From the following html snippet - extract the staff member name, role and email, 
        return a JSON object with "name", "role", and "email" fields. 
        If any property is missing, return null for them. Respond ONLY with JSON, 
        but if all fields are null then return null.
        
        HTML: ${html}`

    const chat = await openAI.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "user", content: prompt },
        ],
    });

  console.log(chat.choices[0].message.content);

  return chat.choices[0].message.content;
}

// Only return what is already there, do not add to it. And make sure the name is an actual name.

// Make sure the name is an actual name, if there is no name return null for that field. 
// Make sure the name & roles are extracted straight from the snippet and not made up or fake.

module.exports = getGPTResponse;
