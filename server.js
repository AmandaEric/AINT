const express = require("express");
const cors = require("cors");
require("dotenv").config();

const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

// Reads OPENAI_API_KEY from a .env file (never from code).
// Create a file named ".env" in this folder with one line:
//   OPENAI_API_KEY=your-new-key-here
// and make sure ".env" is in your .gitignore.
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
    res.send("AINT server is running!");
});


// ------------------------------------------
// AVATAR GENERATION
// Called once when the student page loads, to get the AI's avatar image.
// ------------------------------------------
app.post("/api/generate-avatar", async (req, res) => {
    try {
        const characterDescription = req.body.characterDescription;

        const prompt = `
Create a premium glossy 3D animated character avatar.

Character description:
${characterDescription}

Requirements:
- Friendly and approachable appearance
- Polished 3D animated-film aesthetic
- Smooth, simplified 3D forms
- Glossy but natural skin
- Detailed, stylized hair
- Clearly visible face
- Neutral, closed-mouth expression
- From the waist up
- Centered composition
- Clean background
- No classroom background
- No text
- No logos
`;

        const response = await client.images.generate({
            model: "gpt-image-2",
            prompt: prompt,
            size: "1024x1024"
        });

        res.json({
            success: true,
            image: response.data[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// ------------------------------------------
// EVALUATE STUDENT RESPONSE + GENERATE FOLLOW-UP
// This is the endpoint script.js was calling that didn't exist yet.
// It sends the original question + the student's answer to the model,
// and asks it to decide whether a follow-up question is warranted.
// ------------------------------------------
app.post("/api/generate-followup", async (req, res) => {
    try {
        const { originalQuestion, studentResponse, category } = req.body;

        if (!originalQuestion || !studentResponse) {
            return res.status(400).json({
                success: false,
                error: "originalQuestion and studentResponse are required."
            });
        }

        const systemPrompt = `
You are an oral examiner listening to a student's spoken answer.
Question category: ${category || "unspecified"}.

Decide whether the student's answer is complete and correct enough to
move on, or whether it needs a follow-up question to probe deeper or
clear up something vague/incorrect.

Respond with ONLY a JSON object (no markdown fences, no extra text),
in exactly this shape:
{
  "needsFollowUp": true or false,
  "followUpQuestion": "the follow-up question text, or an empty string if none is needed"
}
`;

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content:
                        `Original question: ${originalQuestion}\n` +
                        `Student's answer: ${studentResponse}`
                }
            ]
        });

        const raw = completion.choices[0].message.content.trim();
        const cleaned = raw.replace(/```json|```/g, "").trim();

        let data;
        try {
            data = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("Model did not return valid JSON:", raw);
            throw new Error("Could not parse model response as JSON.");
        }

        res.json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


app.listen(3000, () => {
    console.log("AINT server running at http://localhost:3000");
});