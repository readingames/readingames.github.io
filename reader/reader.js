import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
const firebaseConfig = {
    apiKey: "AIzaSyBHmjiEPPbZtfYDMQeyRYLg3wO8fGPO4iE",
    authDomain: "readingames.firebaseapp.com",
    projectId: "readingames",
    storageBucket: "readingames.firebasestorage.app",
    messagingSenderId: "135626039621",
    appId: "1:135626039621:web:d0020d4265120de011de2c",
    measurementId: "G-YXT9CZ6597"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentStoryData = null;
let currentQuestionIndex = 0;
let userScore = 0;
let selectedOptionText = null;
let currentUser = null;
let activeTool = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
});

// A helper function to wrap every single word in an invisible span for the hover effects
function wrapWordsForInteraction(text) {
    return text.split(/\s+/).map(word => `<span class="word">${word}</span>`).join(' ');
}

window.addEventListener("load", async function() {
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get('id');

    if (!storyId) return;

    try {
        const docRef = doc(db, "stories", storyId);
        document.getElementById('story-loading-overlay').style.display = 'flex';
        document.getElementById('questions-loading-overlay').style.display = 'flex';
        
        const docSnap = await getDoc(docRef);
        
        document.getElementById('story-loading-overlay').style.display = 'none';
        document.getElementById('questions-loading-overlay').style.display = 'none';
        
        if (docSnap.exists()) {
            currentStoryData = docSnap.data();
            
            document.getElementById('story-title').innerText = currentStoryData.passage_title || "Untitled Story";
            const diffSpan = document.getElementById('story-difficulty');
            diffSpan.innerText = currentStoryData.difficulty || "";
            diffSpan.style.color = currentStoryData.difficulty === 'Easy' ? 'rgb(0, 246, 53)' : currentStoryData.difficulty === 'Medium' ? 'rgb(255, 196, 0)' : 'rgb(159, 0, 0)';
            
            // Map text and wrap it in our spans
            const rawTextArray = Array.isArray(currentStoryData.passage_text) ? currentStoryData.passage_text : [currentStoryData.passage_text || currentStoryData.content];
            document.getElementById('story-content').innerHTML = rawTextArray.map(p => `<p>${wrapWordsForInteraction(p)}</p>`).join('');

            setupHighlighterCanvas();
            renderQuestion(0);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
});

function renderQuestion(index) {
    if (!currentStoryData.questions || currentStoryData.questions.length === 0) return;
    
    const qData = currentStoryData.questions[index];
    document.getElementById('question-title').innerText = `Question ${qData.question_number}:`;
    document.getElementById('question').innerText = qData.text;

    const optionsGrid = document.getElementById('options-grid');
    optionsGrid.innerHTML = '';
    selectedOptionText = null;

    qData.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.id = `option${idx + 1}`;
        btn.innerText = opt;
        btn.onclick = () => {
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedOptionText = opt;
        };
        optionsGrid.appendChild(btn);
    });

    const progressPercentage = (index / currentStoryData.questions.length) * 100;
    document.getElementById('progress-bar').style.width = `${progressPercentage}%`;
}

document.getElementById('submit-answer-btn').addEventListener('click', async () => {
    if (!selectedOptionText) {
        alert("Please select an answer first.");
        return;
    }

    const qData = currentStoryData.questions[currentQuestionIndex];
    const isCorrect = (selectedOptionText === qData.correct_answer);
    
    if (isCorrect) userScore++;

    if (currentUser && qData.category) {
        await updateCategoryData(qData.category, isCorrect);
    }

    if (currentQuestionIndex < currentStoryData.questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion(currentQuestionIndex);
    } else {
        document.getElementById('progress-bar').style.width = `100%`;
        document.getElementById('quiz-section').classList.add('hidden');
        document.getElementById('final-score-screen').classList.remove('hidden');
        document.getElementById('final-score-text').innerText = `${userScore} / ${currentStoryData.questions.length}`;
    }
});

async function updateCategoryData(categoryName, isCorrect) {
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            let categories = userSnap.data().category || [];
            let foundIndex = -1;
            let right = 0, wrong = 0;
            
            for (let i = 0; i < categories.length; i++) {
                const parts = categories[i].split('-');
                const w = parseInt(parts.pop());
                const r = parseInt(parts.pop());
                const name = parts.join('-');
                
                if (name === categoryName) {
                    foundIndex = i;
                    right = r;
                    wrong = w;
                    break;
                }
            }
            
            if (isCorrect) right++; else wrong++;
            const newString = `${categoryName}-${right}-${wrong}`;
            
            if (foundIndex > -1) {
                categories[foundIndex] = newString;
            } else {
                categories.push(newString);
            }
            
            await updateDoc(userRef, { category: categories });
        }
    } catch (e) {
        console.error("Stats update failed:", e);
    }
}

// -----------------------------------------
// REBUILT UI TOOLBOX LOGIC
// -----------------------------------------

document.getElementById('toolbox-btn').addEventListener('click', () => {
    document.getElementById('toolbox-panel').classList.toggle('open');
});

const tools = document.querySelectorAll('.tool-item');
tools.forEach(tool => {
    tool.addEventListener('click', () => {
        const storyContent = document.getElementById('story-content');
        const canvas = document.getElementById('highlight-canvas');

        // Toggle state logic
        if (tool.classList.contains('active')) {
            tool.classList.remove('active');
            activeTool = null;
        } else {
            tools.forEach(t => t.classList.remove('active'));
            tool.classList.add('active');
            activeTool = tool.dataset.tool;
        }

        // Setup the DOM based on which tool is selected
        storyContent.classList.remove('tool-mode-interactive');
        storyContent.classList.remove('no-select');
        if (canvas) canvas.style.pointerEvents = 'none';

        if (activeTool === 'highlight' || activeTool === 'eraser') {
            if (canvas) canvas.style.pointerEvents = 'auto'; // Allow canvas drawing/erasing
            storyContent.classList.add('no-select'); // Prevent default browser text highlighting
        } else if (activeTool === 'underline' || activeTool === 'vocab') {
            storyContent.classList.add('tool-mode-interactive'); // Trigger the CSS hover physics
        }
    });
});

function setupHighlighterCanvas() {
    const storyContent = document.getElementById('story-content');
    
    const canvas = document.createElement('canvas');
    canvas.id = 'highlight-canvas';
    
    canvas.width = storyContent.scrollWidth;
    canvas.height = storyContent.scrollHeight;
    storyContent.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    let isDrawing = false;
    
    // Create an offscreen buffer canvas to track the current active stroke cleanly
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.lineCap = 'round';
    tempCtx.lineJoin = 'round';

    function eraseWordUnderCursor(x, y) {
        canvas.style.pointerEvents = 'none';
        const elem = document.elementFromPoint(x, y);
        canvas.style.pointerEvents = 'auto';
        
        if (elem && elem.classList.contains('word')) {
            if (elem.classList.contains('text-vocab') && currentUser) {
                elem.classList.remove('text-vocab');
                const cleanWord = elem.innerText.replace(/[.,!?()"';:]/g, '');
                const userRef = doc(db, "users", currentUser.uid);
                updateDoc(userRef, { vocabulary: arrayRemove(cleanWord) }).catch(e => console.error(e));
            }
            elem.classList.remove('text-underlined');
        }
    }

    canvas.addEventListener('mousedown', (e) => {
        if (activeTool !== 'highlight' && activeTool !== 'eraser') return;
        isDrawing = true;
        
        // Copy the current permanent canvas state onto our temporary buffer before drawing
        tempCanvas.width = canvas.width; // ensures layout sync
        tempCanvas.height = canvas.height;
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        if (activeTool === 'eraser') {
            tempCtx.globalCompositeOperation = 'destination-out';
            tempCtx.lineWidth = 32;
        } else {
            // Use source-over with fixed partial alpha on the buffer
            tempCtx.globalCompositeOperation = 'source-over';
            tempCtx.lineWidth = 26;
            tempCtx.strokeStyle = 'rgba(255, 235, 59, 0.01)';
        }

        tempCtx.beginPath();
        tempCtx.moveTo(e.offsetX, e.offsetY);
        
        if (activeTool === 'eraser') eraseWordUnderCursor(e.clientX, e.clientY);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        
        // Draw the stroke extension onto the temp buffer, NOT directly compounding on the main canvas
        tempCtx.lineTo(e.offsetX, e.offsetY);
        tempCtx.stroke();
        
        // Render the clean isolated stroke result back onto the main canvas view
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);

        if (activeTool === 'eraser') eraseWordUnderCursor(e.clientX, e.clientY);
    });
    
    const stopDrawing = () => {
        if (!isDrawing) return;
        isDrawing = false;
    };

    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
}

// Master Click Handler for Notes, Underlines, and Vocab
document.getElementById('story-content').addEventListener('click', async (e) => {
    
    // BUG FIX: Prevent sticky notes from spawning endlessly if you accidentally click inside an existing one
    if (e.target.closest('.floating-note')) return; 

    // Handle Note Spawning
    if (activeTool === 'notes' && (e.target.id === 'story-content' || e.target.tagName === 'P' || e.target.classList.contains('word'))) {
        const note = document.createElement('div');
        note.className = 'floating-note';
        
        const rect = document.getElementById('story-content').getBoundingClientRect();
        note.style.left = `${e.clientX - rect.left}px`;
        note.style.top = `${e.clientY - rect.top + document.getElementById('story-content').scrollTop}px`;

        note.innerHTML = `
            <div class="note-close">&times;</div>
            <textarea placeholder="Type your note..."></textarea>
        `;
        note.addEventListener('click', (ev) => ev.stopPropagation());
        note.querySelector('.note-close').addEventListener('click', (ev) => {
            ev.stopPropagation();
            note.remove();
        });
        
        document.getElementById('story-content').appendChild(note);
        return;
    }

    // Handle Word Interactions (Underline & Vocab)
    if (e.target.classList.contains('word')) {
        if (activeTool === 'underline') {
            e.target.classList.toggle('text-underlined');
        } 
        else if (activeTool === 'vocab') {
            // Strip out common punctuation marks so the database saves a clean word
            const cleanWord = e.target.innerText.replace(/[.,!?()"';:]/g, ''); 
            
            e.target.classList.add('text-vocab');
            
            if (currentUser && cleanWord.length > 0) {
                const userRef = doc(db, "users", currentUser.uid);
                await updateDoc(userRef, { vocabulary: arrayUnion(cleanWord) });
                showToast(`"${cleanWord}" saved to vocabulary!`);
                console.log(`"${cleanWord}" saved to vocabulary!`)
            }
        }
    }
});

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

document.getElementById('back-btn').addEventListener('click', () => window.location.href = '/public/loggedin/');
document.getElementById('return-home-btn').addEventListener('click', () => window.location.href = '/public/loggedin/');