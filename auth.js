/* === FIXED AUTH.JS === */

// 1. FIX TRAILING SPACES IN IMPORTS
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
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    // ... your config ...
    databaseURL: "https://shakzz-tv-default-rtdb.asia-southeast1.firebasedatabase.app" // NO SPACE
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 2. SET PERSISTENCE FIRST
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("✅ Persistence configured");
        initializeAuth();
    })
    .catch((error) => {
        console.error("❌ Persistence failed:", error);
    });

function initializeAuth() {
    // 3. MOVE getRedirectResult INSIDE
    getRedirectResult(auth)
        .then((result) => {
            if (result) {
                console.log("✅ Redirect login success:", result.user.email);
            }
        })
        .catch((error) => {
            console.error("❌ Redirect error:", error.code, error.message);
        });

    // 4. AUTH STATE LISTENER
    onAuthStateChanged(auth, (user) => {
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
            
            // Wait for DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => window.loadContinueWatching());
            } else {
                window.loadContinueWatching();
            }
        } else {
            console.log("ℹ️ No user logged in");
            if(loggedInDiv) loggedInDiv.style.display = 'none';
            if(loggedOutDiv) loggedOutDiv.style.display = 'block';
            
            const historyRow = document.getElementById('continue-watching-row');
            if(historyRow) historyRow.style.display = 'none';
        }
    });
}

// 5. LOGIN FUNCTIONS
window.loginGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
};

window.loginGithub = () => {
    const provider = new GithubAuthProvider();
    signInWithRedirect(auth, provider);
};

window.doLogout = async () => {
    try {
        await signOut(auth);
        console.log("✅ Logout successful");
        location.reload(); 
    } catch (error) {
        console.error("❌ Logout error:", error);
    }
};

// ... rest of your code ...
