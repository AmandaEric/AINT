
import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());


// ==========================================
// OPENAI
// ==========================================

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


// ==========================================
// TEST API
// ==========================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "AINT AI API is working!"
    });

});


// ==========================================
// AI FOLLOW-UP
// ==========================================

app.post("/api/generate-followup", async (req, res) => {

    try {

        const {
            originalQuestion,
            studentResponse,
            category
        } = req.body;


        console.log("");
        console.log("================================");
        console.log("AI EVALUATION");
        console.log("================================");

        console.log("Question:", originalQuestion);
        console.log("Student:", studentResponse);
        console.log("Category:", category);


        if (!originalQuestion || !studentResponse) {

            return res.status(400).json({
                error: "Question and student response are required."
            });

        }


        const prompt = `
You are an AI evaluator for a student performance evaluation system.

The student was asked this question:

${originalQuestion}

The question category is:

${category}

The student answered:

${studentResponse}

Evaluate the student's answer.

If the student understands the question well,
do NOT ask another question.

If the student needs to explain their answer more,
ask ONE helpful follow-up question.

Do not give the student the answer.

Return ONLY JSON.

Use exactly this format:

{
    "needsFollowUp": true,
    "evaluation": "Short explanation of the student's answer.",
    "followUpQuestion": "One helpful follow-up question.",
    "score": 0
}

If no follow-up is needed:

{
    "needsFollowUp": false,
    "evaluation": "Short explanation of the student's answer.",
    "followUpQuestion": "",
    "score": 100
}

The score should be between 0 and 100.
`;


        const response = await client.responses.create({

            model: "gpt-5.6",

            input: prompt

        });


        const text = response.output_text;


        console.log("AI RESPONSE:");
        console.log(text);


        let result;


        try {

            result = JSON.parse(text);

        } catch (error) {

            console.log("Could not read AI JSON.");

            result = {

                needsFollowUp: true,

                evaluation: text,

                followUpQuestion:
                    "Can you explain your answer in more detail?",

                score: 0

            };

        }


        res.json(result);


    } catch (error) {

        console.error("AI ERROR:");
        console.error(error);


        res.status(500).json({

            error: "AI request failed.",

            details: error.message

        });

    }

});


// ==========================================
// START SERVER
// ==========================================

app.listen(3000, () => {

    console.log("");
    console.log("================================");
    console.log("AINT AI API IS RUNNING");
    console.log("================================");
    console.log("http://localhost:3000");
    console.log("");
    console.log("AI endpoint:");
    console.log("http://localhost:3000/api/generate-followup");
    console.log("================================");

});
