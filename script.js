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
    mouth: document.querySelector(".mouth"),

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
    qualitativeAdd: document.getElementById("qualitativeAdd")
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


on(
    el.startButton,
    "click",
    () => {

        if (state.testRunning) {
            stopTimer();
        } else {
            startTimer();
        }

    }
);


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


    // Display question
    el.questionText.textContent =
        question;


    // Speak question
    speakQuestion(question);


    // Animate mouth
    animateMouth(question);


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

function speakQuestion(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;
    }


    speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(text);


    speech.rate = 1;

    speech.pitch = 1;

    speech.volume = 1;


    speechSynthesis.speak(
        speech
    );
}


// ==========================================
// MOUTH ANIMATION
// ==========================================

function animateMouth(text) {

    if (!el.mouth) {
        return;
    }


    const vowels =
        "aeiou";


    let index = 0;


    const interval =
        setInterval(() => {

            if (
                index >= text.length
            ) {

                clearInterval(
                    interval
                );

                el.mouth.classList.remove(
                    "vowel"
                );

                return;
            }


            const letter =
                text[index].toLowerCase();


            if (
                vowels.includes(letter)
            ) {

                el.mouth.classList.add(
                    "vowel"
                );

            } else {

                el.mouth.classList.remove(
                    "vowel"
                );

            }


            index++;

        }, 200);
}


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


    state.recognition.onerror =
        () => {

            state.isListening =
                false;

            if (el.listenButton) {

                el.listenButton.textContent =
                    "Start Listening";

            }

            if (el.evaluationBox) {

                el.evaluationBox.innerHTML =
                    "<p>There was a problem listening. Please try again or type your answer.</p>";

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
            animateMouth(
                data.followUpQuestion
            );

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

