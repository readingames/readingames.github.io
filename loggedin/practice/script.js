import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const db = getFirestore(app)


window.addEventListener("load", function() {
    loadRecommendations()
});
let search = document.getElementById('search');
search.addEventListener('click', function() {
    let grade = document.getElementById('grade').value;
    let category = document.getElementById('cars').value;
    let keyword = document.getElementById('keyword').value.toLowerCase().trim();
    
    // Pass filter inputs to the load function
    loadRecommendations(grade, category, keyword);
});

async function loadRecommendations(filterGrade = null, filterCategory = null, keyword = "") {
    const listElement = document.getElementById('readingslist');
    // Check if this is a default load with no active filters
    const isInitialLoad = !filterGrade && !filterCategory && !keyword;

    // --- 1. OPTIMISTIC CACHE RENDER ---
    if (isInitialLoad) {
        const cachedStoriesStr = localStorage.getItem('cachedStories_top9');
        if (cachedStoriesStr) {
            try {
                const cachedStories = JSON.parse(cachedStoriesStr);
                listElement.innerHTML = ''; // Clear out old
                
                cachedStories.forEach(story => { 
                    const li = document.createElement('li'); 
                    let col = 'rgb(0, 175, 38)'; 
                    
                    if (story.difficulty === 'Easy')col = 'rgb(27, 121, 48)';  
                    else if (story.difficulty === 'Medium') col = 'rgb(255, 196, 0)'; 
                    else if (story.difficulty === 'Hard') col = 'rgb(159, 0, 0)'; 
                    
                    const gradeDisplay = story.grade ? `Grade ${story.grade}` : 'Grade N/A';
                    
                    // Fixed: Removed the unused floating string and fixed the missing </span> tag below
                    li.innerHTML = `<span style="cursor:pointer; color: rgb(0, 175, 38);">${story.passage_title}</span> - <span style='color: ${col}'>${gradeDisplay} - ${story.difficulty}</span>`; 
                    
                    li.addEventListener('click', () => { 
                        window.location.href = `/public/reader/index.html?id=${story.id}`; 
                    }); 
                    
                    listElement.appendChild(li); 
                });
            } catch (e) {
                console.error("Error parsing cached stories:", e);
            }
        } else {
            // Only show loader if we have absolutely nothing to show them yet
            console.log('loading')
        }
    } else {
        // Show loader if they are actively searching/
        console.log('loading')
    }

    // --- 2. BACKGROUND DATABASE FETCH ---
    try {
        const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        listElement.innerHTML = ''; // Clear out the cached ones to replace with full list

        let matchCount = 0;
        let top9ToCache = []; // Array to store the newest top 9

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Grab the first 9 results off the top to save for next time
            if (top9ToCache.length < 9) {
                top9ToCache.push({
                    id: docSnap.id,
                    passage_title: data.passage_title || "Untitled",
                    difficulty: data.difficulty || "Medium"
                });
            }
            
            // Apply Grade filter if selected
            if (filterGrade && data.grade && String(data.grade) !== String(filterGrade)) {
                return;
            }

            // Apply Category filter if selected
            if (filterCategory && data.category && data.category !== filterCategory) {
                return;
            }

            // Apply Keyword filter across difficulty, title (passage_title), or theme
            if (keyword) {
                const difficulty = (data.difficulty || "").toLowerCase();
                const title = (data.passage_title || "").toLowerCase();
                const theme = (data.theme || "").toLowerCase();

                const isMatch = difficulty.includes(keyword) || title.includes(keyword) || theme.includes(keyword);
                if (!isMatch) {
                    return;
                }
            }

            matchCount++;
            const li = document.createElement('li');
            let col = 'rgb(0, 175, 38)'; 

            if (data.difficulty === 'Easy') { 
                col = 'rgb(27, 121, 48)'; 
            } else if (data.difficulty === 'Medium') { 
                col = 'rgb(255, 196, 0)'; 
            } else if (data.difficulty === 'Hard') { 
                col = 'rgb(159, 0, 0)'; 
            } 
            
            const gradeDisplay = data.grade ? `Grade ${data.grade}` : 'Grade N/A';`<span style="cursor:pointer; color: rgb(0, 175, 38);">${data.passage_title}</span> - ${gradeDisplay} - <span style='color: ${col}'>${data.difficulty}</span>`;
            li.innerHTML = `<span style="cursor:pointer; color: rgb(0, 175, 38);">${data.passage_title}</span> - <span style='color: ${col}'>${gradeDisplay}</span>`;
            
            li.addEventListener('click', () => {
                window.location.href = `/public/reader/index.html?id=${docSnap.id}`;
            });

            listElement.appendChild(li);
        });

        if (matchCount === 0) {
            const li = document.createElement('li');
            li.textContent = "No matching readings found.";
            listElement.appendChild(li);
        }

        // --- 3. UPDATE CACHE FOR NEXT LOAD ---
        // Only update the cache with the newest 9 stories if we successfully pulled from Firestore
        localStorage.setItem('cachedStories_top9', JSON.stringify(top9ToCache));

    } catch (error) {
        console.error("Error fetching readings:", error);
    }
}
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        updateLPDisplay(); 
    }
});
const skinss = {
    "skin1": "../defaultpfp.png" ,
    "skin2": "../2.png" ,
    "skin3": "../4.png" ,
    "skin4": "../3.png" ,
    "skin5": "../cry.png" ,
    "skin6": "../1.png" ,
    "skin7": "../buff.png" ,
    "skin8": "../5.png" ,
    "skin9": "../leet.png" ,
    "skin10": "../6.png" 
};

async function updateLPDisplay() {
    if (!currentUser) return;

    // 1. Optimistic Cache Load
    const cachedLP = localStorage.getItem(`LP_${currentUser.uid}`);
    if (cachedLP !== null) {
        document.getElementById('LP').innerText = `${cachedLP} LP`;
    }
    
    const cachedSkin = localStorage.getItem(`equippedSkin_${currentUser.uid}`);
    if (cachedSkin) {
        document.getElementById('profileimg').src = skinss[cachedSkin] || skinss['skin1'];
    }

    // 2. Background Database Fetch
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const currentLP = userSnap.data().LP || 0;
            document.getElementById('LP').innerText = `${currentLP} LP`;
            localStorage.setItem(`LP_${currentUser.uid}`, currentLP);

            const currentskin = userSnap.data().equippedSkin || 'skin1';
            document.getElementById('profileimg').src = skinss[currentskin];
            localStorage.setItem(`equippedSkin_${currentUser.uid}`, currentskin);
        }
    } catch (e) {
        console.error("Error fetching LP/Profile:", e);
    }
}