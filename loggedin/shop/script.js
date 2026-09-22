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

const prices = {
    "Common": 200,
    "Uncommon": 500,
    "Epic": 1000,
    "Legendary": 2000
};

let userLP = 0;
let userSkins = [];
let shopRefreshInterval;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uid = user.uid;

        // --- 1. OPTIMISTIC CACHE LOAD (Instant Render) ---
        const cachedLP = localStorage.getItem(`LP_${uid}`);
        const cachedEquippedSkin = localStorage.getItem(`equippedSkin_${uid}`);
        const cachedOwnedSkins = localStorage.getItem(`skins_${uid}`);
        const cachedShopData = localStorage.getItem('globalShopData');

        // Instantly apply user data
        if (cachedLP !== null) {
            userLP = parseInt(cachedLP, 10);
            document.getElementById('LP').innerText = `${userLP} LP`;
        }
        if (cachedEquippedSkin) {
            document.getElementById('profileimg').src = skinss[cachedEquippedSkin] || skinss['skin1'];
        }
        if (cachedOwnedSkins) {
            try { 
                userSkins = JSON.parse(cachedOwnedSkins); 
            } catch (e) { 
                userSkins = ["skin1"]; 
            }
        }

        // Instantly apply shop data
        if (cachedShopData) {
            try {
                const parsedShop = JSON.parse(cachedShopData);
                renderShopUI(parsedShop.items);
                startTimer(parsedShop.refreshTime);
            } catch (e) {
                console.error("Error parsing cached shop data");
            }
        }

        // --- 2. BACKGROUND FETCH (Sync with Firestore) ---
        await loadUserProfileAndData(uid);
        await initShop(); // Re-renders shop accurately if cache was outdated
    } else {
        window.location.href = "login.html";
    }
});

// COMBINED FUNCTION: One single getDoc reads LP, sets up defaults, updates skins array, and updates profile image
async function loadUserProfileAndData(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            const data = snap.data();
            
            // 1. Process LP & Cache
            userLP = data.LP || 0;
            document.getElementById('LP').innerText = `${userLP} LP`;
            localStorage.setItem(`LP_${uid}`, userLP);
            
            // 2. Process Owned Skins Array & Cache
            if (Array.isArray(data.skins) && data.skins.length > 0) {
                userSkins = data.skins;
            } else {
                userSkins = ["skin1"];
                updateDoc(userRef, { skins: ["skin1"] });
            }
            localStorage.setItem(`skins_${uid}`, JSON.stringify(userSkins));
            
            // 3. Process Profile Picture Display & Cache
            const currentskin = data.equippedSkin || 'skin1';
            document.getElementById('profileimg').src = skinss[currentskin];
            localStorage.setItem(`equippedSkin_${uid}`, currentskin);
        }
    } catch (e) {
        console.error("Error loading user profile or data:", e);
    }
}

function rollRarity() {
    const rand = Math.random(); 
    if (rand < 0.50) return "Common";     
    if (rand < 0.75) return "Uncommon";   
    if (rand < 0.90) return "Epic";       
    return "Legendary";                   
}

function generateNewShopItems() {
    const newItems = [];
    for (let i = 0; i < 6; i++) {
        const targetRarity = rollRarity();
        const pool = skinCatalog.filter(s => s.rarity === targetRarity);
        const safePool = pool.length > 0 ? pool : skinCatalog.filter(s => s.rarity === "Common");
        const randomIndex = Math.floor(Math.random() * safePool.length);
        
        newItems.push({
            skinId: safePool[randomIndex].id,
            rarity: safePool[randomIndex].rarity
        });
    }
    return newItems;
}

async function initShop() {
    const shopRef = doc(db, "shops", "global");
    let shopSnap = await getDoc(shopRef);
    let shopData = shopSnap.exists() ? shopSnap.data() : null;

    const now = new Date().getTime();
    
    // Check if we need to generate a new shop
    if (!shopData || shopData.refreshTime < now) {
        const generatedItems = generateNewShopItems();
        const nextRefresh = now + (60 * 60 * 1000); 
        
        shopData = {
            items: generatedItems,
            refreshTime: nextRefresh
        };
        await setDoc(shopRef, shopData);
    }

    // UPDATE LOCAL CACHE FOR INSTANT LOAD NEXT TIME
    localStorage.setItem('globalShopData', JSON.stringify(shopData));

    renderShopUI(shopData.items);
    startTimer(shopData.refreshTime);
}

function renderShopUI(items) {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';

    items.forEach(item => {
        const skinInfo = skinCatalog.find(s => s.id === item.skinId);
        const cost = prices[item.rarity] || 200;
        
        const isOwned = userSkins.includes(item.skinId);
        const canAfford = userLP >= cost;

        const card = document.createElement('div');
        card.className = 'shop-card';

        let buttonHTML = `<button class="buy-btn" data-id="${item.skinId}" data-cost="${cost}">Buy (${cost} LP)</button>`;
        if (isOwned) {
            buttonHTML = `<button class="buy-btn" disabled>Owned</button>`;
        } else if (!canAfford) {
            buttonHTML = `<button class="buy-btn" disabled>Needs ${cost} LP</button>`;
        }

        card.innerHTML = `
            <div class="card-img-container">
                <img src="${skinInfo.img}" alt="${skinInfo.name}" class="shop-item-img">
                ${buttonHTML}
            </div>
            <div class="rarity rarity-${item.rarity}">${item.rarity}</div>
        `;
        
        grid.appendChild(card);
    });

    document.querySelectorAll('.buy-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const skinId = e.target.getAttribute('data-id');
            const cost = parseInt(e.target.getAttribute('data-cost'));
            await handlePurchase(skinId, cost, e.target);
        });
    });
}

async function handlePurchase(skinId, cost, btnElement) {
    btnElement.disabled = true;
    btnElement.innerText = "Purchasing...";

    const uid = auth.currentUser.uid;
    const userRef = doc(db, "users", uid);

    try {
        await updateDoc(userRef, {
            LP: increment(-cost),
            skins: arrayUnion(skinId)
        });

        // Update local variables
        userLP -= cost;
        userSkins.push(skinId);
        
        // UPDATE LOCAL CACHE
        localStorage.setItem(`LP_${uid}`, userLP);
        localStorage.setItem(`skins_${uid}`, JSON.stringify(userSkins));
        
        document.getElementById('LP').innerText = `${userLP} LP`;
        btnElement.innerText = "Owned";
        
        // OPTIMIZED: Re-render UI from cache instead of doing another database fetch
        const cachedShopData = localStorage.getItem('globalShopData');
        if (cachedShopData) {
            renderShopUI(JSON.parse(cachedShopData).items);
        }

    } catch (error) {
        console.error("Purchase failed:", error);
        alert("Purchase failed. Check console for details.");
        btnElement.disabled = false;
        btnElement.innerText = `Buy (${cost} LP)`;
    }
}

function startTimer(endTime) {
    if (shopRefreshInterval) clearInterval(shopRefreshInterval);
    
    const timerText = document.getElementById('timer');
    
    shopRefreshInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance <= 0) {
            clearInterval(shopRefreshInterval);
            timerText.innerText = "Refreshing...";
            initShop();
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        timerText.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }, 1000);
}
