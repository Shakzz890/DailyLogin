/* =========================================================
   SHAKZZ TV — COMPLETE FIXED SCRIPT (UPDATED)
   ========================================================= */
let currentDetail = {
  id: null,
  type: 'movie',
  season: 1,
  episode: 1,
  title: ''
};

/* =========================================================
   1. UTILS & CONFIG
   ========================================================= */
const API_KEY = '4eea503176528574efd91847b7a302cc'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w300';
const PLACEHOLDER_IMG = 'logo.png';

// --- NEW STATE MANAGEMENT FOR PLAYER ---
let currentServerIndex = parseInt(localStorage.getItem('currentServer')) || 0;
let sandboxEnabled = localStorage.getItem('sandboxEnabled') !== null 
    ? JSON.parse(localStorage.getItem('sandboxEnabled')) 
    : true;

// --- NEW SERVER LIST (EXACT COPY INTEGRATED WITH STATE) ---
const servers = [
    {
        name: "Server 1",
        getUrl: (s, e) =>
            `https://vidsrc.cc/v2/embed/${currentDetail.type}/${currentDetail.id}` +
            (currentDetail.type === "tv"
                ? `/${s}/${e}?autoPlay=false&poster=true`
                : "?autoPlay=false&poster=true"),
    },

    {
        name: "Server 2",
        getUrl: (s, e) =>
            `https://zxcstream.xyz/embed/${currentDetail.type}/${currentDetail.id}` +
            (currentDetail.type === "tv" ? `/${s}/${e}` : ""),
    },

    {
        name: "Server 3",
        getUrl: (s, e) => {
            if (currentDetail.type === "movie") {
                return `https://fmovies4u.com/embed/movie/${currentDetail.id}`;
            }
            return `https://fmovies4u.com/embed/tv/${currentDetail.id}/${s}/${e}`;
        },
    },

    {
        name: "Server 4",
        getUrl: (s, e) =>
            `https://vidsrc.cx/embed/${currentDetail.type}/${currentDetail.id}` +
            (currentDetail.type === "tv" ? `/${s}/${e}` : ""),
    },

    {
        name: "Server 5 (Ads) ⚠️",
        getUrl: (s, e) =>
            `https://mapple.uk/watch/${currentDetail.type}/${currentDetail.id}` +
            (currentDetail.type === "tv" ? `-${s}-${e}` : ""),
    },

    {
        name: "Server 6 (Ads) ⚠️",
        getUrl: (s, e) =>
            `https://vidnest.fun/${currentDetail.type}/${currentDetail.id}` +
            (currentDetail.type === "tv" ? `/${s}/${e}` : ""),
    },

    {
        name: "Server 7 (Ads) ⚠️",
        getUrl: (s, e) =>
            `https://vidlink.pro/${currentDetail.type}/${currentDetail.id}` +
            (currentDetail.type === "tv" ? `/${s}/${e}` : ""),
    },
];

let currentSeason = 1;
let currentEpisode = 1;
let currentItem = null;
let currentDetails = null;
let currentSlideIndex = 0;
let lastSidebarView = 'home';
let cinemaTimer = null;
let sliderInterval = null;
let isPlayerOpen = false;
let currentEpisodeList = [];


/* --- LOADER CONTROL --- */
const CutieLoader = {
    show: (msg = "Loading...") => {
        const loader = document.getElementById('preloader');
        if (loader) {
            loader.style.display = 'flex';
            loader.style.opacity = '1';
            const p = loader.querySelector('p');
            if(p) p.innerText = msg;
        }
    },
    hide: () => {
        const loader = document.getElementById('preloader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { 
                loader.style.display = 'none';
            }, 500);
        }
    }
};

function getDisplayTitle(item) {
  if (item.origin_country?.includes('PH') || item.original_language === 'tl') {
    return item.original_name || item.name || item.title;
  }
  return item.title || item.name;
}

/* =========================================================
   2. NAVIGATION & UI
   ========================================================= */
function setSidebarActive(view) {
    const searchModal = document.getElementById('search-modal');
    if (searchModal && searchModal.style.display === 'flex' && view !== 'explore') {
        return;
    }
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    const active = document.querySelector(`.sidebar-link[data-view="${view}"]`);
    if (active) active.classList.add('active');
}

function switchView(viewName) {
    lastSidebarView = viewName;
    const home = document.getElementById('home-view');
    const live = document.getElementById('live-view');
    const navbar = document.querySelector('.navbar');
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('overlay');

    // --- 1. NAVBAR FIX: Solid Black on Live TV, Transparent on Home ---
    if (viewName === 'home') {
        if(navbar) navbar.classList.remove('solid-nav');
    } else {
        if(navbar) navbar.classList.add('solid-nav');
    }

    // --- 2. PLAYER LOGIC: Stop video if leaving Live TV ---
    if (viewName !== 'live') {
        if (window.jwplayer && jwplayer("video")) {
            try { jwplayer("video").stop(); } catch(e) {}
        }
    }

    // --- 3. VIEW TOGGLE LOGIC ---
    if (viewName === 'live') {
        if (home) home.style.display = 'none';
        if (live) live.style.display = 'flex'; 
        
        // Resize player when entering Live view
        if (window.jwplayer && jwplayer("video")) {
             jwplayer("video").resize();
        }
    } else {
        if (home) home.style.display = 'block';
        if (live) live.style.display = 'none';
    }

    // --- 4. SIDEBAR & DESKTOP NAV SYNC ---
    setSidebarActive(viewName);
    
    // *** NEW: Update the Desktop Navbar too! ***
    if(typeof updateDesktopNavState === 'function') {
        updateDesktopNavState(viewName);
    }

    // Close mobile sidebar automatically
    if (window.innerWidth < 1024) {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
    }
}


window.handleNavClick = function(element, view) {
    switchView(view);
    updateDesktopNavState(view);
};


function updateDesktopNavState(view) {
    document.querySelectorAll('.desktop-menu .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.desktop-menu .nav-link[onclick*="'${view}'"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}


window.toggleSidebar = function() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('overlay');
    if(sidebar) sidebar.classList.toggle('open');
    if(overlay) overlay.classList.toggle('active');
};

/* =========================================================
   3. LIVE TV LOGIC
   ========================================================= */
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

    if (selectedGroup === "anime tagalog dubbed" && filter === "") {
        if (animeContainer) animeContainer.style.display = "block";
        list.innerHTML = ""; 
        if (typeof animeData !== 'undefined' && animeSelect && animeSelect.options.length <= 1) {
             animeSelect.innerHTML = '<option value="" disabled selected>Select Anime Title</option>';
             Object.keys(animeData).forEach(title => {
                const option = document.createElement('option');
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
        const countText = document.getElementById("channelCountText");
        if(countText) countText.innerText = "Select Title";
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
        btn.className = (key === currentChannelKey) ? "channel-button active focusable-element" : "channel-button focusable-element";
        btn.setAttribute("tabindex", "0"); 
        btn.onclick = () => loadChannel(key);

        btn.innerHTML = `
            <div class="channel-logo"><img src="${channel.logo}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'"></div>
            <span class="channel-name">${channel.name}</span>
            <i class="favorite-star ${channel.favorite ? 'fas' : 'far'} fa-star" style="color:${channel.favorite ? '#e50914' : '#666'}"></i>
        `;
        
        const star = btn.querySelector('.favorite-star');
        if(star) {
            star.onclick = (e) => {
                e.stopPropagation();
                channel.favorite = !channel.favorite;
                saveFavoritesToStorage();
                renderChannelButtons(currentSearchFilter);
            };
        }

        list.appendChild(btn);
        shownCount++;
    });

    const countText = document.getElementById("channelCountText");
    if(countText) countText.innerText = `${shownCount} Channels`;
    
    const clearWrapper = document.getElementById('clearFavWrapper');
    if (clearWrapper) {
        clearWrapper.style.display = (selectedGroup === "favorites" && shownCount > 0) ? "block" : "none";
    }
}

function renderAnimeEpisodes(episodes) {
    const list = document.getElementById("channelList");
    list.innerHTML = "";
    if(!episodes) return;

    episodes.forEach((ep) => {
        const div = document.createElement('div');
        div.className = 'channel-button focusable-element';
        div.setAttribute("tabindex", "0");
        div.innerHTML = `
            <div class="channel-logo"><img src="${ep.logo}" style="object-fit:cover;" onerror="this.src='${PLACEHOLDER_IMG}'"></div>
            <div class="channel-name">${ep.name}</div>
        `;
        div.onclick = () => {
             jwplayer("video").setup({
                autostart: true, width: "100%", aspectratio: "16:9", stretching: "exactfit",
                playlist: [{ file: ep.manifestUri, type: ep.type || "hls" }]
            });
            const nowPlaying = document.getElementById('nowPlayingChannel');
            if(nowPlaying) nowPlaying.innerText = ep.name;
            document.querySelectorAll('.channel-button').forEach(b => b.classList.remove('active'));
            div.classList.add('active');
        };
        list.appendChild(div);
    });
}

function filterEpisodes(query) {
    query = query.toLowerCase().trim();

    const items = document.querySelectorAll('#episode-menu .menu-option');

    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        const episodeNum = item.dataset.episode || '';

        if (!query) {
            item.style.display = '';
            return;
        }

        // Match episode number (ep 2, episode 2, 2)
        const numberMatch =
            episodeNum === query ||
            text.includes(`episode ${query}`) ||
            text.includes(`ep ${query}`);

        // Match title text
        const titleMatch = text.includes(query);

        item.style.display = numberMatch || titleMatch ? '' : 'none';
    });
}


function loadChannel(key) {
    if (typeof channels === "undefined" || !channels[key]) return;
    const channel = channels[key];
    currentChannelKey = key;
    localStorage.setItem("lastPlayedChannel", key);

    document.querySelectorAll(".channel-button").forEach(btn => btn.classList.remove("active"));
    const buttons = document.querySelectorAll(".channel-button");
    buttons.forEach(b => {
       if(b.querySelector('.channel-name')?.innerText === channel.name) b.classList.add('active');
    });

    const np = document.getElementById("nowPlayingChannel");
    if(np) np.innerText = channel.name;

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
            autostart: true, width: "100%", height: "100%", stretching: "exactfit",
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

window.filterChannels = function() {
    const query = document.getElementById('live-search-input')?.value || '';
    const clearBtn = document.getElementById('live-clear-btn');
    if(clearBtn) clearBtn.style.display = query.trim().length > 0 ? 'block' : 'none';
    renderChannelButtons(query);
};

window.clearLiveSearch = function() {
    const searchInput = document.getElementById('live-search-input');
    if(searchInput) searchInput.value = '';
    filterChannels();
};

function setupCategoryTabs() {
    const desktopBar = document.querySelector(".category-bar");
    const mobileList = document.getElementById("mobileCategoryList");
    
    if(desktopBar) desktopBar.innerHTML = '';
    if(mobileList) mobileList.innerHTML = '';

    tabs.forEach((tab, index) => {
        if(desktopBar) {
            const btn = document.createElement('button');
            btn.className = `category-button ${index === 0 ? 'active' : ''}`;
            btn.textContent = tab.toUpperCase();
            btn.onclick = () => handleTabClick(index, tab);
            desktopBar.appendChild(btn);
        }
        if(mobileList) {
            const div = document.createElement('div');
            div.className = `mobile-cat-option ${index === 0 ? 'active' : ''}`;
            div.innerHTML = `<span>${tab.toUpperCase()}</span>`;
            div.onclick = () => {
                handleTabClick(index, tab);
                const modal = document.getElementById('categoryModal');
                if(modal) modal.style.display = 'none';
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
    if(mobBtn && mobBtn.querySelector('span')) mobBtn.querySelector('span').textContent = tabName.toUpperCase();
    renderChannelButtons(currentSearchFilter);
}

/* =========================================================
   4. HOME PAGE LOGIC (Movies)
   ========================================================= */
function showGlobalSkeletons() {
    const sliderTrack = document.getElementById('slider-track');
    if (sliderTrack) {
        sliderTrack.innerHTML = '<div class="slide skeleton-slide skeleton-shimmer"></div>';
    }

    const lists = [
        'latest-list', 'kdrama-list', 'cdrama-list', 'filipino-list', 'movies-list', 'tvshows-list', 'anime-list', 'upcoming-list'
    ];

    const skeletonCardsHTML = `
        <div class="skeleton-card skeleton-shimmer"></div>
        <div class="skeleton-card skeleton-shimmer"></div>
        <div class="skeleton-card skeleton-shimmer"></div>
        <div class="skeleton-card skeleton-shimmer"></div>
        <div class="skeleton-card skeleton-shimmer"></div>
    `;

    lists.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = skeletonCardsHTML;
            el.parentElement.style.display = 'block'; 
        }
    });
}

async function fetchData(endpoint, page = 1) {
    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&page=${page}`;
        const res = await fetch(url);
        return await res.json();
    } catch (e) { return { results: [] }; }
}

async function fetchMixedDrama(lang, country, specificIds = []) {
    try {
        const specificPromises = specificIds.map(id => 
            fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`).then(r => r.json())
        );
        const trendingPromise = fetchData(
            `/discover/tv?with_original_language=${lang}&with_origin_country=${country}&sort_by=popularity.desc`
        );
        const [specificDetails, trendingData] = await Promise.all([
            Promise.all(specificPromises),
            trendingPromise
        ]);
        const validSpecifics = specificDetails.filter(s => s && s.id);
        const specificIdsSet = new Set(validSpecifics.map(s => s.id));
        const uniqueTrending = (trendingData.results || []).filter(item => !specificIdsSet.has(item.id));
        return [...validSpecifics, ...uniqueTrending];
    } catch (e) {
        console.error("Error fetching mixed drama:", e);
        return [];
    }
}

/* =========================================
   UPDATED: INIT MOVIES (Fixed for Actual Trending)
   Slider: Real-time Global Trending (Day)
   Lists: Popular & Genre Specific
   ========================================= */
async function initMovies() {
    try {
        // We fetch the "Real" trending data (Movies + TV mixed)
        // /trending/all/day = What everyone is watching right now
        // /trending/all/week = What has been popular this week
        
        const [
            trendingDay,      // For Slider (Hot right now)
            trendingWeek,     // For "Latest/Trending" List
            kdramaList,
            cdramaList,
            filipino, 
            animeList,
            movies,
            tv,
            upcoming
        ] = await Promise.all([
            // 1. ACTUAL TRENDING FETCHES
            fetchData('/trending/all/day'),  
            fetchData('/trending/all/week'),

            // 2. GENRE SPECIFIC (Sort by Popularity)
            fetchData('/discover/tv?with_original_language=ko&with_origin_country=KR&sort_by=popularity.desc'),
            fetchData('/discover/tv?with_original_language=zh&with_origin_country=CN&sort_by=popularity.desc'),
            fetchData('/discover/tv?with_original_language=tl&with_origin_country=PH&sort_by=popularity.desc'),
            fetchData('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),

            // 3. GENERAL MOVIES & TV
            fetchData('/movie/popular'),
            fetchData('/tv/popular'),
            fetchData('/movie/upcoming?region=US')
        ]);
        
        // --- SLIDER CONFIGURATION ---
        // Use "Trending Day" for the slider to show the absolute hottest content
        // We filter to ensure we only show items with high-quality backdrop images
        const sliderContent = (trendingDay.results || []).filter(item => item.backdrop_path);
        initSlider(sliderContent);

        // --- LISTS CONFIGURATION ---
        // 'latest-list' now shows Trending Week (The "Buzz" list)
        displayList(trendingWeek.results, 'latest-list');
        
        // Other lists
        displayList(cdramaList.results, 'cdrama-list'); 
        displayList(kdramaList.results, 'kdrama-list'); 
        displayList(filipino.results, 'filipino-list');
        displayList(movies.results, 'movies-list');
        displayList(tv.results, 'tvshows-list');
        displayList(animeList.results, 'anime-list');   
        
        if (upcoming && upcoming.results) {
            displayUpcomingList(upcoming.results, 'upcoming-list');
        }

    } catch (e) { 
        console.error("Error initializing movies:", e); 
    } 
}




function displayList(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    const validItems = items.filter(item => item.poster_path);
    const limitItems = validItems.slice(0, 12);

    limitItems.forEach(item => {
        const title = getDisplayTitle(item);
        const date = item.release_date || item.first_air_date || 'N/A';
        const year = date.split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
        
        // Smart Check: If it has 'first_air_date', it's a Series
        const isTv = item.media_type === 'tv' || item.first_air_date || item.name;
        const type = isTv ? 'Series' : 'Movie'; // <--- CHANGED HERE

        const card = document.createElement('div');
        card.className = 'movie-card focusable-element fade-in';
        card.setAttribute("tabindex", "0");
        
        card.onclick = () => {
            CutieLoader.show("Opening...");
            setTimeout(() => showDetailView(item), 10);
        };
        
        card.innerHTML = `
            <div class="card-poster">
                <div class="badge-overlay">HD</div>
                <div class="rating-badge"><i class="fas fa-star"></i> ${rating}</div>
                <img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year}</span>
                    <span class="dot-sep"></span>
                    <span>${type}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}


function displayUpcomingList(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    const today = new Date();

    // 1. FILTER FIRST (Future dates + Has Poster)
    const validItems = items.filter(item => {
        if (!item.poster_path || !item.release_date) return false;
        return new Date(item.release_date) >= today;
    });

    // 2. SORT BY DATE
    validItems.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

    // 3. CUT TO EXACTLY 12
    const limitItems = validItems.slice(0, 12);

    if (limitItems.length === 0) {
        container.innerHTML = '<p style="color:#888; font-size:0.9rem;">No upcoming releases.</p>';
        return;
    }

    limitItems.forEach(item => {
        const dateObj = new Date(item.release_date);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const title = getDisplayTitle(item);
        const type = 'Movie';

        const card = document.createElement('div');
        card.className = 'movie-card focusable-element fade-in';
        card.onclick = () => {
            CutieLoader.show("Opening...");
            setTimeout(() => showDetailView(item), 10);
        };
        
        card.innerHTML = `
            <div class="card-poster">
                <div class="coming-badge">COMING</div>
                <img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span style="color:var(--accent-color); font-weight:600;">${dateStr}</span>
                    <span class="dot-sep"></span>
                    <span>${type}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
/* =========================================
   UPDATED SLIDER INIT
   ========================================= */
function initSlider(items) {
    const track = document.getElementById('slider-track');
    const dotsContainer = document.getElementById('slider-dots');
    
    if (!track || !dotsContainer || !items?.length) return;

    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    currentSlideIndex = 0;
    const slideCount = Math.min(items.length, 15); 

    items.slice(0, slideCount).forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'slide fade-in';
        
        const bgImage = item.backdrop_path ? IMG_URL + item.backdrop_path : POSTER_URL + item.poster_path;
        slide.style.backgroundImage = `url(${bgImage})`;

        const title = getDisplayTitle(item);
        const date = (item.release_date || item.first_air_date || 'N/A').split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
        const overview = item.overview || "No description available.";
        
        slide.onclick = (e) => {
            if(e.target.closest('button')) return;
            CutieLoader.show("Opening...");
            setTimeout(() => showDetailView(item), 10);
        };

        slide.innerHTML = `
            <div class="slide-content">
                <span class="slide-badge">Trending Now</span>
                
                <h1 class="slide-title">${title}</h1>
                
                <div class="slide-meta">
                    <span>${date}</span>
                    <span>•</span>
                    <span class="slide-rating">
                        <i class="fas fa-star"></i> ${rating}
                    </span>
                </div>

                <p class="slide-desc">${overview}</p>

                <div class="slide-actions">
                    <button class="slider-btn btn-play-slide">
                        <i class="fas fa-play"></i> Play
                    </button>
                    <button class="slider-btn btn-info-slide">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
        
        const playBtn = slide.querySelector('.btn-play-slide');
        const infoBtn = slide.querySelector('.btn-info-slide');
        
        playBtn.onclick = () => { CutieLoader.show("Opening..."); showDetailView(item); };
        infoBtn.onclick = () => { CutieLoader.show("Opening..."); showDetailView(item); };

        track.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = index === 0 ? 'dot active' : 'dot';
        dot.onclick = () => {
            currentSlideIndex = index;
            updateSliderPosition();
            resetSliderTimer();
        };
        dotsContainer.appendChild(dot);
    });

    startSliderTimer(slideCount);
}

/* =========================================
   SLIDER NAVIGATION (With Flash Effect)
   ========================================= */

window.moveSlider = function(direction) {
    // 1. Logic to Move Slide
    const slides = document.querySelectorAll('.slide');
    if (slides.length === 0) return;

    currentSlideIndex = (currentSlideIndex + direction + slides.length) % slides.length;
    updateSliderPosition();
    resetSliderTimer();

    // 2. Visual "Flash" Effect Logic
    // Automatically find which button was clicked based on direction
    let btnClass = direction === 1 ? '.next-arrow' : '.prev-arrow';
    let btn = document.querySelector(btnClass);

    if (btn) {
        // Add the 'clicked' class instantly
        btn.classList.add('clicked');

        // Remove it after 200ms to trigger the fade-out
        setTimeout(() => {
            btn.classList.remove('clicked');
        }, 200);
    }
};



// Helper to update position (if not already existing)
function updateSliderPosition() {
    const track = document.getElementById('slider-track');
    if(track) track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    
    document.querySelectorAll('.dot').forEach((d, i) => 
        d.classList.toggle('active', i === currentSlideIndex)
    );
}

// Helper to manage timer
function startSliderTimer(count) {
    if (sliderInterval) clearInterval(sliderInterval);
    sliderInterval = setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % count;
        updateSliderPosition();
    }, 5000); // 5 seconds
}

function resetSliderTimer() {
    if (sliderInterval) clearInterval(sliderInterval);
    const count = document.querySelectorAll('.slide').length;
    startSliderTimer(count);
}

/* =========================================================
   5. CATEGORY VIEW LOGIC
   ========================================================= */
let categoryState = {
    endpoint: '',
    title: '',
    page: 1,
    isLoading: false,
    hasMore: true
};

window.openCategory = function(type, title) {
    const view = document.getElementById('category-view');
    const titleEl = document.getElementById('category-title');
    const gridEl = document.getElementById('category-grid');
    
    if (!view || !titleEl || !gridEl) return;
    
    titleEl.innerText = title;
    gridEl.innerHTML = ''; 
    view.style.display = 'flex';
    
    let endpoint = '';
    if(type === 'airing_today') endpoint = '/tv/airing_today';
    else if(type === 'upcoming') endpoint = '/movie/upcoming';
    else if(type === 'kdrama') endpoint = '/discover/tv?with_original_language=ko&with_origin_country=KR&sort_by=popularity.desc';
    else if(type === 'cdrama') endpoint = '/discover/tv?with_original_language=zh&with_origin_country=CN&sort_by=popularity.desc';
    else if(type === 'movie') endpoint = '/movie/popular';
    else if(type === 'tv') endpoint = '/tv/popular';
    else if(type === 'anime') endpoint = '/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc';
    else if (type === 'filipino') endpoint ='/discover/tv?with_original_language=tl&with_origin_country=PH&sort_by=popularity.desc';

    categoryState.endpoint = endpoint;
    categoryState.title = title;
    categoryState.page = 1;
    categoryState.hasMore = true;
    categoryState.isLoading = false;
    loadMoreCategoryResults();
    
    const catContent = document.getElementById('category-content');
    if(catContent) catContent.onscroll = handleCategoryScroll;
};

window.closeCategory = function() {
    const view = document.getElementById('category-view');
    if(view) view.style.display = 'none';
};

async function loadMoreCategoryResults() {
    if(categoryState.isLoading || !categoryState.hasMore) return;
    categoryState.isLoading = true;
    
    try {
        const separator = categoryState.endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${categoryState.endpoint}${separator}api_key=${API_KEY}&page=${categoryState.page}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if(!data.results || data.results.length === 0) {
            categoryState.hasMore = false;
        } else {
            const grid = document.getElementById('category-grid');
            if(!grid) return;
            data.results.forEach(item => {
                if(!item.poster_path) return;
                
                const title = getDisplayTitle(item);
                const date = item.release_date || item.first_air_date || 'N/A';
                const year = date.split('-')[0];
                const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
                const type = item.media_type === 'tv' ? 'TV Series' : 'Movie';

                const card = document.createElement('div');
                card.className = 'movie-card fade-in';
                card.onclick = () => {
                    CutieLoader.show("Opening...");
                    setTimeout(() => showDetailView(item), 10);
                };
                
                card.innerHTML = `
                    <div class="card-poster">
                        <div class="badge-overlay">HD</div>
                        <div class="rating-badge"><i class="fas fa-star"></i> ${rating}</div>
                        <img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
                    </div>
                    <div class="card-info">
                        <div class="card-title">${title}</div>
                        <div class="card-meta">
                            <span>${year}</span>
                            <span class="dot-sep"></span>
                            <span>${type}</span>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
            categoryState.page++;
        }
    } catch(e) { console.error(e); }
    finally { categoryState.isLoading = false; }
}

function handleCategoryScroll() {
    const container = document.getElementById('category-content');
    if(container && container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        loadMoreCategoryResults();
    }
}

/* =========================================================
   6. DETAIL VIEW LOGIC (UPDATED WITH NEW SERVERS & SANDBOX)
   ========================================================= */
/* =========================================================
   UPDATED SHOW DETAIL VIEW (Split Layout + Auth Hooks + Duration)
   ========================================================= */
async function showDetailView(item) {
    try {
        currentItem = item;

        // 1. Reset Global State
        currentDetail.id = item.id;
        currentDetail.type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        currentDetail.title = item.title || item.name || '';
        currentDetail.season = 1;
        currentDetail.episode = 1;
        currentSeason = 1;
        currentEpisode = 1;

        // 2. Prepare UI
        const view = document.getElementById('detail-view');
        const backdropImg = document.getElementById('detail-backdrop-img');
        const posterImg = document.getElementById('detail-poster-img');
        
        document.body.classList.remove('cinema-hide');
        document.body.style.overflow = 'hidden';
        view.style.display = 'flex';
        view.scrollTop = 0; // Reset scroll to top

        // 3. SET IMAGES (The Split Layout Logic)
        // A. Set Vertical Poster (The Card)
        if (posterImg) {
            posterImg.src = item.poster_path 
                ? POSTER_URL + item.poster_path 
                : PLACEHOLDER_IMG;
        }
        
        // B. Set Background (Fallback to poster if no backdrop exists)
        if (backdropImg) {
            const bgPath = item.backdrop_path 
                ? IMG_URL + item.backdrop_path 
                : (item.poster_path ? IMG_URL + item.poster_path : PLACEHOLDER_IMG);
            backdropImg.src = bgPath;
        }

        // 4. SET BASIC TEXT
        document.getElementById('detail-title').innerText = getDisplayTitle(item);
        document.getElementById('detail-overview').innerText = item.overview || 'No overview available.';
        
        const dateStr = (item.release_date || item.first_air_date || '');
        document.getElementById('detail-date').innerText = dateStr.split('-')[0] || 'N/A';
        document.getElementById('detail-rating').innerText = item.vote_average ? Number(item.vote_average).toFixed(1) : 'NR';

        // 5. FETCH FULL DETAILS (Parallel request for speed)
        const type = currentDetail.type === 'tv' ? 'tv' : 'movie';
        const [details, recs] = await Promise.all([
            fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}`).then(r => r.json())
        ]);

        // 6. RENDER GENRE PILLS
        const genreList = document.getElementById('detail-genres-list');
        if (genreList && details.genres) {
            genreList.innerHTML = details.genres.slice(0, 3).map(g => 
                `<span class="genre-pill">${g.name}</span>`
            ).join('');
        }

        // 7. RENDER DURATION / RUNTIME
        const durationEl = document.getElementById('detail-duration');
        if (durationEl) {
            let runtime = 0;
            if (type === 'movie') {
                runtime = details.runtime;
            } else if (details.episode_run_time && details.episode_run_time.length > 0) {
                runtime = details.episode_run_time[0];
            }
            
            if (runtime > 0) {
                const hours = Math.floor(runtime / 60);
                const minutes = runtime % 60;
                durationEl.innerText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            } else {
                durationEl.innerText = type === 'tv' ? 'TV Series' : 'Movie';
            }
        }

        // 8. HANDLE TV SEASONS vs MOVIE
        const seasonPill = document.getElementById('season-pill');
        const episodeLabel = document.getElementById('episode-label');
        const seasonLabel = document.getElementById('season-label');

        if (currentDetail.type === 'tv') {
            if (seasonPill) seasonPill.style.display = 'flex';
            populateSeasons(details.seasons || []);
            if (seasonLabel) seasonLabel.innerText = `Season ${currentSeason}`;
            if (episodeLabel) episodeLabel.innerText = `Episode ${currentEpisode}`;
        } else {
            if (seasonPill) seasonPill.style.display = 'none';
            if (episodeLabel) episodeLabel.innerText = 'Movie';
        }

        // --- AUTH HOOKS START ---
        
        // A. Update Watchlist Button State (Check if already added)
        if (window.checkWatchlistStatus) {
            window.checkWatchlistStatus(item);
        }

        // B. Attach Click Event to Watchlist Button
        const watchlistBtn = view.querySelector('.watchlist-btn');
        if (watchlistBtn) {
            watchlistBtn.onclick = () => {
                // Use the safe wrapper we created
                if (window.handleWatchlistClick) {
                    window.handleWatchlistClick(item);
                } else if (window.toggleWatchlist) {
                    // Direct fallback if wrapper missing
                    window.toggleWatchlist(item);
                } else {
                    alert("Please sign in to use the Watchlist feature.");
                    if(window.toggleAuthDropdown) window.toggleAuthDropdown('login');
                }
            };
        }

        // C. Auto-Add to History on View
        if (window.addToHistory) {
            window.addToHistory(item);
        }
        
        // --- AUTH HOOKS END ---

        // 9. RENDER EXTRAS
        renderServerOptions();
        renderRecommendations(recs.results);

    } catch (err) {
        console.error("Error opening detail view:", err);
    } finally {
        CutieLoader.hide();
    }
}


function renderRecommendations(results) {
    const recGrid = document.getElementById('recommendations-grid');
    if (!recGrid) return;
    
    recGrid.innerHTML = '';
    const items = results || [];

    items.slice(0, 12).forEach(rec => { 
        if (!rec.poster_path) return;

        const title = getDisplayTitle(rec);
        const year = (rec.release_date || rec.first_air_date || 'N/A').split('-')[0];
        const rating = rec.vote_average ? Number(rec.vote_average).toFixed(1) : 'NR';
        
        // Smart Check + "Series" label
        const isTv = rec.media_type === 'tv' || rec.first_air_date || rec.name;
        const typeLabel = isTv ? 'Series' : 'Movie'; // <--- CHANGED HERE

        const card = document.createElement('div');
        card.className = 'movie-card'; 
        
        card.onclick = () => {
            showDetailView(rec);
        };

        card.innerHTML = `
            <div class="card-poster">
                <div class="rating-badge">
                    <i class="fas fa-star"></i> ${rating}
                </div>
                <img src="${POSTER_URL}${rec.poster_path}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year}</span>
                    <span class="dot-sep"></span>
                    <span>${typeLabel}</span>
                </div>
            </div>
        `;
        recGrid.appendChild(card);
    });
}



/* =========================================================
   DISPLAY LISTS (Open in Category View)
   ========================================================= */

function openUserList(listType) {
    if (!isUserLoggedIn()) {
        promptLogin();
        return;
    }

    const view = document.getElementById('category-view');
    const titleEl = document.getElementById('category-title');
    const gridEl = document.getElementById('category-grid');
    
    // Set Title
    titleEl.innerText = listType === 'watchlist' ? 'My Watchlist' : 'Watch History';
    gridEl.innerHTML = '';
    view.style.display = 'flex';

    // Get Data
    const storageKey = listType === 'watchlist' ? 'userWatchlist' : 'userHistory';
    const items = JSON.parse(localStorage.getItem(storageKey) || '[]');

    if (items.length === 0) {
        gridEl.innerHTML = '<div style="color:#888; width:100%; text-align:center; margin-top:50px;">List is empty.</div>';
        return;
    }

    // Reuse your existing render logic
    items.forEach(item => {
        const title = item.title;
        const date = item.release_date || 'N/A';
        const year = date.split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
        const type = item.media_type === 'tv' ? 'TV Series' : 'Movie';

        const card = document.createElement('div');
        card.className = 'movie-card fade-in';
        card.onclick = () => {
            CutieLoader.show("Opening...");
            setTimeout(() => showDetailView(item), 10);
        };
        
        card.innerHTML = `
            <div class="card-poster">
                <div class="rating-badge"><i class="fas fa-star"></i> ${rating}</div>
                <img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
                ${listType === 'history' ? '<div class="badge-overlay" style="background:#444;">WATCHED</div>' : ''}
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year}</span>
                    <span class="dot-sep"></span>
                    <span>${type}</span>
                </div>
            </div>
        `;
        gridEl.appendChild(card);
    });
}

/* =========================================================
   HISTORY SYSTEM
   ========================================================= */

function addToHistory(item) {
    if (!isUserLoggedIn()) return; // Silent return for history, don't annoy user

    let history = JSON.parse(localStorage.getItem('userHistory') || '[]');
    
    // Remove if it already exists (to move it to the top)
    history = history.filter(i => i.id !== item.id);

    // Add to beginning of array
    history.unshift({
        id: item.id,
        title: item.title || item.name,
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        release_date: item.release_date || item.first_air_date,
        media_type: item.media_type || (item.title ? 'movie' : 'tv'),
        watched_at: new Date().toISOString()
    });

    // Limit history to last 50 items
    if (history.length > 50) history.pop();

    localStorage.setItem('userHistory', JSON.stringify(history));
}

/* =========================================================
   WATCHLIST / FAVORITES SYSTEM
   ========================================================= */

// Toggle Watchlist Item
function toggleWatchlist(item) {
    if (!isUserLoggedIn()) {
        promptLogin();
        return;
    }

    let watchlist = JSON.parse(localStorage.getItem('userWatchlist') || '[]');
    const existingIndex = watchlist.findIndex(i => i.id === item.id);

    if (existingIndex > -1) {
        // Remove if already exists
        watchlist.splice(existingIndex, 1);
        showToast("Removed from Watchlist");
    } else {
        // Add new item
        // Save only necessary data to save storage space
        watchlist.push({
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            vote_average: item.vote_average,
            release_date: item.release_date || item.first_air_date,
            media_type: item.media_type || (item.title ? 'movie' : 'tv')
        });
        showToast("Added to Watchlist");
    }

    localStorage.setItem('userWatchlist', JSON.stringify(watchlist));
    updateWatchlistButtonState(item.id); // Update the button icon immediately
}

// Check if item is in watchlist (to update UI)
function isInWatchlist(id) {
    const watchlist = JSON.parse(localStorage.getItem('userWatchlist') || '[]');
    return watchlist.some(i => i.id === id);
}

// Update the Button UI in Detail View
function updateWatchlistButtonState(id) {
    const btn = document.querySelector('.watchlist-btn');
    if (!btn) return;

    if (isInWatchlist(id)) {
        btn.innerHTML = '<i class="fas fa-check"></i> Added';
        btn.style.background = "#fff";
        btn.style.color = "#000";
    } else {
        btn.innerHTML = '<i class="far fa-bookmark"></i> Watchlist';
        btn.style.background = "rgba(255,255,255,0.1)";
        btn.style.color = "#fff";
    }
}


 
function closeDetailView() {
    if (currentItem) saveWatchProgress();
    const view = document.getElementById('detail-view');
    const video = document.getElementById('detail-video');
    document.body.classList.remove('cinema-hide');
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    if (view) {
        view.style.opacity = '0';
        setTimeout(() => {
            view.style.display = 'none';
            view.style.opacity = '1';
            if (video) video.src = '';
        }, 250);
    }
}

function playContent() {
    const overlay = document.getElementById('player-overlay');
    const iframe = document.getElementById('overlay-video');
    if (!overlay || !iframe || !currentItem) return;
    isPlayerOpen = true;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    changeDetailServer(currentSeason, currentEpisode, iframe);
}

function togglePill(pill) {
    const isOpen = pill.classList.contains('open');

    document.querySelectorAll('.pill-dropdown').forEach(p => {
        p.classList.remove('open');
    });

    if (!isOpen) {
        pill.classList.add('open');
    }
}




// Function to Populate Server Menu UI
// 1. RENDER SERVER OPTIONS (Fixed for Redflix Style)
function renderServerOptions() {
    const serverMenu = document.getElementById('server-menu');
    const serverLabel = document.getElementById('server-label');
    
    // Set initial label
    if(serverLabel && servers[currentServerIndex]) {
        serverLabel.innerText = servers[currentServerIndex].name;
    }

    // Keep the Header (Sandbox Toggle), remove old list items
    if(!serverMenu) return;
    
    // We only want to remove list items, NOT the header
    const existingHeader = serverMenu.querySelector('.server-header');
    serverMenu.innerHTML = ''; 
    if (existingHeader) serverMenu.appendChild(existingHeader);

    servers.forEach((server, index) => {
        const div = document.createElement('div');
        // IMPORTANT: Use 'menu-option' class and 'selected' for active state
        div.className = `menu-option ${index === currentServerIndex ? 'selected' : ''}`;
        div.innerText = server.name;
        div.onclick = () => selectServer(index, server.name);
        serverMenu.appendChild(div);
    });
}

// 2. SELECT SERVER (Update active class logic)
function selectServer(index, labelText) {
    currentServerIndex = index;
    const label = document.getElementById('server-label');
    if(label) label.innerText = labelText;
    
    // Update active class in dropdown
    const menuItems = document.querySelectorAll('#server-menu .menu-option');
    menuItems.forEach((item, idx) => {
        if(idx === index) item.classList.add('selected'); // Change to .selected
        else item.classList.remove('selected');
    });

    document.querySelectorAll('.pill-dropdown').forEach(p => p.classList.remove('open'));
    localStorage.setItem('currentServer', currentServerIndex);

    if(isPlayerOpen) {
        changeDetailServer(currentSeason, currentEpisode);
    }
}


// 3. POPULATE SEASONS (AUTO-SELECT SEASON 1 LIKE REDFLIX)
function populateSeasons(seasons) {
    const seasonMenu = document.getElementById('season-menu');
    const seasonLabel = document.getElementById('season-label');
    
    if (!seasonMenu || !Array.isArray(seasons)) return;

    // 🔥 RESET UI
    const existingHeader = seasonMenu.querySelector('.menu-header');
    seasonMenu.innerHTML = '';
    if (existingHeader) seasonMenu.appendChild(existingHeader);

    // Sort seasons properly
    seasons
        .filter(s => s.season_number > 0)
        .sort((a, b) => a.season_number - b.season_number)
        .forEach(season => {
            const div = document.createElement('div');
            div.className = 'menu-option';
            div.dataset.season = season.season_number;

            div.innerHTML = `
                <span>Season ${season.season_number}</span>
                <span style="margin-left:auto;font-size:0.75rem;opacity:0.5;">
                    ${season.episode_count} Eps
                </span>
            `;

            div.onclick = () => {
                currentSeason = season.season_number;
                currentDetail.season = season.season_number;

                // 🔥 RESET EPISODE ON SEASON CHANGE
                currentEpisode = 1;
                currentDetail.episode = 1;

                if (seasonLabel) {
                    seasonLabel.innerText = `Season ${season.season_number}`;
                }

                document
                    .querySelectorAll('#season-menu .menu-option')
                    .forEach(el => el.classList.remove('selected'));

                div.classList.add('selected');

                fetchEpisodes(season.season_number);

                document
                    .querySelectorAll('.pill-dropdown')
                    .forEach(p => p.classList.remove('open'));
            };

            seasonMenu.appendChild(div);
        });

    // 🔥 AUTO-SELECT SEASON 1 IMMEDIATELY
    const firstSeason =
        seasons.find(s => s.season_number === currentSeason) ||
        seasons.find(s => s.season_number === 1) ||
        seasons[0];

    if (firstSeason) {
        currentSeason = firstSeason.season_number;
        currentDetail.season = firstSeason.season_number;

        if (seasonLabel) {
            seasonLabel.innerText = `Season ${firstSeason.season_number}`;
        }

        const selectedItem = seasonMenu.querySelector(
            `.menu-option[data-season="${firstSeason.season_number}"]`
        );
        if (selectedItem) selectedItem.classList.add('selected');

        // 🔥 LOAD EPISODES WITHOUT USER CLICK
        fetchEpisodes(firstSeason.season_number);
    }
}



async function fetchEpisodes(seasonNum) {
    try {
        const res = await fetch(
            `${BASE_URL}/tv/${currentDetail.id}/season/${seasonNum}?api_key=${API_KEY}`
        );

        if (!res.ok) throw new Error("Failed to load episodes");

        const data = await res.json();

        // 🔥 STORE EPISODES FOR SEARCH
        currentEpisodeList = data.episodes || [];

        const epMenu = document.getElementById('episode-menu');
        const epLabel = document.getElementById('episode-label');

        if (!epMenu || !currentEpisodeList.length) return;

        // 🔥 CLEAR MENU BUT KEEP HEADER
        const header = epMenu.querySelector('.menu-header');
        epMenu.innerHTML = '';
        if (header) epMenu.appendChild(header);

        // 🔥 RESET EPISODE STATE
        currentEpisode = currentDetail.episode || 1;
        currentDetail.episode = currentEpisode;

        currentEpisodeList.forEach(ep => {
            const div = document.createElement('div');
            const isActive = ep.episode_number === currentEpisode;

            div.className = `menu-option ${isActive ? 'selected' : ''}`;
            div.dataset.episode = ep.episode_number;

            div.innerHTML = `
                <span style="font-weight:700; min-width:26px; color:var(--accent-color);">
                    ${ep.episode_number}.
                </span>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${ep.name || `Episode ${ep.episode_number}`}
                </span>
            `;

            div.onclick = () => {
                document
                    .querySelectorAll('#episode-menu .menu-option')
                    .forEach(el => el.classList.remove('selected'));

                div.classList.add('selected');
                playEpisode(ep.episode_number);

                document
                    .querySelectorAll('.pill-dropdown')
                    .forEach(p => p.classList.remove('open'));
            };

            epMenu.appendChild(div);
        });

        // 🔥 UPDATE LABEL
        if (epLabel) {
            epLabel.innerText = `Episode ${currentEpisode}`;
        }

    } catch (err) {
        console.error("Episode load error:", err);

        const epMenu = document.getElementById('episode-menu');
        if (epMenu) {
            epMenu.innerHTML = `
                <div style="padding:14px; text-align:center; color:#ef4444;">
                    Failed to load episodes
                </div>
            `;
        }
    }
}


function playEpisode(ep) {
    currentEpisode = ep;
    currentDetail.episode = ep;

    const epLabel = document.getElementById('episode-label');
    if (epLabel) epLabel.innerText = `Episode ${ep}`;

    playContent();
}


// --- CORE PLAYER FUNCTION REPLACED WITH NEW LOGIC ---
function changeDetailServer(season = 1, episode = 1, targetIframe = null) {
    if(!currentItem) return;
    currentSeason = season;
    currentEpisode = episode;
    currentDetail.season = season;
    currentDetail.episode = episode;
    
    // Get current server object from the array using index
    const serverObj = servers[currentServerIndex];
    if (!serverObj) return;

    // Generate URL
    const src = serverObj.getUrl(currentSeason, currentEpisode);

    // Get Iframe & Toggle
    const iframe = targetIframe || document.getElementById('overlay-video');
    const toggleBtn = document.getElementById('sandbox-toggle');
    
    // Sync Toggle UI
    if (toggleBtn) toggleBtn.checked = sandboxEnabled;

    // Apply Sandbox Policy based on boolean state
    if (sandboxEnabled) {
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    } else {
        iframe.removeAttribute("sandbox");
    }
    
    // Set attributes common to all
    iframe.setAttribute("allowfullscreen", "");

    if(iframe) iframe.src = src;
    
    saveWatchProgress();
    markEpisodeWatched();
}

function reloadIframeWithSandbox() {
    if (!isPlayerOpen || !currentItem) return;

    const iframe = document.getElementById('overlay-video');
    if (!iframe) return;

    iframe.src = 'about:blank';

    setTimeout(() => {
        changeDetailServer(
            currentSeason,
            currentEpisode,
            iframe
        );
    }, 50);
}

function saveWatchProgress() {
    if (!currentDetail.id) return;
    localStorage.setItem(
        `watch_${currentDetail.id}`,
        JSON.stringify({
            season: currentDetail.season,
            episode: currentDetail.episode
        })
    );
}

function loadWatchProgress() {
    if (!currentDetail.id) return;
    const data = JSON.parse(
        localStorage.getItem(`watch_${currentDetail.id}`)
    );
    if (data) {
        currentDetail.season = data.season || 1;
        currentDetail.episode = data.episode || 1;
        currentSeason = currentDetail.season;
        currentEpisode = currentDetail.episode;
    }
}

function markEpisodeWatched() {
    if (!currentDetail.id) return;
    localStorage.setItem(
        `watched_${currentDetail.id}_${currentDetail.season}_${currentDetail.episode}`,
        true
    );
}

function closePlayerOverlay() {
    const overlay = document.getElementById('player-overlay');
    const iframe = document.getElementById('overlay-video');
    isPlayerOpen = false;
    if (iframe) iframe.src = '';
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
}

/* =========================================================
   7. ADVANCED SEARCH & INFINITE BROWSE
   ========================================================= */
let searchDebounceTimer = null;
let browseState = {
    category: 'all',  
    page: 1,          
    isLoading: false, 
    hasMore: true     
};

const CATEGORY_ENDPOINTS = {
  'all': '/trending/all/day',
  'movie': '/movie/popular',
  'tv': '/tv/popular',
  'anime': '/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc',
  'kdrama': '/discover/tv?with_original_language=ko&with_origin_country=KR&sort_by=popularity.desc',
  'cdrama': '/discover/tv?with_original_language=zh&with_origin_country=CN&sort_by=popularity.desc',
  'filipino': '/discover/tv?with_original_language=tl&with_origin_country=PH&sort_by=popularity.desc'
};

window.openSearchModal = () => {
    const modal = document.getElementById('search-modal');
    if(!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 

    setSidebarActive('explore');
    const input = document.getElementById('search-input');
    if(input) {
        input.focus();
        toggleClearButton(input.value);
    }
    const results = document.getElementById('search-results');
    if(results) results.onscroll = handleBrowseScroll;

    const inputCheck = document.getElementById('search-input');
    if (!inputCheck || !inputCheck.value.trim()) {
        resetBrowseState('all');
    }
};

window.closeSearchModal = () => { 
    const modal = document.getElementById('search-modal');
    if(modal) modal.style.display = 'none';
    
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto'; 

    setSidebarActive(lastSidebarView);
};

window.handleSearchInput = () => {
    const input = document.getElementById('search-input');
    if (!input) return;
    toggleClearButton(input.value);
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        searchTMDB();
    }, 400);
};

window.clearSearchInput = () => {
    const input = document.getElementById('search-input');
    if(input) {
        input.value = '';
        input.focus();
        toggleClearButton(''); 
        resetBrowseState(browseState.category); 
    }
};

function toggleClearButton(query) {
    const btn = document.querySelector('.search-clear-btn');
    if(btn) {
        btn.style.display = (query && query.length > 0) ? 'block' : 'none';
    }
}

window.setSearchFilter = function(type, btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const input = document.getElementById('search-input');
    if(input && input.value.trim()) { 
        browseState.category = type; 
        searchTMDB(); 
    } else { 
        resetBrowseState(type); 
    }
};

async function resetBrowseState(category) {
    browseState.category = category;
    browseState.page = 1;
    browseState.hasMore = true;
    browseState.isLoading = false;
    const container = document.getElementById('search-results');
    const heading = document.getElementById('search-heading');
    if(container) container.innerHTML = ''; 
    if(heading) heading.innerText = category === 'all' ? 'Trending' : category.toUpperCase();
    await loadMoreBrowseResults();
}

async function loadMoreBrowseResults() {
    if (browseState.isLoading || !browseState.hasMore) return;
    browseState.isLoading = true;
    try {
        const endpoint = CATEGORY_ENDPOINTS[browseState.category] || CATEGORY_ENDPOINTS['all'];
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&page=${browseState.page}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data.results || data.results.length === 0) {
            browseState.hasMore = false;
        } else {
            renderBrowseResults(data.results);
            browseState.page++; 
        }
    } catch (e) { console.error(e); }
    finally { browseState.isLoading = false; }
}

function handleBrowseScroll() {
    const container = document.getElementById('search-results');
    if (!container) return;
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 120 && browseState.hasMore) {
        loadMoreBrowseResults();
    }
}

function renderBrowseResults(items) {
    const container = document.getElementById('search-results');
    if(!container) return;
    items.forEach(item => {
        if(!item.poster_path) return;
        
        const title = getDisplayTitle(item);
        const date = item.release_date || item.first_air_date || 'N/A';
        const year = date.split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
        
        // Smart Check + "Series" label
        const isTv = item.media_type === 'tv' || item.first_air_date || item.name;
        const type = isTv ? 'Series' : 'Movie'; // <--- CHANGED HERE

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => {
            CutieLoader.show("Opening...");
            closeSearchModal();
            setTimeout(() => showDetailView(item), 10);
        };
        card.innerHTML = `
            <div class="card-poster">
                <div class="badge-overlay">HD</div>
                <div class="rating-badge"><i class="fas fa-star"></i> ${rating}</div>
                <img src="${POSTER_URL}${item.poster_path}" onerror="this.src='${PLACEHOLDER_IMG}'">
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span>${year}</span>
                    <span class="dot-sep"></span>
                    <span>${type}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}


window.searchTMDB = async function() {
    const input = document.getElementById('search-input');
    const query = input.value.trim();
    const heading = document.getElementById('search-heading');
    const container = document.getElementById('search-results');

    if (!query) {
        resetBrowseState(browseState.category);
        return;
    }
    heading.innerText = "Search Results";
    browseState.page = 1;
    browseState.hasMore = false; 
    container.innerHTML = '';

    try {
        const res = await fetch(
            `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            container.innerHTML = '<p style="color:#888; padding:10px;">No results found.</p>';
            return;
        }

        data.results.forEach(item => {
            if (!item.poster_path) return;
            if (browseState.category === 'movie' && item.media_type !== 'movie') return;
            if (browseState.category === 'tv' && item.media_type !== 'tv') return;

            const title = getDisplayTitle(item);
            const date = item.release_date || item.first_air_date || 'N/A';
            const year = date.split('-')[0];
            const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';
            const type = item.media_type === 'tv' ? 'TV Series' : 'Movie';

            const card = document.createElement('div');
            card.className = 'movie-card';
            card.onclick = () => {
                closeSearchModal();
                showDetailView(item);
            };

            card.innerHTML = `
                <div class="card-poster">
                    <div class="badge-overlay">HD</div>
                    <div class="rating-badge"><i class="fas fa-star"></i> ${rating}</div>
                    <img src="${POSTER_URL}${item.poster_path}" onerror="this.src='${PLACEHOLDER_IMG}'">
                </div>
                <div class="card-info">
                    <div class="card-title">${title}</div>
                    <div class="card-meta">
                        <span>${year}</span>
                        <span class="dot-sep"></span>
                        <span>${type}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error(e); }
};

/* =========================================================
   8. UI INTERACTIONS & INIT
   ========================================================= */
function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const loggedOutDiv = document.getElementById('logged-out-state');
    const loggedInDiv = document.getElementById('logged-in-state');
    if (isLoggedIn) {
        if(loggedOutDiv) loggedOutDiv.style.display = 'none';
        if(loggedInDiv) loggedInDiv.style.display = 'block';
    } else {
        if(loggedOutDiv) loggedOutDiv.style.display = 'block';
        if(loggedInDiv) loggedInDiv.style.display = 'none';
    }
}

window.addEventListener('click', function(e) {
    const authWrapper = document.querySelector('.auth-wrapper');
    if (authWrapper && !authWrapper.contains(e.target)) {
        const ld = document.getElementById('login-dropdown');
        const pd = document.getElementById('profile-dropdown');
        if(ld) ld.classList.remove('show');
        if(pd) pd.classList.remove('show');
    }
});

function setupTvRemoteLogic() {
    window.addEventListener('keydown', (e) => {
        const focused = document.activeElement;
        const isInputActive = focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA');
        if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Back' || e.key === 'Exit') {
            if (e.key === 'Backspace' && isInputActive) return;
            e.preventDefault();
            const searchModal = document.getElementById('search-modal');
            const categoryModal = document.getElementById('categoryModal');
            const detailView = document.getElementById('detail-view');
            const categoryView = document.getElementById('category-view');
            const sidebar = document.getElementById('main-sidebar');

            if (searchModal && searchModal.style.display === 'flex') {
                closeSearchModal(); return;
            }
            if (categoryModal && categoryModal.style.display === 'flex') {
                categoryModal.style.display = 'none'; return;
            }
            if (detailView && detailView.style.display === 'flex') {
                closeDetailView(); return;
            }
            if (categoryView && categoryView.style.display === 'flex') {
                closeCategory(); return;
            }
            if (sidebar && sidebar.classList.contains('open')) {
                toggleSidebar(); return;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    CutieLoader.show("Initializing...");
    try {
        setupCategoryTabs();
        setupTvRemoteLogic();
        checkLoginState();
        
        // --- NEW SANDBOX TOGGLE LISTENER ---
        const sandboxToggle = document.getElementById('sandbox-toggle');
        if (sandboxToggle) {
            sandboxToggle.checked = sandboxEnabled;
            sandboxToggle.addEventListener('change', () => {
                sandboxEnabled = sandboxToggle.checked;
                localStorage.setItem("sandboxEnabled", sandboxEnabled);
                reloadIframeWithSandbox();
            });
        }
        
        const mobCatBtn = document.getElementById('mobileCategoryBtn');
        const categoryModal = document.getElementById('categoryModal');
        const closeCatModal = document.getElementById('closeCategoryModal');
        if (mobCatBtn && categoryModal) mobCatBtn.onclick = () => categoryModal.style.display = 'flex';
        if (closeCatModal && categoryModal) closeCatModal.onclick = () => categoryModal.style.display = 'none';

        if (typeof channels !== 'undefined') {
            sortedChannels = Object.entries(channels)
                .sort((a, b) => a[1].name.localeCompare(b[1].name));
            loadFavoritesFromStorage();
            const lastPlayed = localStorage.getItem("lastPlayedChannel");
            currentChannelKey = lastPlayed && channels[lastPlayed] ? lastPlayed : sortedChannels[0]?.[0] || "";
            renderChannelButtons();
            if (currentChannelKey) loadChannel(currentChannelKey);
        }

        showGlobalSkeletons();
        initMovies().finally(() => CutieLoader.hide());
    } catch (e) {
        console.error("Fatal init error:", e);
        CutieLoader.hide(); 
    }
});

document.addEventListener('contextmenu', e => {
  if (e.target.tagName === 'IFRAME') {
    e.preventDefault();
  }
});

document.addEventListener('keydown', e => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) ||
    (e.ctrlKey && e.key === 'U')
  ) {
    e.preventDefault();
  }
});

window.handleWatchlistClick = function(item) {
    if (window.toggleWatchlist) {
        window.toggleWatchlist(item);
    } else {
        // Fallback if auth.js isn't loaded or user isn't logged in logic isn't ready
        alert("Please sign in to use the Watchlist feature.");
        if(window.toggleAuthDropdown) window.toggleAuthDropdown('login');
    }
};

