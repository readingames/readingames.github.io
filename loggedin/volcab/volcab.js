import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

const skinss = {
    "skin1": "../defaultpfp.png",
    "skin2": "../2.png",
    "skin3": "../4.png",
    "skin4": "../3.png",
    "skin5": "../cry.png",
    "skin6": "../1.png",
    "skin7": "../buff.png",
    "skin8": "../5.png",
    "skin9": "../leet.png",
    "skin10": "../6.png"
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uid = user.uid;
        
        // Optimistic Cache Load for LP & Profile Picture
        const cachedLP = localStorage.getItem(`LP_${uid}`);
        const cachedSkin = localStorage.getItem(`equippedSkin_${uid}`);
        if (cachedLP !== null) document.getElementById('LP').innerText = `${cachedLP} LP`;
        if (cachedSkin) {
            document.getElementById('profileimg').src = skinss[cachedSkin] || skinss['skin1'];
        }

        // Fetch fresh user data and vocabulary list
        await loadUserData(uid);
        await loadVocabulary(uid);
    } else {
        window.location.href = "login.html";
    }
});

async function loadUserData(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const data = snap.data();
            const userLP = data.LP || 0;
            document.getElementById('LP').innerText = `${userLP} LP`;
            localStorage.setItem(`LP_${uid}`, userLP);

            const currentSkin = data.equippedSkin || 'skin1';
            document.getElementById('profileimg').src = skinss[currentSkin] || skinss['skin1'];
            localStorage.setItem(`equippedSkin_${uid}`, currentSkin);
        }
    } catch (e) {
        console.error("Error loading user data:", e);
    }
}

async function loadVocabulary(uid) {
    const grid = document.getElementById('vocabulary-grid');
    grid.innerHTML = '<p style="font-size: 20px; color: #555;">Loading vocabulary...</p>';

    try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            grid.innerHTML = '<p style="font-size: 20px; color: #555;">User profile not found.</p>';
            return;
        }

        const data = snap.data();
        const words = data.vocabulary || [];

        if (words.length === 0) {
            grid.innerHTML = '<p style="font-size: 20px; color: #555;">No vocabulary words saved yet!</p>';
            return;
        }

        grid.innerHTML = '';

        // Simultaneously fetch definitions for all words using Promise.all
        const definitionPromises = words.map(async (word) => {
            try {
                const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
                if (!response.ok) {
                    return { word, definition: "Definition not available." };
                }
                const result = await response.json();
                const definition = result[0]?.meanings[0]?.definitions[0]?.definition || "Definition not found.";
                return { word, definition };
            } catch (err) {
                console.error(`Failed to fetch definition for ${word}:`, err);
                return { word, definition: "Could not load definition." };
            }
        });

        const vocabItems = await Promise.all(definitionPromises);

        vocabItems.forEach(({ word, definition }) => {
            const card = document.createElement('div');
            card.className = 'vocab-card';
            card.dataset.word = word;

            card.innerHTML = `
                <button class="delete-btn" title="Delete word">
                    <img src="trashcan.png" alt="Delete">
                </button>
                <h2 class="vocab-word">${word}</h2>
                <div class="vocab-definition"><strong>Definition:</strong> ${definition}</div>
            `;

            // Delete button event listener with confirmation
            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete "${word}" from your vocabulary?`)) {
                    try {
                        await updateDoc(userRef, {
                            vocabulary: arrayRemove(word)
                        });
                        card.remove();
                        
                        // Show empty state if all cards are deleted
                        if (grid.children.length === 0) {
                            grid.innerHTML = '<p style="font-size: 20px; color: #555;">No vocabulary words saved yet!</p>';
                        }
                    } catch (error) {
                        console.error("Error removing word:", error);
                        alert("Failed to delete word. Please try again.");
                    }
                }
            });

            grid.appendChild(card);
        });

    } catch (e) {
        console.error("Error loading vocabulary:", e);
        grid.innerHTML = '<p style="font-size: 20px; color: #555;">Error loading vocabulary words.</p>';
    }
}