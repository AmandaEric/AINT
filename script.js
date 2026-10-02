// ==========================================
// ELEMENTS
// ==========================================

const el = {

    // Timer
    timer: document.querySelector(".timer"),
    startButton: document.querySelector(".start"),

    // Question category buttons
    objective: document.querySelector(".objective"),
    semiButton: document.querySelector(".semi"),
    qualatativeButton: document.querySelector(".qualitative"),

    // Question
    questionText: document.querySelector(".question-text"),

    // Student response
    listenButton: document.querySelector(".listen"),
    responseBox: document.querySelector(".response"),

    // AI evaluation
    evaluateButton: document.querySelector(".evaluate"),
    evaluationBox: document.querySelector(".evaluation"),

    // Avatar
    mouth: document.getElementById("ai-avatar"),

    // Admin question lists
    objectiveList: document.getElementById("objectiveList"),
    semiList: document.getElementById("semiList"),
    qualitativeList: document.getElementById("qualitativeList"),

    // Clear all questions
    clearQuestions: document.querySelector(".clearQuestion"),

    // Admin question inputs
    objectiveInput: document.getElementById("objectiveInput"),
    semiInput: document.getElementById("semiInput"),
    qualitativeInput: document.getElementById("qualitativeInput"),

    // Admin add buttons
    objectiveAdd: document.getElementById("objectiveAdd"),
    semiAdd: document.getElementById("semiAdd"),
    qualitativeAdd: document.getElementById("qualitativeAdd"),

    studentName: document.querySelector(".student-name"),
};

// ==========================================
// HELPER FUNCTION
// ==========================================

function on(element, eventName, handler) {

    if (element) {
        element.addEventListener(eventName, handler);
    }

}

// ==========================================
// BACKEND
// ==========================================

const BACKEND_URL = "http://localhost:3000";

// ==========================================
// STATE
// ==========================================

const state = {

    // Timer
    seconds: 0,
    timerInterval: null,
    testRunning: false,

    // Question bank
    questions: JSON.parse(
        localStorage.getItem("aintQuestions")
    ) || {
        objective: [],
        semi: [],
        qualitative: []
    },

    // Questions currently available to student
    selectedQuestions: [],

    // Speech recognition
    recognition: null,
    isListening: false
};


// Current question category
let currentCategory = null;


// ==========================================
// EXAM LOG (everything sent to the AI for grading)
// ==========================================

// log     = one entry per question asked
//           { category, question, exchanges: [{ question, answer }] }
// current = the entry for the question on screen right now
const exam = {
    log: [],
    current: null,
    submitted: false
};


// Save one answer under the current question.
// "question" is whatever is on screen, which is the follow-up
// question if the AI asked one.
function recordAnswer(question, answer) {

    if (!exam.current || !answer) {
        return;
    }

    const last =
        exam.current.exchanges[
            exam.current.exchanges.length - 1
        ];

    // Don't save the same answer twice
    if (last && last.question === question && last.answer === answer) {
        return;
    }

    exam.current.exchanges.push({
        question: question,
        answer: answer
    });
}

// ==========================================
// TIMER
// ==========================================

function updateTimerDisplay() {

    if (!el.timer) {
        return;
    }

    const minutes = Math.floor(
        state.seconds / 60
    );

    const seconds = state.seconds % 60;

    el.timer.textContent =
        `${minutes}:${String(seconds).padStart(2, "0")}`;
}


function startTimer() {

    state.testRunning = true;

    if (el.startButton) {
        el.startButton.textContent = "Stop Test";
    }

    setQuestionButtonsEnabled(true);

    // Allow the student to type an answer
    if (el.responseBox) {
        el.responseBox.disabled = false;
    }

    // Allow speech recognition
    if (el.listenButton) {
        el.listenButton.disabled = false;
    }

    state.timerInterval = setInterval(() => {

        state.seconds++;

        updateTimerDisplay();

    }, 1000);
}


function stopTimer() {

    state.testRunning = false;

    if (el.startButton) {
        el.startButton.textContent = "Start Test";
    }

    clearInterval(state.timerInterval);

    setQuestionButtonsEnabled(false);

    if (
        state.isListening &&
        state.recognition
    ) {
        state.recognition.stop();
    }

    if (el.listenButton) {
        el.listenButton.disabled = true;
    }

    if (el.evaluateButton) {
        el.evaluateButton.disabled = true;
    }
}


function setQuestionButtonsEnabled(enabled) {

    if (el.objective) {
        el.objective.disabled = !enabled;
    }

    if (el.semiButton) {
        el.semiButton.disabled = !enabled;
    }

    if (el.qualatativeButton) {
        el.qualatativeButton.disabled = !enabled;
    }
}


// Start / Stop button
on(
    el.startButton,
    "click",
    async () => {

        // ---------- START ----------
        if (!state.testRunning) {

            if (
                el.studentName &&
                !el.studentName.value.trim()
            ) {
                alert("Please enter your name first.");
                return;
            }

            // Fresh attempt
            exam.log = [];
            exam.current = null;
            exam.submitted = false;

            state.seconds = 0;
            state.selectedQuestions = [];

            updateTimerDisplay();

            startTimer();

            return;
        }


        // ---------- STOP = FINISH AND SUBMIT ----------
        if (
            !confirm(
                "Finish the exam and submit it for grading?"
            )
        ) {
            return;
        }

        // Save an answer that was typed or spoken
        // but never sent with the Evaluate button
        if (el.responseBox && el.questionText) {

            recordAnswer(
                el.questionText.textContent,
                el.responseBox.value.trim()
            );

        }

        stopTimer();

        // Stop the avatar mid-sentence
        if ("speechSynthesis" in window) {
            speechSynthesis.cancel();
        }

        await submitExam();

    }
);


// ==========================================
// SUBMIT EXAM FOR GRADING
// ==========================================

async function submitExam() {

    if (exam.submitted) {
        return;
    }

    if (exam.log.length === 0) {

        if (el.evaluationBox) {

            el.evaluationBox.innerHTML =
                "<p>No questions were answered, so nothing was submitted.</p>";

        }

        return;
    }

    if (el.evaluationBox) {

        el.evaluationBox.innerHTML =
            "<p>Submitting your exam for grading...</p>";

    }

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/grade-exam`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    studentName:
                        el.studentName
                            ? el.studentName.value.trim()
                            : "",

                    durationSeconds:
                        state.seconds,

                    log:
                        exam.log

                })

            }
        );

        if (!response.ok) {

            throw new Error(
                `Server responded with ${response.status}`
            );

        }

        exam.submitted = true;

        if (el.questionText) {

            el.questionText.textContent =
                "The exam is finished.";

        }

        if (el.evaluationBox) {

            el.evaluationBox.innerHTML = `

                <h4>Exam submitted</h4>

                <p>
                    Thank you. Your professor will share your results.
                </p>

            `;

        }

    } catch (error) {

        console.error(
            "SUBMIT ERROR:",
            error
        );

        if (el.evaluationBox) {

            el.evaluationBox.innerHTML = `

                <h4>Submission problem</h4>

                <p>
                    Your exam was not submitted. Keep this page open.
                </p>

                <button
                    type="button"
                    onclick="submitExam()">

                    Try again

                </button>

            `;

        }

    }
}

// Make submitExam available
// to the generated "Try again" button
window.submitExam =
    submitExam;


// ==========================================
// QUESTION BANK
// ==========================================


// Save questions to browser
function saveQuestions() {

    localStorage.setItem(
        "aintQuestions",
        JSON.stringify(state.questions)
    );
}


// Add a question
function addQuestion(category, input) {

    if (!input) {
        return;
    }

    const question = input.value.trim();

    if (question === "") {

        alert("Please enter a question.");

        return;
    }


    // Add question
    state.questions[category].push(question);


    // Save question
    saveQuestions();


    // Clear input
    input.value = "";


    // Immediately display question
    displayQuestions();


    console.log(
        "Added question:",
        question
    );
}


// Delete one question
function deleteQuestion(category, index) {

    state.questions[category].splice(
        index,
        1
    );

    saveQuestions();

    displayQuestions();
}


// Delete all questions
function clearAllQuestions() {

    const confirmed = confirm(
        "Are you sure you want to delete ALL questions?"
    );

    if (!confirmed) {
        return;
    }


    state.questions = {

        objective: [],

        semi: [],

        qualitative: []

    };


    saveQuestions();

    displayQuestions();
}


// Display all question categories
function displayQuestions() {

    displayCategory(
        el.objectiveList,
        "objective"
    );

    displayCategory(
        el.semiList,
        "semi"
    );

    displayCategory(
        el.qualitativeList,
        "qualitative"
    );
}


// Display one category
function displayCategory(
    listElement,
    category
) {

    if (!listElement) {
        return;
    }


    // Clear current display
    listElement.innerHTML = "";


    // Get questions
    const questions =
        state.questions[category];


    // Display each question
    questions.forEach(
        (question, index) => {

            const row =
                document.createElement("div");

            row.className =
                "saved-question";


            row.innerHTML = `

                <p>${question}</p>

                <button
                    type="button"
                    onclick="deleteQuestion('${category}', ${index})">

                    Delete

                </button>

            `;


            listElement.appendChild(row);

        }
    );
}


// Make deleteQuestion available
// to the generated buttons
window.deleteQuestion =
    deleteQuestion;


// ==========================================
// ADMIN BUTTONS
// ==========================================


// Objective Add
on(
    el.objectiveAdd,
    "click",
    () => {

        addQuestion(
            "objective",
            el.objectiveInput
        );

    }
);


// Semi-Objective Add
on(
    el.semiAdd,
    "click",
    () => {

        addQuestion(
            "semi",
            el.semiInput
        );

    }
);


// Qualitative Add
on(
    el.qualitativeAdd,
    "click",
    () => {

        addQuestion(
            "qualitative",
            el.qualitativeInput
        );

    }
);


// Clear all
on(
    el.clearQuestions,
    "click",
    clearAllQuestions
);


// Display saved questions
// when page loads
displayQuestions();


// ==========================================
// STUDENT QUESTION SYSTEM
// ==========================================


// Add an entire category
function addCategory(category) {

    const questions =
        state.questions[category];


    if (
        !questions ||
        questions.length === 0
    ) {

        if (el.questionText) {

            el.questionText.textContent =
                `No questions available in the ${category} category.`;

        }

        return;
    }


    // Add questions that have not
    // already been selected
    questions.forEach(
        question => {

            if (
                !state.selectedQuestions
                    .includes(question)
            ) {

                state.selectedQuestions.push(
                    question
                );

            }

        }
    );
}


// Ask next question
function askNextQuestion() {

    if (!el.questionText) {
        return;
    }


    if (
        state.selectedQuestions.length === 0
    ) {

        el.questionText.textContent =
            "No more questions available.";

        return;
    }


    // Save an answer that was typed or spoken
    // for the previous question but never evaluated
    if (exam.current && el.responseBox) {

        recordAnswer(
            el.questionText.textContent,
            el.responseBox.value.trim()
        );

    }


    // Clear the response box for the new question
    if (el.responseBox) {
        el.responseBox.value = "";
    }


    // Pick random question
    const randomIndex =
        Math.floor(
            Math.random() *
            state.selectedQuestions.length
        );


    const question =
        state.selectedQuestions.splice(
            randomIndex,
            1
        )[0];


    // Start a new entry in the exam log
    exam.current = {
        category: currentCategory,
        question: question,
        exchanges: []
    };

    exam.log.push(exam.current);


    // Display question
    el.questionText.textContent =
        question;


    // Speak question
    speakQuestion(question);


    // Animate mouth
    // animateMouth(question);


    // Enable response controls
    if (el.responseBox) {
        el.responseBox.disabled = false;
    }

    if (el.listenButton) {
        el.listenButton.disabled = false;
    }

    if (el.evaluateButton) {
        el.evaluateButton.disabled = false;
    }


    // Reset evaluation
    if (el.evaluationBox) {

        el.evaluationBox.innerHTML =
            "<p>Waiting for student response...</p>";

    }
}


// Objective button
on(
    el.objective,
    "click",
    () => {

        currentCategory =
            "objective";

        addCategory(
            "objective"
        );

        askNextQuestion();

    }
);


// Semi-objective button
on(
    el.semiButton,
    "click",
    () => {

        currentCategory =
            "semi";

        addCategory(
            "semi"
        );

        askNextQuestion();

    }
);


// Qualitative button
on(
    el.qualatativeButton,
    "click",
    () => {

        currentCategory =
            "qualitative";

        addCategory(
            "qualitative"
        );

        askNextQuestion();

    }
);


// ==========================================
// TEXT TO SPEECH
// ==========================================

let currentUtterance = null;

function speakQuestion(text) {

    if (!("speechSynthesis" in window)) {
        alert("Text-to-speech is not supported by this browser.");
        return;
    }

    speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    currentUtterance = speech;

    // Ignore events from an old utterance that got cancelled
    speech.onstart = function () {
        if (currentUtterance !== speech) return;
        startTalkingAnimation(text);
    };

    // Fires at each word (where the browser/voice supports it)
    speech.onboundary = function (event) {
        if (currentUtterance !== speech) return;
        handleBoundary(event, text, speech.rate);
    };

    speech.onend = function () {
        if (currentUtterance !== speech) return;
        stopTalkingAnimation();
    };

    speech.onerror = function () {
        if (currentUtterance !== speech) return;
        stopTalkingAnimation();
    };

    speechSynthesis.speak(speech);
}
function normalizeMathForSpeech(text) {
    return text
        .replace(/\+/g, " plus ")
        .replace(/-/g, " minus ")
        .replace(/\*/g, " times ")
        .replace(/÷/g, " divided by ")
        .replace(/\//g, " divided by ")
        .replace(/=/g, " equals ")
        .replace(/%/g, " percent ")
        .replace(/\^/g, " to the power of ")
        .replace(/√/g, " square root of ")
        .replace(/\s+/g, " ")
        .trim();
}

// ==========================================
// MOUTH ANIMATION + BLINKING
// ==========================================

const FRAME_PATH = "ai_speech_frames/";

const FRAMES = {
    a: FRAME_PATH + "A(ah).png",
    e: FRAME_PATH + "E(ee).png",
    i: FRAME_PATH + "I(ee).png",
    l: FRAME_PATH + "L(el).png",
    m: FRAME_PATH + "M(mmm).png",
    o: FRAME_PATH + "O(oh).png",
    u: FRAME_PATH + "U(oo).png",
    smile: FRAME_PATH + "smile.png",
    eyesClosed: FRAME_PATH + "eyes_closed.png",
    idle: FRAME_PATH + "eyes_open_neutral.png",
};
const mouthImg = el.mouth;
// Preload every frame so there is no flicker the first time one shows
Object.values(FRAMES).forEach(function (src) {
    const img = new Image();
    img.src = src;
});

let isTalking = false;
let mouthTimers = [];      // timeouts for the current word / fallback timeline
let boundaryMode = false;  // true once the browser sends word-boundary events
let lastBoundaryTime = 0;
let lastWordDuration = 300;

function showFrame(key) {
    if (mouthImg) {
        mouthImg.src = FRAMES[key];
    }
}

function clearMouthTimers() {
    mouthTimers.forEach(clearTimeout);
    mouthTimers = [];
}


// ------------------------------------------
// LETTERS -> MOUTH SHAPES
// ------------------------------------------

// Turns one word into a list of mouth shapes. Sounds that look the
// same on the lips share a frame:
//   M  = m, b, p (lips closed)
//   L  = l, n, t, d, r, th (tongue visible)
//   U  = oo, w, q (rounded, small)
//   O  = o, ow, oa, ou, sh, ch (rounded, open)
//   E  = ee, ea, ie, e
//   A  = a, ai, ay
//   I  = i, y
//   smile = everything else (s, k, f, g, ...)
function wordToShapes(word) {

    let w = word.toLowerCase().replace(/[^a-z]/g, "");

    // Silent trailing "e" (like "make", "time")
    if (w.length > 3 && w.endsWith("e") && !"aeiouy".includes(w[w.length - 2])) {
        w = w.slice(0, -1);
    }

    const shapes = [];
    let i = 0;

    while (i < w.length) {

        const two = w.substr(i, 2);
        const c = w[i];
        let shape;
        let step = 1;

        if (["ee", "ea", "ie", "ei"].includes(two)) { shape = "e"; step = 2; }
        else if (["oo", "ew", "ue"].includes(two))  { shape = "u"; step = 2; }
        else if (["oa", "ow", "ou"].includes(two))  { shape = "o"; step = 2; }
        else if (["ai", "ay"].includes(two))        { shape = "a"; step = 2; }
        else if (two === "th")                      { shape = "l"; step = 2; }
        else if (["sh", "ch", "zh"].includes(two))  { shape = "o"; step = 2; }
        else if ("aeiou".includes(c))               { shape = c; }
        else if (c === "y")                         { shape = i === 0 ? "smile" : "i"; }
        else if ("wq".includes(c))                  { shape = "u"; }
        else if ("mbp".includes(c))                 { shape = "m"; }
        else if ("lntdr".includes(c))               { shape = "l"; }
        else                                        { shape = "smile"; }

        // Skip repeats so the mouth doesn't flicker on the same frame
        if (shapes[shapes.length - 1] !== shape) {
            shapes.push(shape);
        }

        i += step;
    }

    return shapes;
}


// ------------------------------------------
// MAIN MODE: sync to word boundaries
// ------------------------------------------

function handleBoundary(event, text, rate) {

    // Some browsers report other boundary types too - only use words
    if (event.name && event.name !== "word") {
        return;
    }

    // First boundary: the browser supports it, so drop the fallback timeline
    if (!boundaryMode) {
        boundaryMode = true;
    }

    clearMouthTimers();

    // Figure out which word is being spoken
    let word;

    if (event.charLength) {
        word = text.substr(event.charIndex, event.charLength);
    } else {
        const match = text.slice(event.charIndex).match(/^[\w']+/);
        word = match ? match[0] : "";
    }

    // Use the time since the last word as the estimate for this one
    const now = performance.now();

    if (lastBoundaryTime) {
        lastWordDuration = Math.min(Math.max(now - lastBoundaryTime, 120), 700);
    }

    lastBoundaryTime = now;

    const shapes = wordToShapes(word);

    if (shapes.length === 0) {
        return;
    }

    // Spread the shapes across the word, but not too fast or too slow
    const step = Math.min(Math.max(lastWordDuration / shapes.length, 60), 140);

    shapes.forEach(function (shape, index) {
        mouthTimers.push(setTimeout(function () {
            if (isTalking) showFrame(shape);
        }, index * step));
    });

    // Close the mouth briefly at the end of the word; the next
    // boundary event cancels this if another word follows right away
    mouthTimers.push(setTimeout(function () {
        if (isTalking) showFrame("idle");
    }, shapes.length * step + 30));
}


// ------------------------------------------
// FALLBACK: some voices never send boundary events
// ------------------------------------------

function playFallbackTimeline(text) {

    const SHAPE_MS = 75;
    const SPACE_MS = 90;
    const PUNCT_MS = 250;

    let time = 0;

    // Split into words and punctuation/spaces, keeping the separators
    const parts = text.split(/([\s,.;:?!]+)/);

    parts.forEach(function (part) {

        if (part === "") return;

        if (/^[\s,.;:?!]+$/.test(part)) {

            const pause = /[,.;:?!]/.test(part) ? PUNCT_MS : SPACE_MS;
            const at = time;

            mouthTimers.push(setTimeout(function () {
                if (isTalking && !boundaryMode) showFrame("idle");
            }, at));

            time += pause;
            return;
        }

        wordToShapes(part).forEach(function (shape) {

            const at = time;

            mouthTimers.push(setTimeout(function () {
                if (isTalking && !boundaryMode) showFrame(shape);
            }, at));

            time += SHAPE_MS;
        });
    });
}


// ------------------------------------------
// START / STOP TALKING
// ------------------------------------------

function startTalkingAnimation(text) {

    if (!mouthImg) {
        return;
    }

    clearMouthTimers();

    isTalking = true;
    boundaryMode = false;
    lastBoundaryTime = 0;
    lastWordDuration = 300;

    // Runs until a real boundary event shows up (then boundaryMode
    // takes over and this timeline stops updating the image)
    playFallbackTimeline(text);
}

function stopTalkingAnimation() {

    clearMouthTimers();

    isTalking = false;
    boundaryMode = false;

    showFrame("idle");
}


// ------------------------------------------
// IDLE FACE + BLINKING
// ------------------------------------------

showFrame("idle");

function scheduleBlink() {

    // Blink every 2.5 - 6 seconds
    const delay = 2500 + Math.random() * 3500;

    setTimeout(function () {

        // Only blink when not talking (mouth frames have their own eyes)
        if (!isTalking) {

            showFrame("eyesClosed");

            setTimeout(function () {
                if (!isTalking) showFrame("idle");
            }, 140);
        }

        scheduleBlink();

    }, delay);
}

scheduleBlink();


// ==========================================
// SPEECH TO TEXT
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition) {

    state.recognition =
        new SpeechRecognition();


    state.recognition.continuous =
        true;


    state.recognition.interimResults =
        true;


    state.recognition.lang =
        "en-US";


    state.recognition.onstart =
        () => {

            state.isListening =
                true;

            if (el.listenButton) {

                el.listenButton.textContent =
                    "Stop Listening";

            }

        };


    state.recognition.onend =
        () => {

            state.isListening =
                false;

            if (el.listenButton) {

                el.listenButton.textContent =
                    "Start Listening";

            }

        };


    state.recognition.onerror = (event) => {

        console.error("Speech recognition error:", event.error);

        state.isListening = false;

        if (el.listenButton) {
            el.listenButton.textContent = "Start Listening";
        }

        if (el.evaluationBox) {
            el.evaluationBox.innerHTML =
                `<p>Speech recognition error: ${event.error}</p>`;
        }
    };


    state.recognition.onresult =
        (event) => {

            let finalTranscript =
                "";


            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                if (
                    event.results[i].isFinal
                ) {

                    finalTranscript +=
                        event.results[i][0]
                            .transcript + " ";

                }

            }


            if (
                finalTranscript &&
                el.responseBox
            ) {

                el.responseBox.value +=
                    finalTranscript;

            }

        };

}


// Listen button
on(
    el.listenButton,
    "click",
    () => {

        if (!state.recognition) {

            if (el.evaluationBox) {

                el.evaluationBox.innerHTML =
                    "<p>Speech recognition is not supported by this browser. Please type your answer.</p>";

            }

            return;
        }


        if (state.isListening) {

            state.recognition.stop();

        } else {

            state.recognition.start();

        }

    }
);


// ==========================================
// AI EVALUATION
// ==========================================

async function handleEvaluate() {

    const answer =
        el.responseBox.value.trim();


    // Make sure student answered
    if (answer === "") {

        el.evaluationBox.innerHTML =
            "<p>Please provide an answer before evaluating.</p>";

        return;
    }


    // Save the question BEFORE
    // the AI changes it
    const originalQuestion =
        el.questionText.textContent;


    // Record this answer for grading at the end of the exam
    recordAnswer(
        originalQuestion,
        answer
    );


    // Show loading
    el.evaluationBox.innerHTML =
        "<p>AI is thinking...</p>";


    el.evaluateButton.disabled =
        true;


    try {

        console.log(
            "Sending answer to AI..."
        );


        const response =
            await fetch(
                `${BACKEND_URL}/api/generate-followup`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        originalQuestion:
                            originalQuestion,

                        studentResponse:
                            answer,

                        category:
                            currentCategory

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                `Server responded with ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "AI RESPONSE:",
            data
        );


        // ==================================
        // FOLLOW-UP QUESTION
        // ==================================

        if (
            data.needsFollowUp &&
            data.followUpQuestion
        ) {

            el.evaluationBox.innerHTML = `

                <h4>Follow-up Question</h4>

                <p>
                    ${data.followUpQuestion}
                </p>

            `;


            // Show follow-up
            el.questionText.textContent =
                data.followUpQuestion;


            // Clear answer
            el.responseBox.value =
                "";


            // Speak follow-up
            speakQuestion(
                data.followUpQuestion
            );


            // Animate mouth
            // animateMouth(
            //     data.followUpQuestion
            // );

        }


        // ==================================
        // NO FOLLOW-UP
        // ==================================

        else {

            el.evaluationBox.innerHTML = `

                <h4>AI Evaluation</h4>

                <p>
                    ${data.evaluation}
                </p>

                <p>
                    <strong>Score:</strong>
                    ${data.score}
                </p>

                <p>
                    No follow-up question is needed.
                </p>

            `;

        }


    } catch (error) {

        console.error(
            "AI ERROR:",
            error
        );


        el.evaluationBox.innerHTML = `

            <h4>AI Connection Error</h4>

            <p>
                Could not connect to the AI.
            </p>

            <p>
                Make sure aiGuide.js is running.
            </p>

        `;

    }


    el.evaluateButton.disabled =
        false;
}


// Evaluate button
on(
    el.evaluateButton,
    "click",
    handleEvaluate
);


// ==========================================
// ADMIN: EXAM RESULTS
// ==========================================

// Stops question/answer text from being read as HTML
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}


async function loadResultsPage() {

    const list =
        document.getElementById("resultsList");

    if (!list) {
        return;
    }

    const key =
        sessionStorage.getItem("adminKey") ||
        prompt("Admin key:");

    if (!key) {
        return;
    }

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/results`,
            {
                headers: {
                    "x-admin-key": key
                }
            }
        );

        if (response.status === 401) {

            sessionStorage.removeItem("adminKey");

            list.innerHTML =
                "<p>Wrong admin key.</p>";

            return;
        }

        sessionStorage.setItem("adminKey", key);

        // Newest first
        const results =
            (await response.json()).reverse();

        if (results.length === 0) {

            list.innerHTML =
                "<p>No exams submitted yet.</p>";

            return;
        }

        list.innerHTML = results.map(function (r) {

            const score = r.gradingFailed
                ? "Grading failed (answers saved)"
                : r.percent + "%";

            const details = r.questions.map(function (q, i) {

                const answers =
                    (q.exchanges || []).map(function (e) {

                        return "<p><em>" +
                            escapeHtml(e.question) +
                            "</em><br>" +
                            escapeHtml(e.answer) +
                            "</p>";

                    }).join("") ||
                    "<p><em>No answer given</em></p>";

                return "<div><strong>" +
                    (i + 1) + ". " +
                    escapeHtml(q.question) +
                    "</strong>" +
                    (q.score !== undefined
                        ? " &mdash; " + q.score + "/10"
                        : "") +
                    answers +
                    (q.feedback
                        ? "<p>" + escapeHtml(q.feedback) + "</p>"
                        : "") +
                    "</div>";

            }).join("");

            return "<details class='saved-question'>" +
                "<summary><strong>" +
                escapeHtml(r.studentName) +
                "</strong> &mdash; " + score +
                " &mdash; " +
                new Date(r.submittedAt).toLocaleString() +
                "</summary>" +
                (r.summary
                    ? "<p>" + escapeHtml(r.summary) + "</p>"
                    : "") +
                details +
                "</details>";

        }).join("");

    } catch (error) {

        console.error(error);

        list.innerHTML =
            "<p>Could not load results. Is the backend running?</p>";

    }
}


// Only does something on the admin page
on(
    document.getElementById("loadResults"),
    "click",
    loadResultsPage
);


// ==========================================
// INITIAL SETUP
// ==========================================

updateTimerDisplay();

setQuestionButtonsEnabled(false);

console.log(
    "AINT script loaded successfully."
);

console.log(
    "Saved questions:",
    state.questions
);