import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(express.json());


const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


app.post("/api/generate-followup", async (req, res) => {

    try {

        const {
            originalQuestion,
            studentResponse,
            category
        } = req.body;


        const prompt = `
You are an AI student evaluator.

Original question:
${originalQuestion}

Student response:
${studentResponse}

Question category:
${category}

Decide whether the student needs a follow-up question.

If a follow-up is needed, create one question.

Return JSON with:
{
    "needsFollowUp": true or false,
    "followUpQuestion": "question here"
}
`;


        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt
        });


        res.json({
            result: response.text
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Gemini request failed"
        });

    }

});


app.listen(3000, () => {

    console.log(
        "AINT backend running at http://localhost:3000"
    );

});