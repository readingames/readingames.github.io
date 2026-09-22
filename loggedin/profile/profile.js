
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
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

// 1. Define your Master List of all available skins in the game
const allSkinsCatalog = [
    { id: "skin1", name: "Void", img: "../defaultpfp.png" },
    { id: "skin2", name: "Tim", rarity: "Common", img: "../2.png" },
    { id: "skin3", name: "Cool Guy", rarity: "Epic", img: "../4.png" },
    { id: "skin4", name: "Wizard", rarity: "Uncommon", img: "../3.png" },
    { id: "skin5", name: "Cry", rarity: "Uncommon", img: "../cry.png" },
    { id: "skin6", name: "Happy", rarity: "Common", img: "../1.png" },
    { id: "skin7", name: "Buffy", rarity: "Common", img: "../buff.png" },
    { id: "skin8", name: "Astra", rarity: "Epic", img: "../5.png" },
    { id: "skin9", name: "leet", rarity: "Legendary", img: "../leet.png" },
    { id: "skin10", name: "Power", rarity: "Uncommon", img: "../6.png" }
];

// Map your database tags to display names and actual image paths for achievements
const achievementDataMap = {
    "one": { name: "First Lesson", img: "LearningP (2).png" },
    "five": { name: "Five Lessons", img: "LearningP (1).png" },
    "ten": { name: "Ten Lessons", img: "LearningP (3).png" },
    "twenty": { name: "Twenty Lessons", img: "LearningP (4).png" },
    "fifty": { name: "Fifty Lessons", img: "LearningP (5.png" },
    "contribute":{name:"Contributor", img: "LearningP (6).png"}
};

// Toggle Sidebar Event Listener
const item = document.getElementById('profile-icon');
if (item) {
    item.addEventListener('click', function() {
        let ele = document.getElementById('skin');
        if (ele) {
            ele.classList.toggle('sidebar-hidden');
            ele.classList.toggle('sidebar');
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uid = user.uid;

        // 1. OPTIMISTIC CACHE LOAD (Instant Render)
        const cachedProfile = localStorage.getItem(`profileData_${uid}`);
        if (cachedProfile) {
            try {
                const data = JSON.parse(cachedProfile);
                renderProfileUI(uid, data, true); // true indicates it's from cache
            } catch (e) {
                console.error("Error parsing cached profile data", e);
            }
        }

        // 2. BACKGROUND FETCH (Sync with Firestore)
        await loadProfileData(uid);
    } else {
        window.location.href = "login.html";
    }
});

async function loadProfileData(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            const data = snap.data();

            // Save fresh data to localStorage for next time
            localStorage.setItem(`profileData_${uid}`, JSON.stringify(data));

            // Render UI with fresh data
            renderProfileUI(uid, data, false);
        }
    } catch (e) {
        console.error("Error loading user profile:", e);
    }
}

function renderProfileUI(uid, data, isFromCache) {
    const userRef = doc(db, "users", uid);

    // 1. Sidebar Stats
    const readingHistory = data.readingHistory || {};
    const uniqueLessonsCount = Object.keys(readingHistory).length;
    document.getElementById('stat-lessons').innerText = uniqueLessonsCount;
    document.getElementById('stat-points').innerText = data.LP || 0;
    document.getElementById('stat-streak').innerText = data.streak || 0;
    document.getElementById('profile-name').innerText = data.username || "Student";
    
    // 2. Load Achievements into the grid images
    const achievementsGrid = document.getElementById('achievements-grid');
    achievementsGrid.innerHTML = '';
    
    const userAchievements = data.achievements || [];
    const displayList = userAchievements.slice(0, 6);
    
    displayList.forEach(achKey => {
        const achInfo = achievementDataMap[achKey] || { name: "Unknown", img: "placeholder.png" };
        const itemDiv = document.createElement('div');
        itemDiv.className = 'achievement-item';
        itemDiv.innerHTML = `
            <img src="${achInfo.img}" alt="${achInfo.name}" class="achieve-img">
            <span class="achieve-name">${achInfo.name}</span>
        `;
        achievementsGrid.appendChild(itemDiv);
    });

    const placeholdersNeeded = 6 - displayList.length;
    for(let i = 0; i < placeholdersNeeded; i++) {
        const fillerDiv = document.createElement('div');
        fillerDiv.className = 'achievement-item';
        fillerDiv.innerHTML = `
            <img src="Locked.png" alt="Empty slot" class="achieve-img">
            <span class="achieve-name">Locked</span>
        `;
        achievementsGrid.appendChild(fillerDiv);
    }

    // 3. Bottom Box Detailed Stats
    const categories = data.category || [];
    let totalRight = 0;
    let totalWrong = 0;
    let bestTopic = "N/A";
    let highestAccuracy = -1;

    categories.forEach(cat => {
        const parts = cat.split('-');
        const wrong = parseInt(parts.pop());
        const right = parseInt(parts.pop());
        const name = parts.join('-'); 

        totalRight += right;
        totalWrong += wrong;

        const topicTotal = right + wrong;
        if (topicTotal > 0) {
            const accuracy = right / topicTotal;
            if (accuracy > highestAccuracy) {
                highestAccuracy = accuracy;
                bestTopic = name;
            }
        }
    });

    const totalProblems = totalRight + totalWrong;
    const overallAccuracy = totalProblems > 0 ? Math.round((totalRight / totalProblems) * 100) : 0;

    document.getElementById('stat-problems').innerText = totalProblems;
    document.getElementById('stat-accuracy').innerText = `${overallAccuracy}%`;
    document.getElementById('stat-topic').innerText = bestTopic;

    // 4. Skin Catalog Sorting and Rendering
    const purchasedSkins = data.skins || ["skin1"];
    const currentEquippedSkin = data.equippedSkin || "skin1";
    
    const skinsContainer = document.getElementById('skins');
    const lockedContainer = document.getElementById('locked');

    skinsContainer.innerHTML = `<h1>Skins</h1><div id="divider"></div><div class="skin-grid" id="unlocked-grid"></div>`;
    lockedContainer.innerHTML = `<h1>Locked</h1><div id="divider"></div><div class="skin-grid" id="locked-grid"></div>`;

    const unlockedGrid = document.getElementById('unlocked-grid');
    const lockedGrid = document.getElementById('locked-grid');

    allSkinsCatalog.forEach(skin => {
        const skinCard = document.createElement('div');
        skinCard.className = 'skin-item';
        skinCard.dataset.skinId = skin.id;

        // Check if equipped
        if (purchasedSkins.includes(skin.id) && skin.id === currentEquippedSkin) {
            skinCard.classList.add('equipped-skin');
            document.getElementById('profile-img').src = skin.img;
        }

        skinCard.innerHTML = `
            <img src="${skin.img}" alt="${skin.name}" class="skin-circular-img">
            <span class="skin-name">${skin.name}</span>
        `;

        if (purchasedSkins.includes(skin.id)) {
            // Only bind click event listeners if this is the live/fresh render (prevent duplicate listeners on cache load)
            if (!isFromCache) {
                skinCard.addEventListener('click', async () => {
                    try {
                        await updateDoc(userRef, { equippedSkin: skin.id });

                        // Update local cache immediately so local changes stick instantly
                        data.equippedSkin = skin.id;
                        localStorage.setItem(`profileData_${uid}`, JSON.stringify(data));

                        document.querySelectorAll('.skin-item').forEach(item => item.classList.remove('equipped-skin'));
                        skinCard.classList.add('equipped-skin');

                        document.getElementById('profile-img').src = skin.img;
                    } catch (err) {
                        console.error("Failed to equip skin:", err);
                    }
                });
            }

            unlockedGrid.appendChild(skinCard);
        } else {
            lockedGrid.appendChild(skinCard);
        }
    });
}