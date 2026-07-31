import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app)


window.addEventListener("load", function() {
    loadRecommendations()
});
async function loadRecommendations() {
            const listElement = document.getElementById('recommendation-list');
            listElement.innerHTML = ''; 
            const q = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(5));
            document.getElementById('loading-overlay').style.display = 'flex'
            const querySnapshot = await getDocs(q);
            document.getElementById('loading-overlay').style.display = 'none'

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const li = document.createElement('li');
                let col = 'rgb(0, 175, 38)'; 

                if(data.difficulty == 'Easy'){ 
                    col = 'rgb(0, 246, 53)'; 
                } else if(data.difficulty == 'Medium'){ 
                    col = 'rgb(255, 196, 0)'; 
                } else if(data.difficulty == 'Hard'){ 
                    col = 'rgb(159, 0, 0)'; 
                } 

                li.innerHTML = `<span style="cursor:pointer; color: rgb(0, 175, 38);">${data.passage_title}</span> - <span style='color: ${col}'>${data.difficulty}</span>`;
                li.addEventListener('click', () => {
                    console.log("Opening story:", doc.id);
                    window.location.href = `/public/reader/index.html?id=${doc.id}`
                });

                listElement.appendChild(li);
            });
        }