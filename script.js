/* =========================================
   1. UTILS & CONFIG
   ========================================= */
const API_KEY = '4eea503176528574efd91847b7a302cc'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w300';

// Global Playback State
let currentSeason = 1;
let currentEpisode = 1;

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
   2. VIEW CONTROLLER
   ========================================= */
function switchView(viewName) {
    const home = document.getElementById('home-view');
    const live = document.getElementById('live-view');
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('overlay');
    
    if(viewName === 'live') {
        home.style.display = 'none';
        live.style.display = 'flex'; 
        if(window.innerWidth < 1024) live.style.flexDirection = 'column';
        if(window.jwplayer) { try { jwplayer().resize(); } catch(e){} }
    } else {
        home.style.display = 'block';
        live.style.display = 'none';
        if(window.jwplayer) { try { jwplayer().stop(); } catch(e){} }
    }
    if(window.innerWidth < 1024) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

/* =========================================
   3. LIVE TV LOGIC
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

    // Standard Channel Logic
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
            <div class="channel-logo"><img src="${channel.logo}" loading="lazy" onerror="this.src='logo.png'"></div>
            <span class="channel-name">${channel.name}</span>
            <i class="favorite-star ${channel.favorite ? 'fas' : 'far'} fa-star" style="color:${channel.favorite ? '#e50914' : '#666'}"></i>
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
    const clearWrapper = document.getElementById('clearFavWrapper');
    if (clearWrapper) clearWrapper.style.display = (selectedGroup === "favorites" && shownCount > 0) ? "block" : "none";
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
            <div class="channel-logo"><img src="${ep.logo}" style="object-fit:cover;"></div>
            <div class="channel-name">${ep.name}</div>
        `;
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

// Live Search
window.filterChannels = function() {
    const query = document.getElementById('live-search-input').value;
    const clearBtn = document.getElementById('live-clear-btn');
    clearBtn.style.display = query.trim().length > 0 ? 'block' : 'none';
    renderChannelButtons(query);
};

window.clearLiveSearch = function() {
    document.getElementById('live-search-input').value = '';
    filterChannels();
};

// Category Tabs
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
    renderChannelButtons(currentSearchFilter);
}

/* =========================================
   4. HOME PAGE LOGIC (Movies)
   ========================================= */
let currentSlideIndex = 0;

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
        const [latest, kdrama, cdrama, anime, movies, tv, upcoming] = await Promise.all([
            fetchData('/tv/on_the_air?sort_by=popularity.desc'),
            fetchData('/discover/tv?with_original_language=ko&with_origin_country=KR&sort_by=popularity.desc'),
            fetchData('/discover/tv?with_original_language=zh&with_origin_country=CN&sort_by=popularity.desc'),
            fetchData('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
            fetchData('/trending/movie/week'),
            fetchData('/trending/tv/week'),
            fetchData('/movie/upcoming?region=US')
        ]);
        
        initSlider(movies.results);
        displayList(latest.results, 'latest-list');
        displayList(cdrama.results, 'cdrama-list');
        displayList(kdrama.results, 'kdrama-list');
        displayList(movies.results, 'movies-list');
        displayList(tv.results, 'tvshows-list');
        displayList(anime.results, 'anime-list');
        
        if (upcoming && upcoming.results) {
            displayUpcomingList(upcoming.results, 'upcoming-list');
        }
        
    } catch (e) { console.error(e); } 
}

function displayList(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        if(!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card focusable-element';
        card.setAttribute("tabindex", "0");
        card.onclick = () => showDetailView(item);
        card.innerHTML = `
            <div class="badge-overlay">HD</div>
            <img src="${POSTER_URL}${item.poster_path}" loading="lazy">
            <div class="card-title">${item.title || item.name}</div>
        `;
        container.appendChild(card);
    });
}

function displayUpcomingList(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    const today = new Date();
    const futureItems = items.filter(item => {
        if (!item.release_date) return false;
        const releaseDate = new Date(item.release_date);
        return releaseDate >= today;
    });

    futureItems.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

    if (futureItems.length === 0) {
        container.innerHTML = '<p style="color:#888; font-size:0.9rem; margin:10px;">No upcoming releases found.</p>';
        return;
    }

    futureItems.forEach(item => {
        if(!item.poster_path) return;
        const dateObj = new Date(item.release_date);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const card = document.createElement('div');
        card.className = 'movie-card focusable-element';
        card.onclick = () => showDetailView(item);
        card.innerHTML = `
            <div class="coming-label">Coming ${dateStr}</div>
            <img src="${POSTER_URL}${item.poster_path}" loading="lazy">
            <div class="card-title">${item.title || item.name}</div>
        `;
        container.appendChild(card);
    });
}

function initSlider(items) {
    const track = document.getElementById('slider-track');
    const dotsContainer = document.getElementById('slider-dots');
    if (!track) return;
    track.innerHTML = ''; dotsContainer.innerHTML = '';
    
    items.slice(0, 5).forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
        slide.innerHTML = `<div class="slide-content"><h1>${item.title || item.name}</h1></div>`;
        slide.onclick = () => showDetailView(item);
        track.appendChild(slide);
        
        const dot = document.createElement('div');
        dot.className = index === 0 ? 'dot active' : 'dot';
        dotsContainer.appendChild(dot);
    });
    
    setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % 5;
        track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
        document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === currentSlideIndex));
    }, 4000);
}

/* =========================================
   5. DETAIL VIEW (THE CRITICAL FIX)
   ========================================= */
let currentItem = null;
let currentDetails = null;

async function showDetailView(item) {
    currentItem = item;
    const view = document.getElementById('detail-view');
    document.getElementById('detail-title').innerText = item.title || item.name;
    document.getElementById('detail-overview').innerText = item.overview || "No overview available.";
    document.getElementById('detail-date').innerText = (item.first_air_date || item.release_date || "2025").substring(0,4);
    
    const favBtn = document.querySelector('.action-item');
    if(favBtn) favBtn.classList.remove('active');

    /* === FIX: Explicitly set media_type to TV or Movie to prevent ID collisions === */
    const isTv = item.media_type === 'tv' || item.first_air_date || (item.name && !item.title);
    currentItem.media_type = isTv ? 'tv' : 'movie'; // <--- THIS LINE FIXES THE BUG
    
    const filters = document.querySelector('.episode-filters');
    
    if (isTv) {
        try {
            const res = await fetch(`${BASE_URL}/tv/${item.id}?api_key=${API_KEY}`);
            currentDetails = await res.json();
            if(filters) filters.style.display = 'flex';
            populateSeasons(currentDetails.seasons);
        } catch (e) { console.error(e); }
    } else {
        if(filters) filters.style.display = 'none';
        renderMovieEpisode(); 
    }

    view.style.display = 'flex';
    changeDetailServer(1, 1);
}

function closeDetailView() {
    // Attempt to save history (Auth logic handled safely by auth.js)
    if (currentItem && typeof window.saveWatchProgress === 'function') {
        const type = currentItem.media_type;
        const seasonToSave = type === 'tv' ? currentSeason : null;
        const episodeToSave = type === 'tv' ? currentEpisode : null;
        window.saveWatchProgress(currentItem, seasonToSave, episodeToSave);
    }
    
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('detail-video').src = '';
}

function changeDetailServer(season = 1, episode = 1) {
    if(!currentItem) return;
    
    currentSeason = season;
    currentEpisode = episode;
    
    const server = document.getElementById('detail-server').value;
    const id = currentItem.id;
    const type = currentItem.media_type; // Uses the forced type from showDetailView
    let url = '';

    if(server === 'vidsrc.to') {
        url = `https://vidsrc.to/embed/${type}/${id}${type==='tv'?`/${season}/${episode}`:''}`;
    } else if(server === 'vidsrc.me') {
        url = type==='tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}` : `https://vidsrc.me/embed/movie?tmdb=${id}`;
    } else if(server === 'vidlink.pro') {
        url = type==='tv' ? `https://vidlink.pro/tv/${id}/${season}/${episode}` : `https://vidlink.pro/movie/${id}`;
    } else if(server === 'superembed.stream') {
        url = type==='tv' ? `https://superembed.stream/tv/${id}/${season}/${episode}` : `https://superembed.stream/movie/${id}`;
    } else if(server === '2embed.cc') {
        url = `https://www.2embed.cc/embed/${id}`;
    } else if(server === 'vidsrc.cc') {
        url = type==='tv' ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.cc/v2/embed/movie/${id}`;
    } else if(server === 'vidsrc.xyz') {
        url = `https://vidsrc.xyz/embed/${type}/${id}`;
    } else if(server === 'vidsrc.vip') {
        url = type==='tv' ? `https://vidsrc.vip/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.vip/embed/movie/${id}`;
    } else if(server === 'vidsrc.net') {
        url = `https://vidsrc.net/embed/${type}/${id}`;
    } else if(server === 'net20.cc') {
        url = type==='tv' ? `https://net20.cc/embed/tv/${id}/${season}/${episode}` : `https://net20.cc/embed/movie/${id}`;
    }

    document.getElementById('detail-video').src = url;
    
    // Auto-save logic
    if (typeof window.saveWatchProgress === 'function') {
        window.saveWatchProgress(currentItem, type === 'tv' ? season : null, type === 'tv' ? episode : null);
    }
}

function populateSeasons(seasons) {
    const seasonSelect = document.getElementById('season-select');
    seasonSelect.innerHTML = '';
    seasons.forEach(s => {
        if (s.season_number > 0) { 
            const opt = document.createElement('option');
            opt.value = s.season_number;
            opt.textContent = `Season ${s.season_number}`;
            opt.dataset.epCount = s.episode_count;
            seasonSelect.appendChild(opt);
        }
    });
    if (seasonSelect.options.length === 0) {
        const opt = document.createElement('option');
        opt.value = 1; opt.textContent = "Season 1"; opt.dataset.epCount = 12;
        seasonSelect.appendChild(opt);
    }
    seasonSelect.value = 1;
    onSeasonChange();
}

function onSeasonChange() {
    currentSeason = parseInt(document.getElementById('season-select').value);
    renderEpisodes(); 
}

function renderEpisodes() {
    const seasonSelect = document.getElementById('season-select');
    const grid = document.getElementById('episode-grid');
    grid.innerHTML = '';
    
    const epCount = parseInt(seasonSelect.options[seasonSelect.selectedIndex]?.dataset.epCount || 12);
    currentSeason = parseInt(seasonSelect.value);

    for (let i = 1; i <= epCount; i++) {
        const box = document.createElement('div');
        box.className = 'ep-box';
        box.textContent = i;
        box.onclick = () => {
            document.querySelectorAll('.ep-box').forEach(b => b.classList.remove('active'));
            box.classList.add('active');
            currentEpisode = i; 
            changeDetailServer(currentSeason, i);
        };
        if (i === 1) {
            box.classList.add('active');
            currentEpisode = 1; 
        }
        grid.appendChild(box);
    }
}

function renderMovieEpisode() {
    const grid = document.getElementById('episode-grid');
    grid.innerHTML = '<div class="ep-box active" onclick="changeDetailServer(1,1)">Movie</div>';
}

/* --- Detail Buttons Logic --- */
window.toggleDetailFavorite = function(btn) {
    btn.classList.toggle('active');
};

window.shareContent = function() {
    if (navigator.share) {
        navigator.share({
            title: document.getElementById('detail-title').innerText,
            text: 'Watch this on Shakzz TV!',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
             alert("Link copied to clipboard!");
        });
    }
};

window.downloadContent = function() {
    if(!currentItem) return;
    const title = currentItem.title || currentItem.name || "Movie";
    const SHORTENER_API_KEY = '141b190d3ff71530ac5b9150eedb1339c2e6a369';
    const SHORTENER_BASE_URL = 'https://shortxlinks.com/api';
    const targetUrl = `https://www.google.com/search?q=download+${encodeURIComponent(title)}+free`;
    const finalLink = `${SHORTENER_BASE_URL}?api=${SHORTENER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
    
    window.open(finalLink, '_blank');
};

/* =========================================
   6. ADVANCED SEARCH & INFINITE BROWSE
   ========================================= */
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
    'cdrama': '/discover/tv?with_original_language=zh&with_origin_country=CN&sort_by=popularity.desc'
};

// Open Modal
window.openSearchModal = () => {
    document.getElementById('search-modal').style.display = 'flex';
    const input = document.getElementById('search-input');
    input.focus();
    toggleClearButton(input.value);
    
    document.getElementById('search-results').onscroll = handleBrowseScroll;

    if (!input.value.trim()) {
        resetBrowseState('all');
    }
};

window.closeSearchModal = () => {
    document.getElementById('search-modal').style.display = 'none';
};

// Handle Input Typing
window.handleSearchInput = () => {
    const query = document.getElementById('search-input').value;
    toggleClearButton(query);
    searchTMDB();
};

// Clear Text & Reset
window.clearSearchInput = () => {
    const input = document.getElementById('search-input');
    input.value = '';
    input.focus();
    toggleClearButton(''); 
    resetBrowseState(browseState.category); 
};

// Toggle Clear Button Visibility
function toggleClearButton(query) {
    const btn = document.querySelector('.search-clear-btn');
    if (query && query.length > 0) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
}

// Switch Filter Logic
window.setSearchFilter = function(type, btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    
    const input = document.getElementById('search-input').value.trim();
    if (input) {
        browseState.category = type; 
        searchTMDB(); 
    } else {
        resetBrowseState(type);
    }
};

// Reset State & Load First Page
async function resetBrowseState(category) {
    browseState.category = category;
    browseState.page = 1;
    browseState.hasMore = true;
    browseState.isLoading = false;
    
    const container = document.getElementById('search-results');
    container.innerHTML = ''; 
    
    const heading = document.getElementById('search-heading');
    const names = { 'all': 'Trending Today', 'tv': 'Popular TV Shows', 'movie': 'Popular Movies', 'anime': 'Trending Anime', 'kdrama': 'Top K-Drama', 'cdrama': 'Top C-Drama' };
    heading.innerText = names[category] || "Popular";

    await loadMoreBrowseResults();
}

// Fetch & Append Results
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

    } catch (e) { console.error(e); } finally { browseState.isLoading = false; }
}

function handleBrowseScroll() {
    const container = document.getElementById('search-results');
    if(container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        if (!document.getElementById('search-input').value.trim()) {
            loadMoreBrowseResults();
        }
    }
}

function renderBrowseResults(items) {
    const container = document.getElementById('search-results');
    items.forEach((item, index) => {
        if(!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.position = 'relative';
        card.onclick = () => { closeSearchModal(); showDetailView(item); };
        
        let badge = '';
        if (browseState.page === 1 && index < 3) {
            badge = `<div class="badge-overlay" style="background:#e50914;">HOT</div>`;
        }

        card.innerHTML = `
            ${badge}
            <img src="${POSTER_URL}${item.poster_path}" loading="lazy" style="border-radius:8px;">
            <div class="card-title">${item.title || item.name}</div>
        `;
        container.appendChild(card);
    });
}

// Search TMDB (Text Input)
window.searchTMDB = async function() {
    const query = document.getElementById('search-input').value;
    const heading = document.getElementById('search-heading');

    if (!query.trim()) {
        resetBrowseState(browseState.category); 
        return; 
    }

    heading.innerText = "Search Results";
    
    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
        const data = await res.json();
        const container = document.getElementById('search-results');
        container.innerHTML = '';
        
        if (!data.results || data.results.length === 0) {
            container.innerHTML = '<p style="color:#888; padding:10px;">No results found.</p>';
            return;
        }

        data.results.forEach(item => {
            if(!item.poster_path) return;
            if (browseState.category === 'movie' && item.media_type !== 'movie') return;
            if (browseState.category === 'tv' && item.media_type !== 'tv') return;

            const card = document.createElement('div');
            card.className = 'movie-card';
            card.onclick = () => { closeSearchModal(); showDetailView(item); };
            card.innerHTML = `<img src="${POSTER_URL}${item.poster_path}"><div class="card-title">${item.title||item.name}</div>`;
            container.appendChild(card);
        });
    } catch(e) { console.error(e); }
};


/* =========================================
   7. UI INTERACTIONS
   ========================================= */
function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const loggedOutDiv = document.getElementById('logged-out-state');
    const loggedInDiv = document.getElementById('logged-in-state');
    const loginDrop = document.getElementById('login-dropdown');
    const profileDrop = document.getElementById('profile-dropdown');

    if (isLoggedIn) {
        if(loggedOutDiv) loggedOutDiv.style.display = 'none';
        if(loggedInDiv) loggedInDiv.style.display = 'block';
    } else {
        if(loggedOutDiv) loggedOutDiv.style.display = 'block';
        if(loggedInDiv) loggedInDiv.style.display = 'none';
    }
    
    if(loginDrop) loginDrop.classList.remove('show');
    if(profileDrop) profileDrop.classList.remove('show');
}

window.toggleSidebar = function() {
    document.getElementById('main-sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
};

// Close dropdowns on click outside
window.addEventListener('click', function(e) {
    const authWrapper = document.querySelector('.auth-wrapper');
    if (authWrapper && !authWrapper.contains(e.target)) {
        const ld = document.getElementById('login-dropdown');
        const pd = document.getElementById('profile-dropdown');
        if(ld) ld.classList.remove('show');
        if(pd) pd.classList.remove('show');
    }
});

const mobCatBtn = document.getElementById('mobileCategoryBtn');
if(mobCatBtn) mobCatBtn.onclick = () => document.getElementById('categoryModal').style.display = 'flex';
const closeCatModal = document.getElementById('closeCategoryModal');
if(closeCatModal) closeCatModal.onclick = () => document.getElementById('categoryModal').style.display = 'none';

function setupTvRemoteLogic() {
    window.addEventListener('keydown', (e) => {
        const focused = document.activeElement;
        const isInputActive = focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA';

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

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    CutieLoader.show();
    
    setupCategoryTabs();
    initMovies();
    setupTvRemoteLogic(); 
    checkLoginState();
    
    if (typeof channels !== 'undefined') {
        sortedChannels = Object.entries(channels).sort((a, b) => a[1].name.localeCompare(b[1].name));
        loadFavoritesFromStorage();
        
        const lastPlayed = localStorage.getItem("lastPlayedChannel");
        if (lastPlayed && channels[lastPlayed]) currentChannelKey = lastPlayed;
        else currentChannelKey = sortedChannels[0]?.[0] || "";
        
        renderChannelButtons();
        if(currentChannelKey) loadChannel(currentChannelKey);
    }
    
    const searchInput = document.getElementById("search");
    if(searchInput) {
        searchInput.addEventListener("input", (e) => renderChannelButtons(e.target.value.trim()));
        const clear = document.getElementById("clearSearch");
        if(clear) clear.onclick = () => { searchInput.value = ""; renderChannelButtons(""); };
    }

    setTimeout(() => CutieLoader.hide(), 1000);
});
