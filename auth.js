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

setPersistence(auth, browserLocalPersistence).catch(console.error);

/* === 3. INSTANT SKELETON LOADER === */
// Shows shimmering skeletons IMMEDIATELY if user is logged in
if (localStorage.getItem('isLoggedIn') === 'true') {
    const row = document.getElementById('continue-watching-row');
    const list = document.getElementById('continue-list');
    if (row && list) {
        row.style.display = 'block';
        list.innerHTML = `
            <div class="skeleton-card skeleton-shimmer"></div>
            <div class="skeleton-card skeleton-shimmer"></div>
            <div class="skeleton-card skeleton-shimmer"></div>
            <div class="skeleton-card skeleton-shimmer"></div>
            <div class="skeleton-card skeleton-shimmer"></div>
        `;
    }
}

/* === 4. AUTH ACTIONS === */
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

/* === 5. WATCH HISTORY LOGIC === */
window.saveWatchProgress = async (item, season = null, episode = null) => {
    const user = auth.currentUser;
    if (!user) return; 

    try {
        const historyRef = doc(db, "users", user.uid, "history", item.id.toString());
        
        const data = {
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            media_type: item.media_type || 'movie',
            timestamp: new Date()
        };
        if (season) data.season = season;
        if (episode) data.episode = episode;

        await setDoc(historyRef, data);
        window.loadContinueWatching(); 
        
    } catch (e) { console.error(e); }
};

window.loadContinueWatching = async () => {
    const user = auth.currentUser;
    const row = document.getElementById('continue-watching-row');
    const list = document.getElementById('continue-list');

    if (!user || !row || !list) {
        if(!localStorage.getItem('isLoggedIn')) row.style.display = 'none';
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
            // ADDED: 'fade-in' class here
            card.className = 'movie-card fade-in'; 
            
            let label = "Movie";
            if (data.season && data.episode) {
                label = `S${data.season}:E${data.episode}`;
            }

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
                
                window.showDetailView(item);
                
                if(data.season && data.episode) {
                   setTimeout(() => {
                       const sSelect = document.getElementById('season-select');
                       if(sSelect) {
                           sSelect.value = data.season;
                           if(typeof window.onSeasonChange === 'function') window.onSeasonChange();
                           setTimeout(() => {
                               const epGrid = document.getElementById('episode-grid');
                               if(epGrid && epGrid.children[data.episode - 1]) {
                                   epGrid.children[data.episode - 1].click();
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

    } catch (e) { console.error(e); }
};

/* === 6. UI STATE MANAGER === */
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
        document.getElementById('continue-watching-row').style.display = 'none';
    }
});

/* === 7. HELPERS === */
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
