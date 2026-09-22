import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBHmjiEPPbZtfYDMQeyRYLg3wO8fGPO4iE",
    authDomain: "readingames.firebaseapp.com",
    projectId: "readingames",
    storageBucket: "readingames.firebasestorage.app",
    messagingSenderId: "135626039621",
    appId: "1:135626039621:web:d0020d4265120de011de2c",
    measurementId: "G-YXT9CZ6597"
};

let currentUser = null;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        console.log("Authenticated User UID:", user.uid);
        loadRecommendations();
        initializeUserData(user)
    } else {
        window.location.href = "login.html";
    }
});

const skinss = {
    "skin1": "defaultpfp.png" ,
    "skin2": "2.png" ,
    "skin3": "4.png" ,
    "skin4": "3.png" ,
    "skin5": "cry.png" ,
    "skin6": "1.png" ,
    "skin7": "buff.png" ,
    "skin8": "5.png" ,
    "skin9": "leet.png" ,
    "skin10": "6.png" 
};

// MASTER MERGED FUNCTION: One network call fetches Grade, Skin, LP, and Streak
// MASTER MERGED FUNCTION: One network call fetches Grade, Skin, LP, and Streak
async function initializeUserData(user) {
    if (!user) return;
    
    // 0. Quick load from localStorage for instant UI rendering
    const cachedSkin = localStorage.getItem(`equippedSkin_${user.uid}`);
    const cachedLP = localStorage.getItem(`LP_${user.uid}`);
    const cachedStreak = localStorage.getItem(`streak_${user.uid}`);

    // Instantly apply cached data if it exists
    if (cachedSkin) {
        document.getElementById('profileimg').src = skinss[cachedSkin] || skinss['skin1'];
    }
    if (cachedLP !== null) {
        document.getElementById('LP').innerText = `${cachedLP} LP`;
    }
    if (cachedStreak !== null) {
        document.getElementById('streaktext').innerHTML = `${cachedStreak} Day Streak`;
        const streakNum = parseInt(cachedStreak, 10);
        if (streakNum >= 10) document.getElementById('streakimg').src = '10days.png';
        else if (streakNum >= 5) document.getElementById('streakimg').src = '2days.png';
        else if (streakNum >= 1) document.getElementById('streakimg').src = '1day.png';
        else document.getElementById('streakimg').src = 'zero.png';
    } else {
         // Fallback loading state only if nothing is cached
         document.getElementById('streaktext').innerHTML = 'Loading...';
    }
    
    const userRef = doc(db, "users", user.uid);
    
    try {
        const snapshot = await getDoc(userRef);
        let data = snapshot.exists() ? snapshot.data() : {};

        // 1. Process & Check Grade
        const currentGrade = data.grade || 0;
        if (currentGrade <= 0) {
            showGradePrompt(userRef);
        }

        // 2. Process Profile Picture Skin & Update Cache
        const currentskin = data.equippedSkin || 'skin1';
        document.getElementById('profileimg').src = skinss[currentskin];
        localStorage.setItem(`equippedSkin_${user.uid}`, currentskin);

        // 3. Process LP Display & Update Cache
        const currentLP = data.LP || 0;
        document.getElementById('LP').innerText = `${currentLP} LP`;
        localStorage.setItem(`LP_${user.uid}`, currentLP);

        // 4. Process Streak & Update Cache
        const streak = data.streak || 0; 
        document.getElementById('streaktext').innerHTML = `${streak} Day Streak`;
        localStorage.setItem(`streak_${user.uid}`, streak);
        
        if (streak >= 10) {
            document.getElementById('streakimg').src = '10days.png';
        } else if (streak >= 5) {
            document.getElementById('streakimg').src = '2days.png';
        } else if (streak >= 1) {
            document.getElementById('streakimg').src = '1day.png';
        } else {
            document.getElementById('streakimg').src = 'zero.png';
        }

    } catch (e) {
        console.error("Error initializing user data:", e);
        // Only show error text if we didn't already load a cached version
        if (cachedStreak === null) {
            document.getElementById('streaktext').innerHTML = 'Error loading streak';
            document.getElementById('streakimg').src = 'zero.png';
        }
    }
}

function showGradePrompt(userRef) {
    const modal = document.createElement('div');
    modal.id = 'grade-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex; justify-content: center;
        align-items: center; z-index: 9999;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; width: 300px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            <h2>Welcome!</h2>
            <p style="margin: 15px 0; color: #555;">Please select your grade to get started:</p>
            <select id="grade-select" style="width: 100%; padding: 10px; font-size: 16px; margin-bottom: 20px; border-radius: 6px; border: 1px solid #ccc;">
                <option value="" disabled selected>Select your grade (1-12)</option>
                ${Array.from({length: 12}, (_, i) => `<option value="${i+1}">Grade ${i+1}</option>`).join('')}
            </select>
            <button id="save-grade-btn" style="background: #00af26; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 6px; cursor: pointer; width: 100%;">Save Grade</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('save-grade-btn').addEventListener('click', async () => {
        const selectedGrade = parseInt(document.getElementById('grade-select').value);
        if (!selectedGrade) {
            alert('Please select a valid grade.');
            return;
        }

        try {
            await setDoc(userRef, { grade: selectedGrade }, { merge: true });
            document.body.removeChild(modal);
            console.log("Grade saved successfully:", selectedGrade);
            
            // Re-run initialization to pull down the newly updated grade and trigger layout changes cleanly
            if (typeof loadRecommendations === "function") {
                loadRecommendations();
            }
        } catch (e) {
            console.error("Error saving grade:", e);
            alert('Failed to save grade. Please try again.');
        }
    });
}
async function loadRecommendations() {
    const listElement = document.getElementById('recommendation-list');
    listElement.innerHTML = ''; 
    document.getElementById('loading-overlay').style.display = 'flex';
    
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        let userGrade = 9;
        let readReadings = [];
        let categories = [];
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            userGrade = userData.grade || 9;
            readReadings = userData.readingHistory || {};
            categories = userData.category || [];
            console.log(userGrade,categories,readReadings)
        }

        let totalCorrect = 0;
        let totalWrong = 0;
        const topicAccuracies = {};
        let dict = {}
        categories.forEach(cat => {
            const parts = cat.split('-');
            const wrong = parseInt(parts.pop()) || 0;
            const right = parseInt(parts.pop()) || 0;
            const topicName = parts.join('-'); 
            totalCorrect += right;
            totalWrong += wrong;
            const total = right + wrong;
            
            if (total > 0) {
                topicAccuracies[topicName] = right / total; 
            } else {
                topicAccuracies[topicName] = 0.5; 
            }
        });

        const overallTotal = totalCorrect + totalWrong;
        const overallAccuracy = overallTotal > 0 ? (totalCorrect / overallTotal) * 100 : 50;

        const targetDifficulty = overallAccuracy < 50 ? "Hard" : "Easy";
        const targetGrades = overallAccuracy < 50 ? [userGrade, userGrade - 1] : [userGrade, userGrade + 1];

        const storiesQuery = query(collection(db, "stories"));
        const querySnapshot = await getDocs(storiesQuery);
        document.getElementById('loading-overlay').style.display = 'none';

        let scoredStories = [];

        querySnapshot.forEach((storyDoc) => {
            const data = storyDoc.data();
            const storyId = storyDoc.id;

            
            const isRead = storyId in readReadings; 
            let score = 0;

            if (!isRead) {
                score += 100;
            }

            const storyTopic = data.topic || "";
            if (topicAccuracies[storyTopic] !== undefined) {
                score += (1 - topicAccuracies[storyTopic]) * 100;
            }

            const storyGrade = parseInt(data.grade) || userGrade;
            const storyDifficulty = data.difficulty || "Medium";

            if (targetGrades.includes(storyGrade)) {
                score += 30;
            }
            if (storyDifficulty === targetDifficulty) {
                score += 20;
            }

            scoredStories.push({
                id: storyId,
                data: data,
                score: score
            });
        });

        scoredStories.sort((a, b) => b.score - a.score);
        const topRecommendations = scoredStories.slice(0, 5);

        if (topRecommendations.length === 0) {
            listElement.innerHTML = '<li>No recommendations available at this time.</li>';
            return;
        }

        topRecommendations.forEach(item => {
            const data = item.data;
            const li = document.createElement('li');
            let col = 'rgb(0, 175, 38)'; 

            if (data.difficulty == 'Easy') { 
                col = 'rgb(27, 121, 48)'; 
            } else if (data.difficulty == 'Medium') { 
                col = 'rgb(227, 182, 32)'; 
            } else if (data.difficulty == 'Hard') { 
                col = 'rgb(113, 10, 10)'; 
            } 

            const gradeDisplay = data.grade ? `Grade ${data.grade}` : 'Grade N/A';`<span style="cursor:pointer; color: rgb(0, 175, 38);">${data.passage_title}</span> - ${gradeDisplay} - <span style='color: ${col}'>${data.difficulty}</span>`;
            li.innerHTML = `<span style="cursor:pointer; color: rgb(0, 175, 38);">${data.passage_title}</span> - <span style='color: ${col}'>${gradeDisplay}</span>`;
            
            li.addEventListener('click', () => {
                console.log("Opening story:", item.id);
                window.location.href = `/public/reader/index.html?id=${item.id}`;
            });

            listElement.appendChild(li);
        });

    } catch(err) {
        console.error("Error loading recommendations:", err);
        document.getElementById('loading-overlay').style.display = 'none';
    }
}