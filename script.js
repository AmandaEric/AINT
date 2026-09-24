// Elements
const el = {
    timer: document.querySelector(".timer"),
    startButton: document.querySelector(".start"),

    objective: document.querySelector(".objective"),
    semiButton: document.querySelector(".semi"),
    qualatativeButton: document.querySelector(".qualitative"),
    questionText: document.querySelector(".question-text"),

    listenButton: document.querySelector(".listen"),
    responseBox: document.querySelector(".response"),
    evaluateButton: document.querySelector(".evaluate"),
    // FIX: your HTML uses class="evaluation", not "evaluation-result" —
    // this was always null, so nothing writing to el.evaluationBox worked
    evaluationBox: document.querySelector(".evaluation"),

    mouth: document.querySelector(".mouth"),

    // The <img id="ai-avatar"> in main.html — nothing was setting its
    // src before, so it always showed as a broken/empty image.
    avatarImage: document.getElementById("ai-avatar"),

    objectiveList: document.querySelector(".objective-list"),
    semiList: document.querySelector(".semi-list"),
    qualitativeList: document.querySelector(".qualitative-list"),
    clearQuestions: document.querySelector(".clear-question"),

    // NOTE: these weren't in your el object, so admin "add" buttons/inputs
    // were doing nothing. Adjust these selectors/IDs to match your actual HTML.
    objectiveInput: document.getElementById("objectiveInput"),
    semiInput: document.getElementById("semiInput"),
    qualitativeInput: document.getElementById("qualitativeInput"),
    objectiveAdd: document.getElementById("objectiveAdd"),
    semiAdd: document.getElementById("semiAdd"),
    qualitativeAdd: document.getElementById("qualitativeAdd"),
};

function on(element, eventName, handler) {
    if (element) {
        element.addEventListener(eventName, handler);
    }
}

// State
const state = {
    seconds: 0,
    timerInterval: null,
    testRunning: false,

    questions: JSON.parse(localStorage.getItem("aintQuestions")) || {
        objective: [],
        semi: [],
        qualitative: [],
    },

    selectedQuestions: [],

    recognition: null,
    isListening: false,
};

const BACKEND_URL = "http://localhost:3000"; // Change this to your backend URL if different


// Timer
function updateTimerDisplay() {
    const minutes = Math.floor(state.seconds / 60);
    const remainingSeconds = state.seconds % 60;
    el.timer.textContent = `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function startTimer() {
    state.testRunning = true;
    el.startButton.textContent = "Stop Test";

    // FIX: this was missing, so the question buttons never turned back on
    setQuestionButtonsEnabled(true);

    state.timerInterval = setInterval(() => {
        state.seconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    state.testRunning = false;
    el.startButton.textContent = "Start Test";
    clearInterval(state.timerInterval);

    setQuestionButtonsEnabled(false);

    if (state.isListening && state.recognition) {
        state.recognition.stop();
    }
    if (el.listenButton) el.listenButton.disabled = true;
    if (el.evaluateButton) el.evaluateButton.disabled = true;
}

function setQuestionButtonsEnabled(enabled) {
    if (el.objective) el.objective.disabled = !enabled;
    if (el.semiButton) el.semiButton.disabled = !enabled;
    if (el.qualatativeButton) el.qualatativeButton.disabled = !enabled;
}

on(el.startButton, "click", () => {
    state.testRunning ? stopTimer() : startTimer();
});


// Question Bank
function saveQuestions() {
    localStorage.setItem("aintQuestions", JSON.stringify(state.questions));
}

function addQuestion(category, inputElement) {
    // FIX: was "inuputElement" (typo) -> always threw an error here
    if (!inputElement) return;

    const question = inputElement.value.trim();
    if (question === "") {
        alert("Please enter a question first.");
        return;
    }

    state.questions[category].push(question);
    saveQuestions();

    // FIX: these two lines were missing, so the box never cleared
    // and the list on screen never updated after adding a question
    inputElement.value = "";
    displayQuestions();
}

function deleteQuestion(category, index) {
    state.questions[category].splice(index, 1);
    saveQuestions();
    displayQuestions();
}

// FIX: renamed from "deletAllQuestions" so it actually matches
// the name used down in the on(el.clearQuestions, ...) call below
function clearAllQuestions() {
    const confirmed = confirm("Are you sure you want to delete ALL questions?");
    if (!confirmed) return;

    state.questions = { objective: [], semi: [], qualitative: [] };
    saveQuestions();
    displayQuestions();
}

function renderQuestionList(listElement, category) {
    if (!listElement) return;

    listElement.innerHTML = "";
    state.questions[category].forEach((question, index) => {
        const row = document.createElement("div");
        row.className = "saved-question"; // FIX: was "classNamw" (typo)
        row.innerHTML = `
            <p>${question}</p>
            <button onclick="deleteQuestion('${category}', ${index})">Delete</button>
        `;
        listElement.appendChild(row);
    });
}

function displayQuestions() {
    renderQuestionList(el.objectiveList, "objective");
    renderQuestionList(el.semiList, "semi");
    renderQuestionList(el.qualitativeList, "qualitative");
}

on(el.objectiveAdd, "click", () => addQuestion("objective", el.objectiveInput));
on(el.semiAdd, "click", () => addQuestion("semi", el.semiInput));
on(el.qualitativeAdd, "click", () => addQuestion("qualitative", el.qualitativeInput));
on(el.clearQuestions, "click", clearAllQuestions);

// deleteQuestion is called from an inline onclick="" in the HTML we generate
// above, so it has to live on window to be reachable from there.
window.deleteQuestion = deleteQuestion;

displayQuestions();


// Testing (Student Side)
function addCategory(category) {
    const bank = state.questions[category];

    if (!bank || bank.length === 0) {
        if (el.questionText) {
            el.questionText.textContent = `No questions available in the ${category} category.`;
        }
        return;
    }

    bank.forEach((question) => {
        if (!state.selectedQuestions.includes(question)) {
            state.selectedQuestions.push(question);
        }
    });
}

// This is the piece that was missing: pick a random question from the
// pool, remove it so it can't repeat, show it, speak it, and get the
// response controls ready for the student.
let currentCategory = null;

function askNextQuestion() {
    if (!el.questionText) return;

    if (state.selectedQuestions.length === 0) {
        el.questionText.textContent = "No more questions available.";
        return;
    }

    const randomIndex = Math.floor(Math.random() * state.selectedQuestions.length);
    const question = state.selectedQuestions.splice(randomIndex, 1)[0];

    el.questionText.textContent = question;
    speakQuestion(question);
    animateMouth(question);

    if (el.responseBox) el.responseBox.disabled = false;
    if (el.listenButton) el.listenButton.disabled = false;
    if (el.evaluateButton) el.evaluateButton.disabled = false;

    if (el.evaluationBox) {
        el.evaluationBox.innerHTML = "<p>Waiting for student response...</p>";
    }
}

on(el.objective, "click", () => {
    currentCategory = "objective";
    addCategory("objective");
    askNextQuestion();
});

on(el.semiButton, "click", () => {
    currentCategory = "semi";
    addCategory("semi");
    askNextQuestion();
});

on(el.qualatativeButton, "click", () => {
    currentCategory = "qualitative";
    addCategory("qualitative");
    askNextQuestion();
});


// Speech
function speakQuestion(text) {
    if (!("speechSynthesis" in window)) {
        alert("Sorry, your browser does not support speech synthesis.");
        return;
    }
    speechSynthesis.cancel();

    // FIX: was "new SpeechSynthesis(text)" -> that constructor doesn't
    // exist for creating an utterance; you want SpeechSynthesisUtterance
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    speechSynthesis.speak(speech);
}

// Animation for mouth
// FIX: renamed from "animatedMouth" to "animateMouth" so it matches
// how it's called elsewhere (askNextQuestion, handleEvaluate)
function animateMouth(text) {
    if (!el.mouth) return;
    const vowels = "aeiou";
    let i = 0;

    const interval = setInterval(() => {
        // FIX: was "i < text.length" which stopped the animation
        // immediately (true on the very first tick). Needs to be >=
        // so it only stops once we've reached the end of the text.
        if (i >= text.length) {
            clearInterval(interval);
            el.mouth.classList.remove("vowel");
            return;
        }

        const letter = text[i].toLowerCase();
        el.mouth.classList.toggle("vowel", vowels.includes(letter));
        i++;
    }, 200);
}

// --- Speech-to-text setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = "en-US";

    state.recognition.onstart = () => {
        state.isListening = true;
        if (el.listenButton) el.listenButton.textContent = "Stop Listening";
    };

    state.recognition.onend = () => {
        state.isListening = false;
        if (el.listenButton) el.listenButton.textContent = "Start Listening";
    };

    state.recognition.onerror = () => {
        state.isListening = false;
        if (el.listenButton) el.listenButton.textContent = "Start Listening";
        if (el.evaluationBox) {
            el.evaluationBox.innerHTML =
                "<p>There was a problem listening to the response. Please try again or type the response.</p>";
        }
    };

    state.recognition.onresult = (event) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + " ";
            }
        }

        if (finalTranscript && el.responseBox) {
            el.responseBox.value += finalTranscript;
        }
    };
}

on(el.listenButton, "click", () => {
    if (!state.recognition) {
        if (el.evaluationBox) {
            el.evaluationBox.innerHTML =
                "<p>Speech recognition is not supported by this browser. Please type your response.</p>";
        }
        return;
    }

    state.isListening ? state.recognition.stop() : state.recognition.start();
});


// Avatar
// Asks the backend to generate the AI's avatar image and drops the
// resulting URL into the <img id="ai-avatar"> tag. Runs once on load.
async function generateAvatar() {
    if (!el.avatarImage) return;

    const characterDescription = `
A middle-aged woman with a friendly face,
chin-length brown hair,
wearing a white shirt and a dotted blazer.
`;

    try {
        const response = await fetch(`${BACKEND_URL}/api/generate-avatar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ characterDescription }),
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.image && data.image.url) {
            el.avatarImage.src = data.image.url;
        }
    } catch (err) {
        console.error("Could not load avatar:", err);
    }
}

generateAvatar();


// AI Evaluation + Follow-up (backend call)
async function handleEvaluate() {
    const answer = el.responseBox.value.trim();

    if (answer === "") {
        el.evaluationBox.innerHTML = "<p>Please provide an answer before evaluating.</p>";
        return;
    }

    el.evaluationBox.innerHTML = "<p>Thinking of a follow-up question...</p>";
    el.evaluateButton.disabled = true;

    try {
        const response = await fetch(`${BACKEND_URL}/api/generate-followup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                originalQuestion: el.questionText.textContent,
                studentResponse: answer,
                category: currentCategory,
            }),
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (data.needsFollowUp && data.followUpQuestion) {
            el.evaluationBox.innerHTML = `
                <h4>Follow-up Question</h4>
                <p>${data.followUpQuestion}</p>
            `;

            el.questionText.textContent = data.followUpQuestion;
            el.responseBox.value = "";

            speakQuestion(data.followUpQuestion);
            animateMouth(data.followUpQuestion);
        } else {
            el.evaluationBox.innerHTML = `
                <h4>AI Evaluation</h4>
                <p><strong>Result:</strong> Response received - no follow-up needed.</p>
            `;
            el.evaluateButton.disabled = true;
        }
    } catch (err) {
        console.error(err);
        el.evaluationBox.innerHTML =
            "<p>Something went wrong generating a follow-up question. Is the backend running?</p>";
    } finally {
        el.evaluateButton.disabled = false;
    }
}

on(el.evaluateButton, "click", handleEvaluate);