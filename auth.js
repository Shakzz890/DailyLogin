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
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// --- GOOGLE ---
window.loginGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        alert("Google Error: " + error.message);
    }
};

// --- GITHUB ---
window.loginGithub = async () => {
    try {
        await signInWithPopup(auth, githubProvider);
    } catch (error) {
        if (error.code === 'auth/account-exists-with-different-credential') {
            alert("This email is already used with another login method.");
        } else {
            alert("GitHub Error: " + error.message);
        }
    }
};

// --- LOGOUT ---
window.doLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
    }
};

// --- UI UPDATER ---
onAuthStateChanged(auth, (user) => {
    const loggedOutDiv = document.getElementById('logged-out-state');
    const loggedInDiv = document.getElementById('logged-in-state');
    const userAvatar = document.querySelector('.nav-avatar');
    const menuAvatar = document.querySelector('.menu-avatar');
    const userName = document.querySelector('.user-name');

    // Close dropdowns
    document.querySelectorAll('.auth-dropdown').forEach(d => d.classList.remove('show'));

    if (user) {
        loggedOutDiv.style.display = 'none';
        loggedInDiv.style.display = 'block';
        if(userName) userName.innerText = user.displayName || "User";
        if(user.photoURL) {
            if(userAvatar) userAvatar.src = user.photoURL;
            if(menuAvatar) menuAvatar.src = user.photoURL;
        }
    } else {
        loggedInDiv.style.display = 'none';
        loggedOutDiv.style.display = 'block';
    }
});

// Helper for Dropdown Toggling
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
