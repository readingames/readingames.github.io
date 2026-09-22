import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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

// Your exact skin catalog
const skinCatalog = [
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

const prices = {
    "Common": 200,
    "Uncommon": 500,
    "Epic": 1000,
    "Legendary": 2000
};

let userLP = 0;
let userSkins = [];
let shopRefreshInterval;

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uid = user.uid;
        
        // Quick cache check for immediate UI render
        const cachedLP = localStorage.getItem(`LP_${uid}`);
        const cachedSkin = localStorage.getItem(`equippedSkin_${uid}`);
        if (cachedLP !== null) document.getElementById('LP').innerText = `${cachedLP} LP`;
        if (cachedSkin) {
            const skinss = { "skin1": "../defaultpfp.png", "skin2": "../2.png", "skin3": "../4.png", "skin4": "../3.png", "skin5": "../cry.png", "skin6": "../1.png", "skin7": "../buff.png", "skin8": "../5.png", "skin9": "../leet.png", "skin10": "../6.png" };
            document.getElementById('profileimg').src = skinss[cachedSkin] || skinss['skin1'];
        }

        // Fetch fresh data
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            const data = snap.data();
            const userLP = data.LP || 0;
            document.getElementById('LP').innerText = `${userLP} LP`;
            localStorage.setItem(`LP_${uid}`, userLP);

            const currentSkin = data.equippedSkin || 'skin1';
            localStorage.setItem(`equippedSkin_${uid}`, currentSkin);
        }

        // Handle Submit Button Click Event for Achievement Check
        const form = document.getElementById('submit-form');
        form.addEventListener('submit', async (e) => {
            try {
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const achievements = userData.achievements || [];

                    // Check if 'contribute' is already present in the array
                    if (!achievements.includes("contribute")) {
                        await updateDoc(userRef, {
                            achievements: arrayUnion("contribute")
                        });
                    }
                }
            } catch (error) {
                console.error("Error updating contributor achievement:", error);
            }
            // Formspree submission will proceed naturally after this async check triggers
        });

    } else {
        window.location.href = "login.html";
    }
});

async function loadprofile(currentUser) {
    if (!currentUser) {
        return;
    } 
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentskin = userSnap.data().equippedSkin || 'skin1';
            document.getElementById('profileimg').src = skinss[currentskin];
            localStorage.setItem(`equippedSkin_${currentUser.uid}`, currentskin);
        }
    } catch (e) {
        console.error("Error fetching skin:", e);
    }
}

async function loadUserData(uid) {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        const data = snap.data();
        userLP = data.LP || 0;
        
        // If skins array is missing or empty, default to ["skin1"], otherwise use existing array safely
        if (Array.isArray(data.skins) && data.skins.length > 0) {
            userSkins = data.skins;
        } else {
            userSkins = ["skin1"];
            // Initialize their account with skin1 if it was completely empty
            await updateDoc(userRef, { skins: ["skin1"] });
        }
        
        document.getElementById('LP').innerText = `${userLP} LP`;

        // Update local storage cache
        localStorage.setItem(`LP_${uid}`, userLP);
        localStorage.setItem(`skins_${uid}`, JSON.stringify(userSkins));
    }
}