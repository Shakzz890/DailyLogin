/* auth.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    GithubAuthProvider,
    setPersistence,
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    deleteDoc,
    getDoc,
    collection, 
    query, 
    orderBy, 
    limit, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* === 1. FIREBASE CONFIGURATION === */
const firebaseConfig = {
    apiKey: "AIzaSyBh2QAytkv2e27oCRaMgVdYTru7lSS8Ffo",
    authDomain: "shakzz-tv.firebaseapp.com",
    databaseURL: "https://shakzz-tv-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "shakzz-tv",
    storageBucket: "shakzz-tv.firebasestorage.app",
    messagingSenderId: "640873351782",
    appId: "1:640873351782:web:9fa2bb26142528f898bba7",
    measurementId: "G-Y9BSQ0NT4H"
};

/* === 2. INITIALIZE SERVICES === */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

setPersistence(auth, browserLocalPersistence).catch(console.error);

/* === 3. AUTH ACTIONS === */
window.loginGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (e) { alert("Google Login Failed: " + e.message); }
};

window.loginGithub = async () => {
    try { await signInWithPopup(auth, githubProvider); } 
    catch (e) { alert("GitHub Login Failed: " + e.message); }
};

window.doLogout = async () => {
    try {
        await signOut(auth);
        localStorage.setItem('isLoggedIn', 'false');
        location.reload(); 
    } catch (e) { console.error(e); }
};

/* === 4. WATCH HISTORY (Auto-Save) === */
window.addToHistory = async (item) => {
    const user = auth.currentUser;
    if (!user) return; // Silent return

    try {
        const historyRef = doc(db, "users", user.uid, "history", item.id.toString());
        const data = {
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            media_type: item.media_type || (item.title ? 'movie' : 'tv'),
            vote_average: item.vote_average || 0,
            release_date: item.release_date || item.first_air_date || '',
            timestamp: new Date() // Server timestamp would be better, but Date works for sorting
        };
        await setDoc(historyRef, data);
        // Refresh the "Continue Watching" row on home
        window.loadContinueWatching(); 
    } catch (e) { console.error("Error saving history:", e); }
};

// Also alias it to your old function name just in case
window.saveWatchProgress = window.addToHistory;

/* === 5. WATCHLIST (Favorites) === */
window.toggleWatchlist = async (item) => {
    const user = auth.currentUser;
    if (!user) {
        alert("Please sign in to use the Watchlist!");
        window.toggleAuthDropdown('login');
        return;
    }

    const btn = document.querySelector('.watchlist-btn');
    const docRef = doc(db, "users", user.uid, "watchlist", item.id.toString());

    try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // REMOVE
            await deleteDoc(docRef);
            if(btn) {
                btn.innerHTML = '<i class="far fa-bookmark"></i> Watchlist';
                btn.style.background = "rgba(255,255,255,0.1)";
                btn.style.color = "#fff";
            }
            console.log("Removed from watchlist");
        } else {
            // ADD
            const data = {
                id: item.id,
                title: item.title || item.name,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                media_type: item.media_type || (item.title ? 'movie' : 'tv'),
                vote_average: item.vote_average || 0,
                release_date: item.release_date || item.first_air_date || '',
                added_at: new Date()
            };
            await setDoc(docRef, data);
            if(btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> Added';
                btn.style.background = "#fff";
                btn.style.color = "#000";
            }
            console.log("Added to watchlist");
        }
    } catch (e) {
        console.error("Watchlist error:", e);
    }
};

// Check if item is in watchlist (Updates the button UI)
window.checkWatchlistStatus = async (item) => {
    const user = auth.currentUser;
    const btn = document.querySelector('.watchlist-btn');
    if (!user || !btn) return;

    try {
        const docRef = doc(db, "users", user.uid, "watchlist", item.id.toString());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            btn.style.background = "#fff";
            btn.style.color = "#000";
        } else {
            btn.innerHTML = '<i class="far fa-bookmark"></i> Watchlist';
            btn.style.background = "rgba(255,255,255,0.1)";
            btn.style.color = "#fff";
        }
    } catch (e) { console.error(e); }
};

/* === 6. DISPLAY LISTS (History & Favorites Page) === */
window.openUserList = async (listType) => {
    const user = auth.currentUser;
    if (!user) {
        alert("Please sign in first.");
        window.toggleAuthDropdown('login');
        return;
    }

    const view = document.getElementById('category-view');
    const titleEl = document.getElementById('category-title');
    const gridEl = document.getElementById('category-grid');
    const modal = document.querySelector('.auth-dropdown.show'); // Close dropdown if open

    if (modal) modal.classList.remove('show');
    if (!view || !titleEl || !gridEl) return;

    // Set UI to loading state
    titleEl.innerText = listType === 'watchlist' ? 'My Watchlist' : 'Watch History';
    gridEl.innerHTML = '<div class="spinner" style="margin-top:50px;"></div>';
    view.style.display = 'flex';

    try {
        // Decide which collection to fetch
        const collectionName = listType === 'watchlist' ? 'watchlist' : 'history';
        const sortField = listType === 'watchlist' ? 'added_at' : 'timestamp';
        
        const colRef = collection(db, "users", user.uid, collectionName);
        // Get last 50 items
        const q = query(colRef, orderBy(sortField, "desc"), limit(50));
        const snapshot = await getDocs(q);

        gridEl.innerHTML = ''; // Clear spinner

        if (snapshot.empty) {
            gridEl.innerHTML = '<div style="color:#888; width:100%; text-align:center; margin-top:50px;">List is empty.</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            renderCard(data, gridEl);
        });

    } catch (e) {
        console.error("Error loading list:", e);
        gridEl.innerHTML = '<div style="color:red; text-align:center;">Error loading list.</div>';
    }
};

/* === 7. HELPER: RENDER CARD (Reused) === */
function renderCard(item, container) {
    const card = document.createElement('div');
    card.className = 'movie-card fade-in';
    
    // Fix image paths
    const poster = item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : 'logo.png';
    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : 'NR';
    const year = (item.release_date || 'N/A').split('-')[0];
    const typeLabel = item.media_type === 'tv' ? 'TV Series' : 'Movie';

    card.onclick = () => {
        window.showDetailView(item); // Assumes showDetailView is in script.js
    };

    card.innerHTML = `
        <div class="card-poster">
            <div class="rating-badge"><i class="fas fa-star"></i> ${rating}</div>
            <img src="${poster}" loading="lazy" onerror="this.src='logo.png'">
        </div>
        <div class="card-info">
            <div class="card-title">${item.title}</div>
            <div class="card-meta">
                <span>${year}</span>
                <span class="dot-sep"></span>
                <span>${typeLabel}</span>
            </div>
        </div>
    `;
    container.appendChild(card);
}

/* === 8. CONTINUE WATCHING (Home Row) === */
window.loadContinueWatching = async () => {
    const user = auth.currentUser;
    const row = document.getElementById('continue-watching-row');
    const list = document.getElementById('continue-list');

    if (!user || !row || !list) {
        if(!localStorage.getItem('isLoggedIn') && row) row.style.display = 'none';
        return;
    }

    try {
        const historyRef = collection(db, "users", user.uid, "history");
        const q = query(historyRef, orderBy("timestamp", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            row.style.display = 'none';
            return;
        }

        list.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            renderCard(data, list);
        });
        row.style.display = 'block';

    } catch (e) { console.error(e); }
};

/* === 9. UI STATE MANAGER === */
onAuthStateChanged(auth, (user) => {
    const loggedOutDiv = document.getElementById('logged-out-state');
    const loggedInDiv = document.getElementById('logged-in-state');
    const userAvatar = document.querySelector('.nav-avatar');
    const menuAvatar = document.querySelector('.menu-avatar');
    const userName = document.querySelector('.user-name');

    document.querySelectorAll('.auth-dropdown').forEach(d => d.classList.remove('show'));

    if (user) {
        localStorage.setItem('isLoggedIn', 'true');
        if(loggedOutDiv) loggedOutDiv.style.display = 'none';
        if(loggedInDiv) loggedInDiv.style.display = 'block';
        
        if(userName) userName.innerText = user.displayName || "User";
        if(user.photoURL) {
            if(userAvatar) userAvatar.src = user.photoURL;
            if(menuAvatar) menuAvatar.src = user.photoURL;
        }
        window.loadContinueWatching();
    } else {
        localStorage.setItem('isLoggedIn', 'false');
        if(loggedInDiv) loggedInDiv.style.display = 'none';
        if(loggedOutDiv) loggedOutDiv.style.display = 'block';
        const row = document.getElementById('continue-watching-row');
        if(row) row.style.display = 'none';
    }
});

/* === 10. HELPERS === */
window.toggleAuthDropdown = (type) => {
    const loginDrop = document.getElementById('login-dropdown');
    const profileDrop = document.getElementById('profile-dropdown');
    
    if (type === 'login') {
        if(loginDrop) loginDrop.classList.toggle('show');
        if(profileDrop) profileDrop.classList.remove('show');
    } else if (type === 'profile') {
        if(profileDrop) profileDrop.classList.toggle('show');
        if(loginDrop) loginDrop.classList.remove('show');
    }
};
