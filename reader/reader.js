import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc,setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
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
    if (user) {
        updateLPDisplay(); 
        loadprofile()
    }
});
const skinss = {
    "skin1": "../loggedin/defaultpfp.png" ,
    "skin2": "../loggedin/2.png" ,
    "skin3": "../loggedin/4.png" ,
    "skin4": "../loggedin/3.png" ,
    "skin5": "../loggedin/cry.png" ,
    "skin6": "../loggedin/1.png" ,
    "skin7": "../loggedin/buff.png" ,
    "skin8": "../loggedin/5.png" ,
    "skin9": "../loggedin/leet.png" ,
    "skin10": "../loggedin/6.png" 
};
async function loadprofile(){
    if (!currentUser) return;
    
    // 1. Optimistic Cache Load
    const cachedSkin = localStorage.getItem(`equippedSkin_${currentUser.uid}`);
    if (cachedSkin) {
        document.getElementById('profileimg').src = skinss[cachedSkin] || skinss['skin1'];
    }

    // 2. Background Database Fetch
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentskin = userSnap.data().equippedSkin || 'skin1';
            document.getElementById('profileimg').src = skinss[currentskin];
            // Update cache with freshest data
            localStorage.setItem(`equippedSkin_${currentUser.uid}`, currentskin); 
        }
    } catch (e) {
        console.error("Error fetching skin:", e);
    }
}


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
const difficultyMap = {
  "Hard": 3,
  "Medium": 2,
  "Easy": 1
};
async function updateLPDisplay() {
    if (!currentUser) return;

    // 1. Optimistic Cache Load
    const cachedLP = localStorage.getItem(`LP_${currentUser.uid}`);
    if (cachedLP !== null) {
        document.getElementById('LP').innerText = `${cachedLP} LP`;
    }

    // 2. Background Database Fetch
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentLP = userSnap.data().LP || 0;
            document.getElementById('LP').innerText = `${currentLP} LP`;
            // Update cache with freshest data
            localStorage.setItem(`LP_${currentUser.uid}`, currentLP); 
        }
    } catch (e) {
        console.error("Error fetching LP:", e);
    }
}
let sessionCategoryUpdates = [];
const submitBtn = document.getElementById('submit-answer-btn');

submitBtn.addEventListener('click', async () => {
    if (!selectedOptionText) {
        alert("Please select an answer first.");
        return;
    }

    // 1. INSTANTLY DISABLE BUTTON TO PREVENT SPAM CLICKING
    submitBtn.disabled = true;

    const qData = currentStoryData.questions[currentQuestionIndex];
    const isCorrect = (selectedOptionText === qData.correct_answer);
    
    if (isCorrect) userScore++;

    // 2. TRACK CATEGORY LOCALLY INSTEAD OF FETCHING DATABASE
    if (currentUser && qData.category) {
        sessionCategoryUpdates.push({
            category: qData.category,
            isCorrect: isCorrect
        });
    }

    if (currentQuestionIndex < currentStoryData.questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion(currentQuestionIndex);
        
        // 3. RE-ENABLE BUTTON ONCE NEXT QUESTION IS RENDERED
        submitBtn.disabled = false; 
    } else {
        document.getElementById('progress-bar').style.width = `100%`;
        document.getElementById('quiz-section').classList.add('hidden');
        document.getElementById('final-score-screen').classList.remove('hidden');
        document.getElementById('final-score-text').innerText = `${userScore} / ${currentStoryData.questions.length}`;
        
        if (currentUser) {
            try {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    let userData = userSnap.data();
                    
                    let readingHistory = userData.readingHistory || {}; 
                    let achievements = userData.achievements || [];
                    let points = userData.LP || 0;
                    let grade = userData.grade || 0;
                    let streak = userData.streak || 0;
                    let lastLoginStr = userData.lastLogin || null;
                    
                    // Grab the user's existing categories
                    let userCategories = userData.category || []; 

                    const params = new URLSearchParams(window.location.search);
                    const storyId = params.get('id');

                    // 1. Add storyid to readings
                    if (storyId) {
                        if (readingHistory[storyId]) {
                            readingHistory[storyId] += 1;
                        } else {
                            readingHistory[storyId] = 1;
                        }
                    }

                    // 2. Add LP (ONLY if > 50%)
                    const scorePercentage = userScore / currentStoryData.questions.length;
                    if (scorePercentage > 0.5) {
                        const difficulty = currentStoryData.difficulty || "Easy";
                        const diffMultiplier = difficultyMap[difficulty] || 1; 
                        const pointsEarned = (diffMultiplier * 5) + (grade * 10);
                        points += pointsEarned;
                        
                        showLPAnimation(pointsEarned);
                    }

                    // 3. Check daily streak
                    const todayDate = new Date();
                    const todayStr = todayDate.toDateString(); 
                    let oldStreak = streak;
                    
                    if (lastLoginStr !== todayStr) {
                        if (lastLoginStr) {
                            const lastLoginDate = new Date(lastLoginStr);
                            todayDate.setHours(0,0,0,0);
                            lastLoginDate.setHours(0,0,0,0);
                            
                            const diffTime = todayDate - lastLoginDate;
                            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays === 1) {
                                streak += 1;
                            } else if (diffDays > 1) {
                                streak = 1;
                            }
                        } else {
                            streak = 1; 
                        }
                    }

                    if (streak > oldStreak) {
                        setTimeout(() => showStreakAnimation(streak), 500); 
                    }

                    // 4. Check achievements
                    const totalReadings = Object.values(readingHistory).reduce((sum, count) => sum + count, 0);
                    if (totalReadings >= 1 && !achievements.includes("one")) achievements.push("one");
                    if (totalReadings >= 5 && !achievements.includes("five")) achievements.push("five");
                    if (totalReadings >= 10 && !achievements.includes("ten")) achievements.push("ten");
                    if (totalReadings >= 20 && !achievements.includes("twenty")) achievements.push("twenty");
                    if (totalReadings >= 50 && !achievements.includes("fifty")) achievements.push("fifty");

                    // 5. BATCH PROCESS ALL CATEGORIES
                    sessionCategoryUpdates.forEach(update => {
                        let foundIndex = -1;
                        let right = 0, wrong = 0;
                        
                        for (let i = 0; i < userCategories.length; i++) {
                            const parts = userCategories[i].split('-');
                            const w = parseInt(parts.pop());
                            const r = parseInt(parts.pop());
                            const name = parts.join('-');
                            
                            if (name === update.category) {
                                foundIndex = i;
                                right = r;
                                wrong = w;
                                break;
                            }
                        }
                        
                        if (update.isCorrect) right++; else wrong++;
                        const newString = `${update.category}-${right}-${wrong}`;
                        
                        if (foundIndex > -1) {
                            userCategories[foundIndex] = newString;
                        } else {
                            userCategories.push(newString);
                        }
                    });

                    // 6. Push ALL updates in a SINGLE network call
                    await setDoc(userRef, { 
                        readingHistory: readingHistory,
                        LP: points,
                        streak: streak,
                        lastLogin: todayStr,
                        achievements: achievements,
                        category: userCategories // Included batch categories here!
                    }, { merge: true });
                    
                    document.getElementById('LP').innerText = `${points} LP`;

                    localStorage.setItem(`LP_${currentUser.uid}`, points);
                    localStorage.setItem(`streak_${currentUser.uid}`, streak);
                    
                }
            } catch (error) {
                console.error("Error updating user stats:", error);
            } finally {
                // Ensure button is usable again if they navigate back
                submitBtn.disabled = false;
            }
        }
    }
});

// --- ANIMATION HELPER FUNCTIONS ---

function showLPAnimation(amount) {
    const anim = document.createElement('div');
    anim.innerText = `+${amount} LP!`;
    
    // Styling for a bold, glowing pop-up
    anim.style.cssText = `
        position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
        font-size: 3rem; font-weight: 900; color: #ff9800; font-family: sans-serif;
        text-shadow: 2px 2px 0px #fff, 0px 4px 10px rgba(255, 152, 0, 0.5);
        z-index: 10000; pointer-events: none; opacity: 0;
    `;
    document.body.appendChild(anim);
    
    // JS Native Animation
    anim.animate([
        { opacity: 0, transform: 'translate(-50%, -20%) scale(0.5)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.2)', offset: 0.2 },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.8 },
        { opacity: 0, transform: 'translate(-50%, -80%) scale(1)' }
    ], { 
        duration: 2500, 
        easing: 'ease-out' 
    }).onfinish = () => anim.remove();
}

function showStreakAnimation(newStreak) {
    const anim = document.createElement('div');
    
    // Determine which image to show based on the tier
    let imgSrc = '../loggedin/1day.png'; // fallback
    if (newStreak >= 10) imgSrc = '../loggedin/10days.png';
    else if (newStreak >= 5) imgSrc = '../loggedin/2days.png';
    else if (newStreak >= 1) imgSrc = '../loggedin/1day.png';
    
    anim.innerHTML = `
        <img src="${imgSrc}" style="width: 80px; height: 80px; object-fit: contain;">
        <div style="font-size: 1.5rem; font-weight: bold; color: #00af26; font-family: sans-serif; margin-top: 10px;">
            ${newStreak} Day Streak!
        </div>
    `;
    
    anim.style.cssText = `
        position: fixed; top: 60%; left: 50%; transform: translate(-50%, -50%);
        text-align: center; z-index: 10000; pointer-events: none; opacity: 0;
    `;
    document.body.appendChild(anim);

    // Bouncy pop-in animation
    anim.animate([
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0.1) rotate(-15deg)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.3) rotate(5deg)', offset: 0.4 },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', offset: 0.8 },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }
    ], { 
        duration: 3000, 
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
    }).onfinish = () => anim.remove();
}
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