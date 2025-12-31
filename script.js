/* =========================================
   1. UTILS & CONFIG
   ========================================= */
const API_KEY = '4eea503176528574efd91847b7a302cc'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w300';

/* --- LOADER --- */
const CutieLoader = {
    show: (msg = "Loading...") => {
        let loader = document.getElementById('preloader');
        if (loader) {
            loader.style.display = 'flex';
            loader.style.opacity = '1';
        }
    },
    hide: () => {
        const loader = document.getElementById('preloader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }
    }
};

/* =========================================
   2. LIVE TV LOGIC
   ========================================= */
const DEFAULT_CHANNEL_ID = "Kapamilya";
let currentSearchFilter = "";
let currentChannelKey = "";
let sortedChannels = [];
const tabs = ["all", "favorites", "news", "entertainment", "movies", "sports", "documentary", "cartoons & animations", "anime tagalog dubbed"];
let currentTabIndex = 0;

function renderChannelButtons(filter = "") {
    currentSearchFilter = filter;
    const list = document.getElementById("channelList");
    const animeContainer = document.getElementById("animeSeriesContainer");
    const animeSelect = document.getElementById("animeSeriesSelect");

    if (!list || typeof channels === 'undefined') return;

    const selectedGroup = tabs[currentTabIndex];

    // Anime Logic
    if (selectedGroup === "anime tagalog dubbed" && filter === "") {
        if (animeContainer) animeContainer.style.display = "block";
        list.innerHTML = ""; 
        if (typeof animeData !== 'undefined' && animeSelect && animeSelect.options.length <= 1) {
             animeSelect.innerHTML = '<option value="" disabled selected>Select Anime Title</option>';
             Object.keys(animeData).forEach(title => {
                let option = document.createElement('option');
                option.value = title;
                option.textContent = title;
                animeSelect.appendChild(option);
            });
            animeSelect.onchange = function() {
                const selectedTitle = this.value;
                const episodes = animeData[selectedTitle];
                renderAnimeEpisodes(episodes);
            };
        }
        document.getElementById("channelCountText").innerText = "Select Title";
        return; 
    } else {
        if (animeContainer) animeContainer.style.display = "none";
    }

    list.innerHTML = "";
    let shownCount = 0;
    
    sortedChannels.forEach(([key, channel]) => {
        const group = channel.group || "live";
        const matchesSearch = channel.name.toLowerCase().includes(filter.toLowerCase());
        const matchesFavorites = (selectedGroup === "favorites") ? channel.favorite === true : true;
        const matchesGroup = selectedGroup === "all" || selectedGroup === "favorites" || (Array.isArray(group) ? group.includes(selectedGroup) : group === selectedGroup);

        if (!matchesSearch || !matchesGroup || !matchesFavorites) return;

        const btn = document.createElement("div");
        btn.className = (key === currentChannelKey) ? "channel-button active" : "channel-button";
        btn.onclick = () => loadChannel(key);

        btn.innerHTML = `
            <div class="channel-logo"><img src="${channel.logo}" loading="lazy"></div>
            <span class="channel-name">${channel.name}</span>
            <span class="favorite-star" style="margin-left:auto;">${channel.favorite ? "⭐" : "☆"}</span>
        `;
        
        btn.querySelector('.favorite-star').onclick = (e) => {
            e.stopPropagation();
            channel.favorite = !channel.favorite;
            saveFavoritesToStorage();
            renderChannelButtons(currentSearchFilter);
        };

        list.appendChild(btn);
        shownCount++;
    });

    document.getElementById("channelCountText").innerText = `${shownCount} Channels`;
    const clearBtn = document.getElementById('clearFavoritesBtn');
    if(clearBtn) clearBtn.style.display = (selectedGroup === "favorites" && shownCount > 0) ? "block" : "none";
}

function renderAnimeEpisodes(episodes) {
    const list = document.getElementById("channelList");
    list.innerHTML = "";
    if(!episodes) return;

    episodes.forEach((ep) => {
        const div = document.createElement('div');
        div.className = 'channel-button';
        div.innerHTML = `<div class="channel-logo"><img src="${ep.logo}"></div><div class="channel-name">${ep.name}</div>`;
        div.onclick = () => {
             jwplayer("video").setup({
                autostart: true, width: "100%", aspectratio: "16:9", stretching: "exactfit",
                playlist: [{ file: ep.manifestUri, type: ep.type || "hls" }]
            });
            document.getElementById('nowPlayingChannel').innerText = ep.name;
            document.querySelectorAll('.channel-button').forEach(b => b.classList.remove('active'));
            div.classList.add('active');
        };
        list.appendChild(div);
    });
}

function loadChannel(key) {
    if (typeof channels === "undefined" || !channels[key]) return;
    const channel = channels[key];
    currentChannelKey = key;
    localStorage.setItem("lastPlayedChannel", key);

    document.querySelectorAll(".channel-button").forEach(btn => btn.classList.remove("active"));
    document.getElementById("nowPlayingChannel").innerText = channel.name;

    // Token Logic
    const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJTaGFrenoiLCJleHAiOjE3NjY5NTgzNTN9.RSc_LQ11txXXI0d7gZ8GvMOAwoHrWzUUr3CCQCM0Hco";
    let finalManifest = channel.manifestUri;
    if (finalManifest.includes("converse.nathcreqtives.com")) {
        const separator = finalManifest.includes('?') ? '&' : '?';
        finalManifest = `${finalManifest}${separator}token=${AUTH_TOKEN}`;
    }

    let playerType = channel.type === "mp4" ? "mp4" : (channel.type === "hls" ? "hls" : "dash");
    let drmConfig = undefined;

    if (channel.type === "clearkey" && channel.keyId && channel.key) {
        drmConfig = { clearkey: { keyId: channel.keyId, key: channel.key } };
    } else if (channel.type === "widevine") {
        drmConfig = { widevine: { url: channel.licenseServerUri || channel.key } };
    }

    if(window.jwplayer) {
        jwplayer("video").setup({
            autostart: true, width: "100%", aspectratio: "16:9", stretching: "exactfit",
            sources: [{ file: finalManifest, type: playerType, drm: drmConfig }]
        });
    }
}

function loadFavoritesFromStorage() {
    try {
        const stored = JSON.parse(localStorage.getItem("favoriteChannels") || "[]");
        if (typeof channels !== 'undefined') {
            Object.entries(channels).forEach(([key, channel]) => { channel.favorite = stored.includes(key); });
        }
    } catch (e) {}
}

function saveFavoritesToStorage() {
    if (typeof channels === 'undefined') return;
    const favorites = Object.entries(channels).filter(([key, ch]) => ch.favorite).map(([key]) => key);
    localStorage.setItem("favoriteChannels", JSON.stringify(favorites));
}

// --- CATEGORY TABS ---
function setupCategoryTabs() {
    const desktop = document.querySelector(".category-bar");
    const mobileList = document.getElementById("mobileCategoryList");
    
    tabs.forEach((tab, index) => {
        // Desktop
        if(desktop) {
            const btn = document.createElement('button');
            btn.className = `category-button ${index === 0 ? 'active' : ''}`;
            btn.textContent = tab.toUpperCase();
            btn.onclick = () => handleTabClick(index, tab);
            desktop.appendChild(btn);
        }
        // Mobile
        if(mobileList) {
            const div = document.createElement('div');
            div.className = `mobile-cat-option ${index === 0 ? 'active' : ''}`;
            div.innerHTML = `<span>${tab.toUpperCase()}</span>`;
            div.onclick = () => {
                handleTabClick(index, tab);
                document.getElementById('categoryModal').style.display = 'none';
            };
            mobileList.appendChild(div);
        }
    });
}

function handleTabClick(index, tabName) {
    currentTabIndex = index;
    document.querySelectorAll('.category-button').forEach((b, i) => b.classList.toggle('active', i === index));
    document.querySelectorAll('.mobile-cat-option').forEach((b, i) => b.classList.toggle('active', i === index));
    
    const mobBtn = document.getElementById('mobileCategoryBtn');
    if(mobBtn) mobBtn.querySelector('span').textContent = tabName.toUpperCase();
    
    renderChannelButtons();
}

/* =========================================
   3. HOME PAGE LOGIC (Movies)
   ========================================= */
let currentSlideIndex = 0;
let slideInterval;

async function fetchData(endpoint, page = 1) {
    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&page=${page}`;
        const res = await fetch(url);
        return await res.json();
    } catch (e) { return { results: [] }; }
}

async function initMovies() {
    try {
        const [latest, kdrama, cdrama, anime, movies, tv] = await Promise.all([
            fetchData('/tv/on_the_air?sort_by=popularity.desc'),
            fetchData('/discover/tv?with_original_language=ko&with_origin_country=KR&sort_by=popularity.desc'),
            fetchData('/discover/tv?with_original_language=zh&with_origin_country=CN&sort_by=popularity.desc'),
            fetchData('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
            fetchData('/trending/movie/week'),
            fetchData('/trending/tv/week')
        ]);
        
        initSlider(movies.results);
        displayList(latest.results, 'latest-list');
        displayList(cdrama.results, 'cdrama-list');
        displayList(kdrama.results, 'kdrama-list');
        displayList(movies.results, 'movies-list');
        displayList(tv.results, 'tvshows-list');
        displayList(anime.results, 'anime-list');
    } catch (e) { console.error(e); } 
}

function displayList(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        if(!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => showDetailView(item);
        card.innerHTML = `
            <div class="badge-overlay">HD</div>
            <img src="${POSTER_URL}${item.poster_path}" loading="lazy">
            <div class="card-title">${item.title || item.name}</div>
        `;
        container.appendChild(card);
    });
}

function initSlider(items) {
    const track = document.getElementById('slider-track');
    if (!track) return;
    track.innerHTML = '';
    items.slice(0, 5).forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
        slide.innerHTML = `<div class="slide-content"><h1>${item.title || item.name}</h1></div>`;
        slide.onclick = () => showDetailView(item);
        track.appendChild(slide);
    });
    setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % 5;
        track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    }, 4000);
}

// --- OVERLAYS ---
let currentItem = null;
function showDetailView(item) {
    currentItem = item;
    document.getElementById('detail-title').innerText = item.title || item.name;
    document.getElementById('detail-overview').innerText = item.overview;
    document.getElementById('detail-view').style.display = 'flex';
    changeDetailServer();
}
function closeDetailView() {
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('detail-video').src = '';
}
function changeDetailServer() {
    if(!currentItem) return;
    const type = currentItem.media_type === 'movie' || !currentItem.first_air_date ? 'movie' : 'tv';
    const server = document.getElementById('detail-server').value;
    const url = server === 'vidsrc.to' ? `https://vidsrc.to/embed/${type}/${currentItem.id}` : `https://vidsrc.xyz/embed/${type}/${currentItem.id}`;
    document.getElementById('detail-video').src = url;
}

// Global Search
window.openSearchModal = () => document.getElementById('search-modal').style.display = 'flex';
window.closeSearchModal = () => document.getElementById('search-modal').style.display = 'none';
window.searchTMDB = async function() {
    const query = document.getElementById('search-input').value;
    if (!query.trim()) return;
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
    const data = await res.json();
    const container = document.getElementById('search-results');
    container.innerHTML = '';
    data.results.forEach(item => {
        if(!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => showDetailView(item);
        card.innerHTML = `<img src="${POSTER_URL}${item.poster_path}"><div class="card-title">${item.title||item.name}</div>`;
        container.appendChild(card);
    });
};

/* =========================================
   4. UI INTERACTIONS
   ========================================= */
window.toggleSidebar = function() {
    document.getElementById('main-sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
};

const mobCatBtn = document.getElementById('mobileCategoryBtn');
if(mobCatBtn) mobCatBtn.onclick = () => document.getElementById('categoryModal').style.display = 'flex';
const closeCatModal = document.getElementById('closeCategoryModal');
if(closeCatModal) closeCatModal.onclick = () => document.getElementById('categoryModal').style.display = 'none';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    CutieLoader.show();
    
    // Setup UI
    setupCategoryTabs();
    initMovies();
    
    // Live TV Data
    if (typeof channels !== 'undefined') {
        sortedChannels = Object.entries(channels).sort((a, b) => a[1].name.localeCompare(b[1].name));
        loadFavoritesFromStorage();
        
        // Setup Channel
        const lastPlayed = localStorage.getItem("lastPlayedChannel");
        if (lastPlayed && channels[lastPlayed]) currentChannelKey = lastPlayed;
        else currentChannelKey = sortedChannels[0]?.[0] || "";
        
        renderChannelButtons();
        if(currentChannelKey) loadChannel(currentChannelKey);
    }
    
    // Search Listener for Live TV
    const searchInput = document.getElementById("search");
    if(searchInput) {
        searchInput.addEventListener("input", (e) => renderChannelButtons(e.target.value.trim()));
        document.getElementById("clearSearch").onclick = () => { searchInput.value = ""; renderChannelButtons(""); };
    }

    setTimeout(() => CutieLoader.hide(), 1000);
});
