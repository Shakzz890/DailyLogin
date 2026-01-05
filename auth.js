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

// FORCE PERSISTENCE (Keeps user logged in on refresh)
setPersistence(auth, browserLocalPersistence).catch(console.error);

/* === 3. AUTH ACTIONS === */
window.loginGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        alert("Google Login Failed: " + error.message);
    }
};

window.loginGithub = async () => {
    try {
        await signInWithPopup(auth, githubProvider);
    } catch (error) {
        if (error.code === 'auth/account-exists-with-different-credential') {
            alert("Email already linked to Google. Please sign in with Google.");
        } else {
            alert("GitHub Login Failed: " + error.message);
        }
    }
};

window.doLogout = async () => {
    try {
        await signOut(auth);
        localStorage.setItem('isLoggedIn', 'false');
        location.reload(); 
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

/* === 4. WATCH HISTORY LOGIC === */

// CALLED BY SCRIPT.JS
window.saveWatchProgress = async (item, season = null, episode = null) => {
    const user = auth.currentUser;
    if (!user) return; 

    try {
        const historyRef = doc(db, "users", user.uid, "history", item.id.toString());
        
        // Prepare data matching your script.js structure
        const data = {
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            media_type: item.media_type || 'movie',
            timestamp: new Date()
        };

        // Add Season/Ep only if they exist (for TV)
        if (season) data.season = season;
        if (episode) data.episode = episode;

        await setDoc(historyRef, data);
        
        // Refresh the UI list immediately
        window.loadContinueWatching();
        
    } catch (error) {
        console.error("Failed to save history:", error);
    }
};

// LOAD LIST ON HOME PAGE
window.loadContinueWatching = async () => {
    const user = auth.currentUser;
    const row = document.getElementById('continue-watching-row');
    const list = document.getElementById('continue-list');

    if (!user || !row || !list) {
        if(row) row.style.display = 'none';
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
            const card = document.createElement('div');
            card.className = 'movie-card';
            
            let label = "Movie";
            if (data.season && data.episode) {
                label = `S${data.season}:E${data.episode}`;
            }

            // Click Handler: Re-opens the player with correct Season/Episode
            card.onclick = () => {
                const item = {
                    id: data.id,
                    title: data.title,
                    name: data.title, 
                    poster_path: data.poster_path,
                    backdrop_path: data.backdrop_path,
                    media_type: data.media_type,
                    // Fake date ensures script.js treats it as TV if needed
                    first_air_date: data.media_type === 'tv' ? '2020-01-01' : null 
                };
                
                window.showDetailView(item);
                
                // If TV, auto-select the dropdowns
                if(data.season && data.episode) {
                   setTimeout(() => {
                       const sSelect = document.getElementById('season-select');
                       if(sSelect) {
                           sSelect.value = data.season;
                           // Trigger change to load episodes
                           if(typeof window.onSeasonChange === 'function') window.onSeasonChange();
                           
                           // Select specific episode after episodes load
                           setTimeout(() => {
                               const epGrid = document.getElementById('episode-grid');
                               if(epGrid) {
                                   const eps = epGrid.children;
                                   if(eps[data.episode - 1]) eps[data.episode - 1].click();
                               }
                           }, 500);
                       }
                   }, 800);
                }
            };

            card.innerHTML = `
                <div class="coming-label" style="background: #e50914;">${label}</div>
                <img src="https://image.tmdb.org/t/p/w300${data.poster_path}">
                <div class="card-title">${data.title}</div>
            `;
            list.appendChild(card);
        });
        row.style.display = 'block';

    } catch (error) {
        console.error("Error loading history:", error);
    }
};

// === DEBUG FUNCTION FOR YOUR BUTTON ===
window.testSaveHistory = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("Please Log In first!");
        return;
    }
    
    // Creates a Fake Movie entry
    const fakeMovie = {
        id: 550, // Fight Club ID
        title: "Test Movie (Fight Club)",
        poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
        media_type: "movie"
    };

    alert("Saving test movie...");
    await window.saveWatchProgress(fakeMovie);
    alert("Saved! Check the top of the home page.");
};

/* === 5. UI STATE MANAGER === */
onAuthStateChanged(auth, (user) => {
    const loggedOutDiv = document.getElementById('logged-out-state');
    const loggedInDiv = document.getElementById('logged-in-state');
    const userAvatar = document.querySelector('.nav-avatar');
    const menuAvatar = document.querySelector('.menu-avatar');
    const userName = document.querySelector('.user-name');

    document.querySelectorAll('.auth-dropdown').forEach(d => d.classList.remove('show'));

    if (user) {
        // LOGGED IN
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
        // LOGGED OUT
        localStorage.setItem('isLoggedIn', 'false');
        if(loggedInDiv) loggedInDiv.style.display = 'none';
        if(loggedOutDiv) loggedOutDiv.style.display = 'block';
        
        const historyRow = document.getElementById('continue-watching-row');
        if(historyRow) historyRow.style.display = 'none';
    }
});

/* === 6. HELPERS === */
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
