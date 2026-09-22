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
        updatefavs(user)
        loadprofile(user);
        updateLPDisplay()
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
async function loadprofile(currentUser){
    if (!currentUser) {
        return;
    } 
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentskin = userSnap.data().equippedSkin || 'skin1';
            document.getElementById('profileimg').src = skinss[currentskin];
        }
    } catch (e) {
        console.error("Error fetching skin:", e);
    }
}
async function updatefavs(user){
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            let readingHistory = usersnap.data.readingHistory || {};

            if (Object.keys(readingHistory).length === 0) {
                console.log("No stories read yet.");
            } else {
                const sortedReadings = Object.entries(readingHistory).sort((a, b) => b[1] - a[1]);
                const mostReadStoryId = sortedReadings[0][0];
            }
            document.getElementById('favstory').innerhtml = `Favourite Reading: ${mostReadStoryId}`
        }
    } catch (e) {
        console.error("Error fetching favs", e);
    }
}
async function updateLPDisplay() {
    if (!currentUser) {
        return;
    } 
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentLP = userSnap.data().LP || 0;
            document.getElementById('LP').innerText = `${currentLP} LP`;
        }
    } catch (e) {
        console.error("Error fetching LP:", e);
    }
}
