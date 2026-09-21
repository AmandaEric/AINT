// ==========================================
// GET ELEMENTS
// ==========================================

const timer = document.querySelector(".timer");
const startButton = document.querySelector(".start");

const objectiveButton = document.querySelector(".objective");
const semiButton = document.querySelector(".semi");
const qualitativeButton = document.querySelector(".qualitative");

const questionText = document.querySelector(".question-text");

const listenButton = document.querySelector(".listen");
const responseBox = document.querySelector(".response");
const evaluateButton = document.querySelector(".evaluate");

const evaluationBox = document.querySelector(".evaluation");


// ==========================================
// TIMER
// ==========================================

let seconds = 0;
let timerInterval = null;
let testRunning = false;

function updateTimer() {

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    timer.textContent =
        minutes + ":" +
        String(remainingSeconds).padStart(2, "0");
}


// ==========================================
// START / STOP TEST
// ==========================================

if (startButton) {

    startButton.addEventListener("click", function () {

        if (!testRunning) {

            // Start test
            testRunning = true;

            startButton.textContent = "Stop";

            // Enable question buttons
            if (objectiveButton) {
                objectiveButton.disabled = false;
            }

            if (semiButton) {
                semiButton.disabled = false;
            }

            if (qualitativeButton) {
                qualitativeButton.disabled = false;
            }

            // Start timer
            timerInterval = setInterval(function () {

                seconds++;
                updateTimer();

            }, 1000);

        } else {

            // Stop test
            testRunning = false;

            startButton.textContent = "Start";

            clearInterval(timerInterval);

            // Disable question buttons
            if (objectiveButton) {
                objectiveButton.disabled = true;
            }

            if (semiButton) {
                semiButton.disabled = true;
            }

            if (qualitativeButton) {
                qualitativeButton.disabled = true;
            }

            // Stop listening
            if (isListening && recognition) {
                recognition.stop();
            }

            if (listenButton) {
                listenButton.disabled = true;
            }

            if (evaluateButton) {
                evaluateButton.disabled = true;
            }
        }

    });

}


// ==========================================
// QUESTION BANK
// ==========================================

// These questions are saved in the browser.
let questions = JSON.parse(
    localStorage.getItem("aintQuestions")
) || {

    objective: [],

    semi: [],

    qualitative: []

};


// ==========================================
// TEMPORARY STUDENT QUESTION LIST
// ==========================================

// This is the list the AI is currently allowed
// to ask during a test.
//
// It is separate from the saved question bank.
let selectedQuestions = [];


// ==========================================
// SAVE QUESTIONS
// ==========================================

function saveQuestions() {

    localStorage.setItem(
        "aintQuestions",
        JSON.stringify(questions)
    );

}


// ==========================================
// ADD QUESTION
// ==========================================

function addQuestion(category, inputId) {

    const input = document.getElementById(inputId);

    if (!input) {
        return;
    }

    const question = input.value.trim();


    // Don't allow an empty question
    if (question === "") {

        alert("Please enter a question first.");

        return;
    }


    // Add question to the correct category
    questions[category].push(question);


    // Save it
    saveQuestions();


    // Clear the text box
    input.value = "";


    // Show updated questions
    displayQuestions();


    console.log("Question added:");
    console.log(question);

}


// ==========================================
// DISPLAY QUESTIONS
// ==========================================

function displayQuestions() {

    const objectiveList =
        document.getElementById("objectiveList");

    const semiList =
        document.getElementById("semiList");

    const qualitativeList =
        document.getElementById("qualitativeList");


    // --------------------------------------
    // OBJECTIVE
    // --------------------------------------

    if (objectiveList) {

        objectiveList.innerHTML = "";

        questions.objective.forEach(
            (question, index) => {

                const questionDiv =
                    document.createElement("div");

                questionDiv.className =
                    "saved-question";

                questionDiv.innerHTML = `
                    <p>${question}</p>

                    <button
                        onclick="deleteQuestion('objective', ${index})">
                        Delete
                    </button>
                `;

                objectiveList.appendChild(
                    questionDiv
                );

            }
        );

    }


    // --------------------------------------
    // SEMI-OBJECTIVE
    // --------------------------------------

    if (semiList) {

        semiList.innerHTML = "";

        questions.semi.forEach(
            (question, index) => {

                const questionDiv =
                    document.createElement("div");

                questionDiv.className =
                    "saved-question";

                questionDiv.innerHTML = `
                    <p>${question}</p>

                    <button
                        onclick="deleteQuestion('semi', ${index})">
                        Delete
                    </button>
                `;

                semiList.appendChild(
                    questionDiv
                );

            }
        );

    }


    // --------------------------------------
    // QUALITATIVE
    // --------------------------------------

    if (qualitativeList) {

        qualitativeList.innerHTML = "";

        questions.qualitative.forEach(
            (question, index) => {

                const questionDiv =
                    document.createElement("div");

                questionDiv.className =
                    "saved-question";

                questionDiv.innerHTML = `
                    <p>${question}</p>

                    <button
                        onclick="deleteQuestion('qualitative', ${index})">
                        Delete
                    </button>
                `;

                qualitativeList.appendChild(
                    questionDiv
                );

            }
        );

    }

}


// ==========================================
// DELETE QUESTION
// ==========================================

function deleteQuestion(category, index) {

    questions[category].splice(index, 1);

    saveQuestions();

    displayQuestions();

}


// ==========================================
// CLEAR ALL QUESTIONS
// ==========================================

function clearAllQuestions() {

    const answer =
        confirm(
            "Are you sure you want to delete ALL questions?"
        );


    if (!answer) {
        return;
    }


    questions = {

        objective: [],

        semi: [],

        qualitative: []

    };


    saveQuestions();

    displayQuestions();

}


// ==========================================
// ADMIN BUTTONS
// ==========================================

const objectiveAdd =
    document.getElementById("objectiveAdd");

const semiAdd =
    document.getElementById("semiAdd");

const qualitativeAdd =
    document.getElementById("qualitativeAdd");

const clearQuestions =
    document.getElementById("clearQuestions");


// Objective button
if (objectiveAdd) {

    objectiveAdd.addEventListener(
        "click",
        function () {

            addQuestion(
                "objective",
                "objectiveInput"
            );

        }
    );

}


// Semi-objective button
if (semiAdd) {

    semiAdd.addEventListener(
        "click",
        function () {

            addQuestion(
                "semi",
                "semiInput"
            );

        }
    );

}


// Qualitative button
if (qualitativeAdd) {

    qualitativeAdd.addEventListener(
        "click",
        function () {

            addQuestion(
                "qualitative",
                "qualitativeInput"
            );

        }
    );

}


// Clear button
if (clearQuestions) {

    clearQuestions.addEventListener(
        "click",
        clearAllQuestions
    );

}


// ==========================================
// LOAD SAVED QUESTIONS
// ==========================================

displayQuestions();


// ==========================================
// STUDENT QUESTION BUTTONS
// ==========================================

if (objectiveButton) {

    objectiveButton.addEventListener("click", function () {

        // Add objective questions
        addCategory("objective");

        // Ask a random question
        askNextQuestion();

    });

}


if (semiButton) {

    semiButton.addEventListener("click", function () {

        // Add semi-objective questions
        addCategory("semi");

        // Ask a random question
        askNextQuestion();

    });

}


if (qualitativeButton) {

    qualitativeButton.addEventListener("click", function () {

        // Add qualitative questions
        addCategory("qualitative");

        // Ask a random question
        askNextQuestion();

    });

}


// ==========================================
// ADD CATEGORY TO SELECTED QUESTIONS
// ==========================================

// THIS WAS THE MISSING PIECE.
// It connects the admin-saved question bank to the
// student-facing test by copying that category's saved
// questions into "selectedQuestions" - the pool
// askNextQuestion() actually pulls from.
function addCategory(category) {

    if (!questions[category]) {
        return;
    }

    if (questions[category].length === 0) {

        if (questionText) {

            questionText.textContent =
                "No " + category + " questions have been added yet. Ask your professor to add some on the admin page.";

        }

        return;
    }

    questions[category].forEach(function (question) {

        // Avoid adding the same question twice if a
        // button gets clicked more than once
        if (!selectedQuestions.includes(question)) {

            selectedQuestions.push(question);

        }

    });

    console.log("Added category:", category);
    console.log("Selected questions now:", selectedQuestions);

}


// ==========================================
// ASK NEXT QUESTION
// ==========================================

function askNextQuestion() {

    if (!questionText) {
        return;
    }

    // Make sure questions exist
    if (selectedQuestions.length === 0) {

        questionText.textContent =
            "No more questions available.";

        return;
    }


    // Pick random question
    const randomNumber =
        Math.floor(Math.random() * selectedQuestions.length);


    // Remove question from list
    // so it cannot be asked again
    const newQuestion =
        selectedQuestions.splice(randomNumber, 1)[0];


    // Display question
    questionText.textContent = newQuestion;


    // Speak the question out loud and animate the avatar's mouth
    speakQuestion(newQuestion);
    speak(newQuestion);


    // Enable response controls
    if (responseBox) {
        responseBox.disabled = false;
    }

    if (listenButton) {
        listenButton.disabled = false;
    }

    if (evaluateButton) {
        evaluateButton.disabled = false;
    }


    // Reset evaluation
    if (evaluationBox) {

        evaluationBox.innerHTML =
            "<p>Waiting for student response...</p>";

    }


    console.log("Question asked:");
    console.log(newQuestion);

    console.log("Questions remaining:");
    console.log(selectedQuestions);

}
// ==========================================
// TEXT TO SPEECH
// ==========================================

function speakQuestion(text) {

    // Make sure the browser supports text-to-speech
    if (!("speechSynthesis" in window)) {

        alert("Text-to-speech is not supported by this browser.");

        return;
    }


    // Stop anything currently being spoken
    speechSynthesis.cancel();


    // Create the speech
    const speech = new SpeechSynthesisUtterance(text);


    // Voice settings
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;


    // Speak the question
    speechSynthesis.speak(speech);
}

// ==========================================
// SPEECH RECOGNITION
// ==========================================

let recognition = null;
let isListening = false;

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";


    // Microphone starts
    recognition.onstart = function () {

        isListening = true;

        if (listenButton) {
            listenButton.textContent = "Stop Listening";
        }

    };


    // Speech detected
    recognition.onresult = function (event) {

        let finalTranscript = "";

        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            const transcript =
                event.results[i][0].transcript;

            if (event.results[i].isFinal) {

                finalTranscript += transcript + " ";

            }

        }


        if (finalTranscript && responseBox) {

            responseBox.value += finalTranscript;

        }

    };


    // Microphone stops
    recognition.onend = function () {

        isListening = false;

        if (listenButton) {
            listenButton.textContent = "Start Listening";
        }

    };


    // Microphone error
    recognition.onerror = function () {

        isListening = false;

        if (listenButton) {
            listenButton.textContent = "Start Listening";
        }

        if (evaluationBox) {

            evaluationBox.innerHTML =
                "<p>There was a problem listening to the response. Please try again or type the response.</p>";

        }

    };

}


// ==========================================
// LISTEN BUTTON
// ==========================================

if (listenButton) {

    listenButton.addEventListener("click", function () {

        if (!recognition) {

            if (evaluationBox) {

                evaluationBox.innerHTML =
                    "<p>Speech recognition is not supported by this browser. Please type your response.</p>";

            }

            return;
        }


        if (!isListening) {

            recognition.start();

        } else {

            recognition.stop();

        }

    });

}


// ==========================================
// TALKING AVATAR
// ==========================================

const mouth = document.querySelector(".mouth");

const vowels = "aeiou";


function speak(text) {

    if (!mouth) {
        return;
    }

    let i = 0;

    const interval = setInterval(function () {

        if (i >= text.length) {

            clearInterval(interval);

            mouth.classList.remove("vowel");

            return;
        }


        const letter =
            text[i].toLowerCase();


        if (vowels.includes(letter)) {

            mouth.classList.add("vowel");

        } else {

            mouth.classList.remove("vowel");

        }


        i++;

    }, 200);

}


// ==========================================
// AI EVALUATION + FOLLOW-UP (GEMINI)
// ==========================================
 
const BACKEND_URL = "http://localhost:3000";
 
// Tracks the category of whichever question is currently displayed,
// so the follow-up request can tell Gemini what kind of question this is.
let currentCategory = null;
 
if (evaluateButton) {
 
    evaluateButton.addEventListener("click", async function () {
 
        const answer =
            responseBox.value.trim();
 
 
        if (answer === "") {
 
            evaluationBox.innerHTML =
                "<p>Please provide an answer before evaluating.</p>";
 
            return;
        }
 
 
        evaluationBox.innerHTML =
            "<p>Thinking of a follow-up question...</p>";
 
        evaluateButton.disabled = true;
 
 
        try {
 
            const response = await fetch(
                BACKEND_URL + "/api/generate-followup",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        originalQuestion: questionText.textContent,
                        studentResponse: answer,
                        category: currentCategory,
                    }),
                }
            );
 
            if (!response.ok) {
                throw new Error("Server responded with " + response.status);
            }
 
            const data = await response.json();
 
 
            if (data.needsFollowUp && data.followUpQuestion) {
 
                // Show and ask the follow-up question
                evaluationBox.innerHTML = `
                    <h4>Follow-up Question</h4>
                    <p>${data.followUpQuestion}</p>
                `;
 
                questionText.textContent = data.followUpQuestion;
 
                // Clear the response box for the new answer
                responseBox.value = "";
 
                // Speak it and animate the avatar
                speakQuestion(data.followUpQuestion);
                speak(data.followUpQuestion);
 
            } else {
 
                evaluationBox.innerHTML = `
                    <h4>AI Evaluation</h4>
                    <p><strong>Result:</strong> Response received - no follow-up needed.</p>
                `;
 
                evaluateButton.disabled = true;
 
            }
 
        } catch (err) {
 
            console.error(err);
 
            evaluationBox.innerHTML =
                "<p>Something went wrong generating a follow-up question. Is the backend running?</p>";
 
        } finally {
 
            evaluateButton.disabled = false;
 
        }
 
    });

}