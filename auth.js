/* === CORRECTED AUTH.JS === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithRedirect, 
    getRedirectResult, 
    signOut, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    GithubAuthProvider,
    browserLocalPersistence,
    setPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    collection, 
    query, 
    orderBy, 
    limit, 
    getDocs,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🔥 Firebase initialized. Version: FIXED-2024");

// Forced persistence
setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("✅ Persistence set to local"))
    .catch((error) => console.error("❌ Persistence failed:", error));

/* === AUTH STATE LISTENER === */
onAuthStateChanged(auth, async (user) => {
    const loggedOutDiv = document.getElementById('logged-out-state');
    const loggedInDiv = document.getElementById('logged-in-state');
    const userAvatar = document.querySelector('.nav-avatar');
    const menuAvatar = document.querySelector('.menu-avatar');
    const userName = document.querySelector('.user-name');

    document.querySelectorAll('.auth-dropdown').forEach(d => d.classList.remove('show'));

    if (user) {
        console.log("✅ User logged in:", user.email);
        if(loggedOutDiv) loggedOutDiv.style.display = 'none';
        if(loggedInDiv) loggedInDiv.style.display = 'block';
        if(userName) userName.innerText = user.displayName || "User";
        if(user.photoURL) {
            if(userAvatar) userAvatar.src = user.photoURL;
            if(menuAvatar) menuAvatar.src = user.photoURL;
        }
        
        // Load history AFTER DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => window.loadContinueWatching());
        } else {
            await window.loadContinueWatching();
        }
    } else {
        console.log("ℹ️ User logged out");
        if(loggedInDiv) loggedInDiv.style.display = 'none';
        if(loggedOutDiv) loggedOutDiv.style.display = 'block';
        
        const historyRow = document.getElementById('continue-watching-row');
        if(historyRow) historyRow.style.display = 'none';
    }
});

/* === SAVE WATCH PROGRESS (Robust Version) === */
window.saveWatchProgress = async (item, season = null, episode = null) => {
    const user = auth.currentUser;
    if (!user) {
        console.warn("⚠️ Cannot save: User not logged in");
        return;
    }
    
    // Validate data
    if (!item?.id) {
        console.error("❌ Missing item.id");
        alert("Error: Cannot save - invalid movie data");
        return;
    }

    try {
        const historyRef = doc(db, "users", user.uid, "history", item.id.toString());
        await setDoc(historyRef, {
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            media_type: item.media_type || 'movie',
            season: season,
            episode: episode,
            timestamp: serverTimestamp()
        });
        
        console.log("✅ History saved:", item.title || item.name);
        
        // Force refresh the continue watching row
        await window.loadContinueWatching();
    } catch (error) {
        console.error("❌ Firestore Error:", error.code, error.message);
        alert(`Failed to save: ${error.message}\n\nCheck console for error code.`);
    }
};

/* === LOAD CONTINUE WATCHING === */
window.loadContinueWatching = async () => {
    const user = auth.currentUser;
    const row = document.getElementById('continue-watching-row');
    const list = document.getElementById('continue-list');

    if (!user) {
        if(row) row.style.display = 'none';
        return;
    }
    
    if (!row || !list) {
        console.error("❌ DOM Error: Missing #continue-watching-row or #continue-list");
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
            if (data.season && data.episode) label = `S${data.season} : E${data.episode}`;

            card.onclick = () => {
                const item = {
                    id: data.id,
                    title: data.title,
                    name: data.title, 
                    poster_path: data.poster_path,
                    backdrop_path: data.backdrop_path,
                    media_type: data.media_type,
                    first_air_date: data.media_type === 'tv' ? '2020-01-01' : null
                };
                showDetailView(item);
                
                // Auto-select season/episode for TV shows
                if(data.season && data.episode) {
                   setTimeout(() => {
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

            // FIX: Remove space in image URL
            card.innerHTML = `
                <div class="coming-label" style="background: #e50914;">${label}</div>
                <img src="https://image.tmdb.org/t/p/w300${data.poster_path}" loading="lazy">
                <div class="card-title">${data.title}</div>
            `;
            list.appendChild(card);
        });
        
        row.style.display = 'block';
        console.log(`✅ Loaded ${querySnapshot.size} history items`);
    } catch (error) {
        console.error("❌ Error loading history:", error.code, error.message);
        alert(`Cannot load Continue Watching: ${error.message}`);
    }
};

/* === LOGIN FUNCTIONS === */
window.loginGoogle = () => signInWithRedirect(auth, new GoogleAuthProvider());
window.loginGithub = () => signInWithRedirect(auth, new GithubAuthProvider());

window.doLogout = async () => {
    try {
        await signOut(auth);
        location.reload(); 
    } catch (error) {
        alert("Logout Error: " + error.message);
    }
};

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

/* === TEST BUTTON (Add to HTML) === */
window.testSaveHistory = () => {
    const testItem = {
        id: 550, // Fight Club
        title: "Fight Club Test",
        poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        backdrop_path: "/mMZRKY3zRz3Zi8VkhSJfSHsrCgt.jpg",
        media_type: "movie"
    };
    window.saveWatchProgress(testItem);
};
