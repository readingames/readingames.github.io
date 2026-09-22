import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Your provided Firebase config
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

// Game Catalog (Add your thumbnail image paths here)
const GAME_CATALOG = [
    { id: 'ratescape', name: 'Ratescape', price: 500, src: 'ratescape/rateescape.html', img: '../Ratescape.png' },
    { id: 'cubicdash', name: 'Cubic Dash', price: 300, src: 'cubicdash/index.html', img: '../Ratescape.png' },
    { id: 'overthepower', name: 'Over The Power', price: 5, src: 'overthepower/index.html', img: '../Ratescape.png' },
    { id: '2048', name: '2048', price: 5, src: '2048/index.html', img: '../Ratescape.png' },
    { id: 'asteroids', name: 'Asteroids', price: 100, src: 'asteroids/index.html', img: '../Ratescape.png' }
];

let userLP = 0;
let userGames = [];

// Initialize Auth
// Initialize Auth
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uid = user.uid;

        // 1. OPTIMISTIC CACHE LOAD (Instant Render)
        const cachedLP = localStorage.getItem(`LP_${uid}`);
        const cachedSkin = localStorage.getItem(`equippedSkin_${uid}`);
        const cachedGames = localStorage.getItem(`games_${uid}`);

        if (cachedLP !== null) {
            userLP = parseInt(cachedLP, 10);
            document.getElementById('LP').innerHTML = `${userLP} LP`;
        }
        if (cachedSkin) {
            document.getElementById('profileimg').src = skinss[cachedSkin] || skinss['skin1'];
        }
        if (cachedGames) {
            try {
                userGames = JSON.parse(cachedGames);
            } catch (e) {
                userGames = [];
            }
        }

        // If we found ANY cache, render the UI instantly so the user doesn't stare at a blank screen
        if (cachedLP !== null || cachedGames) {
            renderGamesUI();
        }

        // 2. BACKGROUND FETCH (Sync with Firestore)
        await loadUserData(uid);
        
        // Re-render in case they bought a game on another device and the cache was outdated
        renderGamesUI();

    } else {
        console.warn("User not logged in.");
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

// Load user data to check LP and Games
async function loadUserData(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            const data = snap.data();
            
            // Sync LP
            userLP = data.LP || 0;
            document.getElementById('LP').innerHTML = `${userLP} LP`;
            localStorage.setItem(`LP_${uid}`, userLP);

            // Sync Skin
            const currentskin = data.equippedSkin || 'skin1';
            document.getElementById('profileimg').src = skinss[currentskin];
            localStorage.setItem(`equippedSkin_${uid}`, currentskin);

            // Sync Games
            if (Array.isArray(data.games)) {
                userGames = data.games;
            } else {
                userGames = [];
                updateDoc(userRef, { games: [] });
            }
            localStorage.setItem(`games_${uid}`, JSON.stringify(userGames));
        }
    } catch (error) {
        console.error("Error loading fresh user data:", error);
    }
}
console.log(userLP)
function renderGamesUI() {
    const grid = document.querySelector('.games-grid');
    grid.innerHTML = ''; // Clear existing content

    GAME_CATALOG.forEach(game => {
        const isOwned = userGames.includes(game.id);
        const canAfford = userLP >= game.price;
        console.log(canAfford, userLP)
        const card = document.createElement('div');
        card.className = 'game-card';

        // Determine what the button should display
        let buttonHTML = '';
        if (isOwned) {
            buttonHTML = `<button class="buy-btn" disabled>Owned</button>`;
            // If owned, clicking the whole card opens the game
            card.onclick = () => window.openGame(game.id);
        } else if (!canAfford) {
            buttonHTML = `<button class="buy-btn" disabled> Needs${game.price} LP</button>`;
        } else {
            buttonHTML = `<button class="buy-btn can-buy" data-id="${game.id}" data-price="${game.price}">Buy (${game.price} LP)</button>`;
        }

        // Generate the card layout with image thumbnail
        card.innerHTML = `
            <div class="popup-thumb">
                <img src="${game.img}" alt="${game.name}" class="game-thumb-img" onerror="this.src='images/default-thumb.png'">
            </div>
            <div class="game-info-popup">
                <p>${game.name}</p>
                ${buttonHTML}
            </div>
        `;
        
        grid.appendChild(card);
    });

    // Attach purchase logic to active "Buy" buttons
    document.querySelectorAll('.can-buy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevents the card's onclick (opening game) from firing
            const gameId = e.target.getAttribute('data-id');
            const cost = parseInt(e.target.getAttribute('data-price'));
            await handlePurchase(gameId, cost, e.target);
        });
    });
}

async function handlePurchase(gameId, cost, btnElement) {
    btnElement.disabled = true;
    btnElement.innerText = "Purchasing...";

    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);

    try {
        await updateDoc(userRef, {
            LP: increment(-cost),
            games: arrayUnion(gameId)
        });

        // Update local variables
        userLP -= cost;
        userGames.push(gameId);
        
        // UPDATE LOCAL CACHE SO REFRESHES ARE INSTANT
        localStorage.setItem(`LP_${uid}`, userLP);
        localStorage.setItem(`games_${uid}`, JSON.stringify(userGames));
        
        // Re-render UI to update the button to "Owned" and make the card clickable
        renderGamesUI();
    } catch (error) {
        console.error("Purchase failed:", error);
        alert("Purchase failed. Check console for details.");
        btnElement.disabled = false;
        btnElement.innerText = `Buy (${cost} LP)`;
    }
}
// Game Launcher Helper
window.openGame = function(gameId) {
    const game = GAME_CATALOG.find(g => g.id === gameId);
    if (!game) return;

    const dashboardView = document.getElementById('games-dashboard');
    const gamePlayView = document.getElementById('game-play-view');
    const activeGameTitle = document.getElementById('active-game-title');
    const iframe = document.getElementById('game-iframe');

    dashboardView.classList.add('hidden');
    gamePlayView.classList.remove('hidden');

    activeGameTitle.innerText = game.name;
    iframe.src = game.src;
};

// Close Game Logic
window.closeGame = function() {
    const dashboardView = document.getElementById('games-dashboard');
    const gamePlayView = document.getElementById('game-play-view');
    const iframe = document.getElementById('game-iframe');

    iframe.src = ""; // Unloads the game memory
    gamePlayView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
};