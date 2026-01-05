/* auth.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    GithubAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
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
const db = getFirestore(app); // Database service

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

/* === 3. AUTH ACTIONS === */

// Google Login
window.loginGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
        // UI updates automatically via onAuthStateChanged
    } catch (error) {
        alert("Google Login Error: " + error.message);
    }
};

// GitHub Login
window.loginGithub = async () => {
    try {
        await signInWithPopup(auth, githubProvider);
    } catch (error) {
        if (error.code === 'auth/account-exists-with-different-credential') {
            alert("This email is already linked to another provider (like Google).");
        } else {
            alert("GitHub Login Error: " + error.message);
        }
    }
};

// Logout
window.doLogout = async () => {
    try {
        await signOut(auth);
        localStorage.setItem('isLoggedIn', 'false');
        location.reload(); // Reloads page to clear the "Continue Watching" row immediately
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

/* === 4. WATCH HISTORY LOGIC === */

// Save Movie/Episode Progress
window.saveWatchProgress = async (item, season = null, episode = null) => {
    const user = auth.currentUser;
    if (!user) return; // Ignore if guest

    try {
        // Create a reference to where this movie is saved
        const historyRef = doc(db, "users", user.uid, "history", item.id.toString());
        
        await setDoc(historyRef, {
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            media_type: item.media_type || 'movie',
            season: season,
            episode: episode,
            timestamp: new Date() // Saves the exact time
        });
        
        // Refresh the list immediately so they see it
        window.loadContinueWatching();
    } catch (error) {
        console.error("Failed to save history:", error);
    }
};

// Load "Continue Watching" List
window.loadContinueWatching = async () => {
    const user = auth.currentUser;
    const row = document.getElementById('continue-watching-row');
    const list = document.getElementById('continue-list');

    // Safety checks
    if (!user || !row || !list) {
        if(row) row.style.display = 'none';
        return;
    }

    try {
        // Get top 10 most recently watched
        const historyRef = collection(db, "users", user.uid, "history");
        const q = query(historyRef, orderBy("timestamp", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            row.style.display = 'none';
            return;
        }

        list.innerHTML = ''; // Clear old list
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'movie-card';
            
            // Format Label: "S1 : E4" or "Movie"
            let label = "Movie";
            if (data.season && data.episode) {
                label = `S${data.season} : E${data.episode}`;
            }

            // Click to Resume
            card.onclick = () => {
                // We recreate the item object for the player
                const item = {
                    id: data.id,
                    title: data.title,
                    name: data.title, 
                    poster_path: data.poster_path,
                    backdrop_path: data.backdrop_path,
                    media_type: data.media_type,
                    first_air_date: data.media_type === 'tv' ? '2020-01-01' : null // Fake date to trigger TV logic
                };
                
                // Open the player
                window.showDetailView(item);
                
                // If it's a TV show, try to select the specific season/episode
                if(data.season && data.episode) {
                   setTimeout(() => {
                       // This is a "best effort" to switch the dropdowns automatically
                       const sSelect = document.getElementById('season-select');
                       if(sSelect) {
                           sSelect.value = data.season;
                           if(typeof window.onSeasonChange === 'function') window.onSeasonChange();
                           setTimeout(() => {
                               if(typeof window.changeDetailServer === 'function') window.changeDetailServer(data.season, data.episode);
                           }, 500);
                       }
                   }, 1000);
                }
            };

            card.innerHTML = `
                <div class="coming-label" style="background: #e50914;">${label}</div>
                <img src="https://image.tmdb.org/t/p/w300${data.poster_path}">
                <div class="card-title">${data.title}</div>
            `;
            list.appendChild(card);
        });

        row.style.display = 'block'; // Show the section

    } catch (error) {
        console.error("Error loading history:", error);
    }
};

/* === 5. UI STATE MANAGER === */
onAuthStateChanged(auth, (user) => {
    const loggedOutDiv = document.getElementById('logged-out-state');
    const loggedInDiv = document.getElementById('logged-in-state');
    const userAvatar = document.querySelector('.nav-avatar');
    const menuAvatar = document.querySelector('.menu-avatar');
    const userName = document.querySelector('.user-name');

    // 1. Close any open menus
    document.querySelectorAll('.auth-dropdown').forEach(d => d.classList.remove('show'));

    if (user) {
        // --- USER IS LOGGED IN ---
        localStorage.setItem('isLoggedIn', 'true');
        
        if(loggedOutDiv) loggedOutDiv.style.display = 'none';
        if(loggedInDiv) loggedInDiv.style.display = 'block';
        
        if(userName) userName.innerText = user.displayName || "User";
        if(user.photoURL) {
            if(userAvatar) userAvatar.src = user.photoURL;
            if(menuAvatar) menuAvatar.src = user.photoURL;
        }

        // Load their specific history
        window.loadContinueWatching();

    } else {
        // --- USER IS LOGGED OUT ---
        localStorage.setItem('isLoggedIn', 'false');
        
        if(loggedInDiv) loggedInDiv.style.display = 'none';
        if(loggedOutDiv) loggedOutDiv.style.display = 'block';

        // Hide the history row
        const historyRow = document.getElementById('continue-watching-row');
        if(historyRow) historyRow.style.display = 'none';
    }
});

/* === 6. HELPER FUNCTIONS === */
window.toggleAuthDropdown = (type) => {
    const loginDrop = document.getElementById('login-dropdown');
    const profileDrop = document.getElementById('profile-dropdown');
    
    if (type === 'login') {
        loginDrop.classList.toggle('show');
        if(profileDrop) profileDrop.classList.remove('show');
    } else if (type === 'profile') {
        profileDrop.classList.toggle('show');
        if(loginDrop) loginDrop.classList.remove('show');
    }
};
