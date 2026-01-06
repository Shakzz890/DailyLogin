/* script.js - COMPLETE MERGED VERSION */

/* =========================================
   1. UTILS & CONFIG
   ========================================= */
const API_KEY = '4eea503176528574efd91847b7a302cc'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w300';

let currentSeason = 1;
let currentEpisode = 1;
let currentItem = null;
let currentDetails = null;
let currentSlideIndex = 0;

// Provider-specific sandbox policies
const PROVIDER_SANDBOX_POLICY = {
    'vidsrc.to': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'vidsrc.me': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'vidlink.pro': "allow-scripts allow-same-origin allow-presentation allow-forms allow-pointer-lock",
    'superembed.stream': "allow-scripts allow-same-origin allow-presentation",
    '2embed.cc': "allow-scripts allow-same-origin allow-forms",
    'vidsrc.cc': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'vidsrc.xyz': "allow-scripts allow-same-origin allow-presentation",
    'vidsrc.vip': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'vidsrc.net': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'net20.cc': "allow-scripts allow-same-origin allow-forms allow-presentation"
};

/* --- LOADER CONTROL --- */
const CutieLoader = {
    show: () => {
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
   2. VIEW CONTROLLER & NAVIGATION
   ========================================= */
window.switchView = function(viewName) {
    const home = document.getElementById('home-view');
    const live = document.getElementById('live-view');
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('overlay');
    
    if(viewName === 'live') {
        if(home) home.style.display = 'none';
        if(live) {
            live.style.display = 'flex'; 
            if(window.innerWidth < 1024) live.style.flexDirection = 'column';
        }
        if(window.jwplayer) { try { jwplayer().resize(); } catch(e){} }
    } else {
        if(home) home.style.display = 'block';
        if(live) live.style.display = 'none';
        if(window.jwplayer) { try { jwplayer().stop(); } catch(e){} }
    }
    if(window.innerWidth < 1024) {
        if(sidebar) sidebar.classList.remove('open');
        if(overlay) overlay.classList.remove('active');
    }
};

window.toggleSidebar = function() {
    const sb = document.getElementById('main-sidebar');
    const ov = document.getElementById('overlay');
    if(sb) sb.classList.toggle('open');
    if(ov) ov.classList.toggle('active');
};

/* =========================================
   3. LIVE TV LOGIC
   ========================================= */
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
            <div class="channel-logo"><img src="${channel.logo}" loading="lazy" onerror="this.src='logo.png'"></div>
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

window.filterChannels = function() {
    const query = document.getElementById('live-search-input').value;
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

/* =========================================
   4. HOME PAGE LOGIC (Movies)
   ========================================= */
function showGlobalSkeletons() {
    const sliderTrack = document.getElementById('slider-track');
    if (sliderTrack) {
        sliderTrack.innerHTML = '<div class="slide skeleton-slide skeleton-shimmer"></div>';
    }

    const lists = [
        'latest-list', 'kdrama-list', 'cdrama-list', 'movies-list', 'tvshows-list', 'anime-list', 'upcoming-list'
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
        card.className = 'movie-card focusable-element fade-in';
        card.setAttribute("tabindex", "0");
        card.onclick = () => showDetailView(item);
        card.innerHTML = `
            <div class="badge-overlay">HD</div>
            <img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='placeholder.jpg'">
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
        return new Date(item.release_date) >= today;
    });
    futureItems.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

    if (futureItems.length === 0) {
        container.innerHTML = '<p style="color:#888; font-size:0.9rem;">No upcoming releases.</p>';
        return;
    }

    futureItems.forEach(item => {
        if(!item.poster_path) return;
        const dateStr = new Date(item.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const card = document.createElement('div');
        card.className = 'movie-card focusable-element fade-in';
        card.onclick = () => showDetailView(item);
        card.innerHTML = `
            <div class="coming-label">Coming ${dateStr}</div>
            <img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='placeholder.jpg'">
            <div class="card-title">${item.title || item.name}</div>
        `;
        container.appendChild(card);
    });
}

function initSlider(items) {
    const track = document.getElementById('slider-track');
    const dotsContainer = document.getElementById('slider-dots');
    if (!track || !dotsContainer) return;
    track.innerHTML = ''; dotsContainer.innerHTML = '';
    
    items.slice(0, 5).forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'slide fade-in';
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
   5. CATEGORY VIEW LOGIC
   ========================================= */
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
                const card = document.createElement('div');
                card.className = 'movie-card fade-in';
                card.onclick = () => showDetailView(item);
                
                let badge = '';
                if(categoryState.endpoint.includes('upcoming')) {
                    const dateObj = new Date(item.release_date);
                    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    badge = `<div class="coming-label">Coming ${dateStr}</div>`;
                }

                card.innerHTML = `${badge}<img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='placeholder.jpg'"><div class="card-title">${item.title || item.name}</div>`;
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

/* =========================================
   6. DETAIL VIEW LOGIC (RedFlix Style + Sandbox)
   ========================================= */

// Scroll helper
window.scrollToPlayer = function() {
    const playerSection = document.getElementById('player-section');
    if(playerSection) playerSection.scrollIntoView({ behavior: 'smooth' });
};

// Toggle Sandbox Helper
window.toggleSandbox = function() {
    const toggle = document.getElementById('sandbox-toggle');
    if (!toggle) return;
    const newState = toggle.checked; 
    localStorage.setItem("sandboxEnabled", newState);
    changeDetailServer(currentSeason, currentEpisode);
};

// Toggle Favorite Button Style
window.toggleDetailFavorite = function(btn) {
    btn.classList.toggle('active');
};

// Share Button
window.shareContent = function() {
    if (navigator.share) {
        navigator.share({ title: document.getElementById('detail-title').innerText, text: 'Watch on Shakzz TV!', url: window.location.href });
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
    }
};

// Download Button
window.downloadContent = function() {
    if(!currentItem) return;
    const title = currentItem.title || currentItem.name || "Movie";
    const targetUrl = `https://www.google.com/search?q=download+${encodeURIComponent(title)}+free`;
    window.open(targetUrl, '_blank');
};

// Close View
window.closeDetailView = function() {
    const view = document.getElementById('detail-view');
    const video = document.getElementById('detail-video');
    if(view) view.style.display = 'none';
    if(video) video.src = '';
};

// Sandbox Warning
function showSandboxWarning(server) {
    const warning = document.createElement('div');
    warning.id = 'sandbox-warning';
    warning.innerHTML = `
        <div style="position:fixed;top:10px;right:10px;background:#ff9800;color:#fff;padding:10px;border-radius:4px;z-index:10000;">
            <strong>${server} blocked by sandbox</strong><br>
            <button onclick="temporarilyDisableSandbox()" style="margin-top:5px;padding:3px 8px;background:#222;color:#fff;border:none;border-radius:3px;cursor:pointer;">Disable for this session</button>
        </div>
    `;
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 5000);
}

// Temporarily Disable Sandbox
window.temporarilyDisableSandbox = function() {
    const iframe = document.getElementById('detail-video');
    if(iframe) {
        iframe.removeAttribute("sandbox");
        iframe.removeAttribute("allowfullscreen");
        iframe.src = iframe.src; // Reload
    }
    const warning = document.getElementById('sandbox-warning');
    if(warning) warning.remove();
};

// Show Detail View
async function showDetailView(item) {
    currentItem = item;
    const view = document.getElementById('detail-view');
    if(!view) return;
    
    // 1. Basic Info
    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date || "N/A";
    const year = date.split('-')[0];
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
    
    // 2. Set DOM Elements
    const titleEl = document.getElementById('detail-title');
    const overviewEl = document.getElementById('detail-overview');
    const dateEl = document.getElementById('detail-date');
    const ratingEl = document.getElementById('detail-rating');
    
    if(titleEl) titleEl.innerText = title;
    if(overviewEl) overviewEl.innerText = item.overview || "No overview available.";
    if(dateEl) dateEl.innerText = year;
    if(ratingEl) ratingEl.innerText = rating;
    
    // 3. Set Backdrop
    const backdropImg = document.getElementById('detail-backdrop-img');
    const bgPath = item.backdrop_path || item.poster_path;
    if(backdropImg) backdropImg.src = bgPath ? `${IMG_URL}${bgPath}` : '';

    // 4. Reset Player & UI
    const video = document.getElementById('detail-video');
    if(video) video.src = '';
    
    const favBtn = document.querySelector('.watchlist-btn');
    if(favBtn) favBtn.classList.remove('active');

    // 5. Determine Type & Fetch Extras
    const isTv = item.media_type === 'tv' || item.first_air_date || (item.name && !item.title);
    currentItem.media_type = isTv ? 'tv' : 'movie'; 
    
    const filters = document.querySelector('.episode-filters');
    const genreSpan = document.getElementById('detail-genres');
    const recGrid = document.getElementById('recommendations-grid');
    
    if(genreSpan) genreSpan.innerText = "Loading...";
    if(recGrid) recGrid.innerHTML = '<p style="font-size:0.9rem; color:#888;">Loading...</p>';

    try {
        // A. Details (Genres & Seasons)
        const detailsUrl = `${BASE_URL}/${currentItem.media_type}/${item.id}?api_key=${API_KEY}`;
        const res = await fetch(detailsUrl);
        currentDetails = await res.json();

        if (genreSpan) {
            if (currentDetails.genres && currentDetails.genres.length > 0) {
                genreSpan.innerText = currentDetails.genres.map(g => g.name).slice(0, 3).join(', ');
            } else {
                genreSpan.innerText = "Unknown";
            }
        }

        if (isTv) {
            if(filters) filters.style.display = 'flex';
            populateSeasons(currentDetails.seasons);
        } else {
            if(filters) filters.style.display = 'none';
            renderMovieEpisode(); 
        }

        // B. Recommendations
        const recUrl = `${BASE_URL}/${currentItem.media_type}/${item.id}/recommendations?api_key=${API_KEY}&page=1`;
        const recRes = await fetch(recUrl);
        const recData = await recRes.json();

        if (recGrid) {
            recGrid.innerHTML = ""; 
            if (recData.results && recData.results.length > 0) {
                recData.results.slice(0, 10).forEach(recItem => {
                    if(!recItem.poster_path) return;
                    const recCard = document.createElement('div');
                    recCard.className = 'rec-card';
                    recCard.onclick = () => showDetailView(recItem);
                    recCard.innerHTML = `
                        <img src="${POSTER_URL}${recItem.poster_path}" alt="${recItem.title || recItem.name}" loading="lazy" onerror="this.src='placeholder.jpg'">
                        <div class="rec-card-title">${recItem.title || recItem.name}</div>
                    `;
                    recGrid.appendChild(recCard);
                });
            } else {
                recGrid.innerHTML = '<p style="color:#666;">No recommendations found.</p>';
            }
        }

    } catch (e) { 
        console.error("Error fetching details/recommendations:", e);
        if(genreSpan) genreSpan.innerText = "Unknown";
        if(recGrid) recGrid.innerHTML = "";
    }

    // 6. Show View & Init Player
    view.style.display = 'block';
    changeDetailServer(1, 1);
}

// Updated changeDetailServer with fixed URLs and enhanced sandbox
window.changeDetailServer = function(season = 1, episode = 1) {
    if(!currentItem) return;
    currentSeason = season;
    currentEpisode = episode;
    
    const serverSelect = document.getElementById('detail-server');
    if(!serverSelect) return;
    
    const server = serverSelect.value;
    const id = currentItem.id;
    const type = currentItem.media_type;
    
    // FIXED: Remove spaces from URLs
    let url = '';
    if(server === 'vidsrc.to') url = `https://vidsrc.to/embed/${type}/${id}${type==='tv'?`/${season}/${episode}`:''}`;
    else if(server === 'vidsrc.me') url = type==='tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}` : `https://vidsrc.me/embed/movie?tmdb=${id}`;
    else if(server === 'vidlink.pro') url = type==='tv' ? `https://vidlink.pro/tv/${id}/${season}/${episode}` : `https://vidlink.pro/movie/${id}`;
    else if(server === 'superembed.stream') url = type==='tv' ? `https://superembed.stream/tv/${id}/${season}/${episode}` : `https://superembed.stream/movie/${id}`;
    else if(server === '2embed.cc') url = `https://www.2embed.cc/embed/${id}`;
    else if(server === 'vidsrc.cc') url = type==='tv' ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.cc/v2/embed/movie/${id}`;
    else if(server === 'vidsrc.xyz') url = `https://vidsrc.xyz/embed/${type}/${id}`;
    else if(server === 'vidsrc.vip') url = type==='tv' ? `https://vidsrc.vip/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.vip/embed/movie/${id}`;
    else if(server === 'vidsrc.net') url = `https://vidsrc.net/embed/${type}/${id}`;
    else if(server === 'net20.cc') url = type==='tv' ? `https://net20.cc/embed/tv/${id}/${season}/${episode}` : `https://net20.cc/embed/movie/${id}`;

    const iframe = document.getElementById('detail-video');
    const toggleBtn = document.getElementById('sandbox-toggle');
    
    const storedSetting = localStorage.getItem("sandboxEnabled");
    const isSandboxEnabled = storedSetting !== "false";
    
    if (toggleBtn) toggleBtn.checked = isSandboxEnabled;
    
    // Provider-specific sandbox policies
    const policy = PROVIDER_SANDBOX_POLICY[server] || "allow-scripts allow-same-origin allow-presentation";
    
    if (isSandboxEnabled && policy) {
        iframe.setAttribute("sandbox", policy);
        iframe.setAttribute("allowfullscreen", "");
    } else {
        iframe.removeAttribute("sandbox");
        iframe.removeAttribute("allowfullscreen");
    }
    
    // Error detection - only if iframe exists
    if(iframe) {
        iframe.onload = function() {
            setTimeout(() => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc && iframeDoc.body && iframeDoc.body.innerHTML.length === 0) {
                        console.warn(`Empty iframe from ${server} - sandbox may be blocking`);
                        showSandboxWarning(server);
                    }
                } catch (e) {
                    // Cross-origin error expected - ignore
                }
            }, 2000);
        };
        
        iframe.src = url;
    }
    
    if (typeof window.saveWatchProgress === 'function') {
        window.saveWatchProgress(currentItem, type === 'tv' ? season : null, type === 'tv' ? episode : null);
    }
}

window.onSeasonChange = function() {
    const seasonSelect = document.getElementById('season-select');
    if(seasonSelect) {
        currentSeason = parseInt(seasonSelect.value);
        renderEpisodes(); 
    }
}

window.renderEpisodes = function() {
    const seasonSelect = document.getElementById('season-select');
    const grid = document.getElementById('episode-grid');
    if(!seasonSelect || !grid) return;
    
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

function populateSeasons(seasons) {
    const seasonSelect = document.getElementById('season-select');
    if(!seasonSelect) return;
    
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

function renderMovieEpisode() {
    const grid = document.getElementById('episode-grid');
    if(grid) grid.innerHTML = '<div class="ep-box active" onclick="changeDetailServer(1,1)">Movie</div>';
}

/* =========================================
   7. ADVANCED SEARCH & INFINITE BROWSE
   ========================================= */
let browseState = { category: 'all', page: 1, isLoading: false, hasMore: true };
const CATEGORY_ENDPOINTS = {
    'all': '/trending/all/day',
    'movie': '/movie/popular',
    'tv': '/tv/popular',
    'anime': '/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc',
    'kdrama': '/discover/tv?with_original_language=ko&with_origin_country=KR&sort_by=popularity.desc',
    'cdrama': '/discover/tv?with_original_language=zh&with_origin_country=CN&sort_by=popularity.desc'
};

/* Restored Search Helpers */
function toggleClearButton(query) {
    const btn = document.querySelector('.search-clear-btn');
    if(btn) {
        btn.style.display = (query && query.length > 0) ? 'block' : 'none';
    }
}

window.openSearchModal = () => {
    const modal = document.getElementById('search-modal');
    if(!modal) return;
    modal.style.display = 'flex';
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
};

window.handleSearchInput = () => {
    const input = document.getElementById('search-input');
    if(input) {
        toggleClearButton(input.value);
        window.searchTMDB();
    }
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

window.setSearchFilter = function(type, btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const input = document.getElementById('search-input');
    if(input && input.value.trim()) { 
        browseState.category = type; 
        window.searchTMDB(); 
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
        const endpoint = CATEGORY_ENDPOINTS[browseState.category];
        const url = `${BASE_URL}${endpoint}&api_key=${API_KEY}&page=${browseState.page}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.results || data.results.length === 0) browseState.hasMore = false;
        else {
            renderBrowseResults(data.results);
            browseState.page++; 
        }
    } catch (e) {} finally { browseState.isLoading = false; }
}

function handleBrowseScroll() {
    const container = document.getElementById('search-results');
    if(container && container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        const input = document.getElementById('search-input');
        if(!input || !input.value.trim()) loadMoreBrowseResults();
    }
}

function renderBrowseResults(items) {
    const container = document.getElementById('search-results');
    if(!container) return;
    items.forEach(item => {
        if(!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => { closeSearchModal(); showDetailView(item); };
        card.innerHTML = `<img src="${POSTER_URL}${item.poster_path}" onerror="this.src='placeholder.jpg'"><div class="card-title">${item.title || item.name}</div>`;
        container.appendChild(card);
    });
}

window.searchTMDB = async function() {
    const input = document.getElementById('search-input');
    if(!input || !input.value.trim()) { resetBrowseState(browseState.category); return; }
    try {
        const query = input.value;
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}`);
        const data = await res.json();
        const container = document.getElementById('search-results');
        if(!container) return;
        container.innerHTML = '';
        data.results.forEach(item => {
            if(!item.poster_path) return;
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.onclick = () => { closeSearchModal(); showDetailView(item); };
            card.innerHTML = `<img src="${POSTER_URL}${item.poster_path}" onerror="this.src='placeholder.jpg'"><div class="card-title">${item.title||item.name}</div>`;
            container.appendChild(card);
        });
    } catch(e) {}
};

/* =========================================
   8. UI INTERACTIONS & INIT
   ========================================= */
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

/* Restored Click Listener for Auth Dropdown */
window.addEventListener('click', function(e) {
    const authWrapper = document.querySelector('.auth-wrapper');
    if (authWrapper && !authWrapper.contains(e.target)) {
        const ld = document.getElementById('login-dropdown');
        const pd = document.getElementById('profile-dropdown');
        if(ld) ld.classList.remove('show');
        if(pd) pd.classList.remove('show');
    }
});

/* Restored Remote Logic */
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
            if (detailView && detailView.style.display === 'block') {
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
    CutieLoader.show();
    setupCategoryTabs();
    setupTvRemoteLogic();
    checkLoginState(); 
    
    // Init Sandbox Toggle State
    const toggleBtn = document.getElementById('sandbox-toggle');
    if (toggleBtn) {
        const storedSetting = localStorage.getItem("sandboxEnabled");
        toggleBtn.checked = storedSetting !== "false";
    }
    
    // MOBILE CATEGORY BUTTONS - MOVED INSIDE DOMContentLoaded
    const mobCatBtn = document.getElementById('mobileCategoryBtn');
    const categoryModal = document.getElementById('categoryModal');
    const closeCatModal = document.getElementById('closeCategoryModal');
    
    if(mobCatBtn && categoryModal) {
        mobCatBtn.onclick = () => categoryModal.style.display = 'flex';
    }
    if(closeCatModal && categoryModal) {
        closeCatModal.onclick = () => categoryModal.style.display = 'none';
    }
    
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

    // Failsafe Timeout
    setTimeout(() => {
        showGlobalSkeletons(); 
        
        // Hide loader after 2.5s even if movies fail
        setTimeout(() => { 
            CutieLoader.hide(); 
        }, 500);

        // Init movies safely
        try {
            initMovies();
        } catch(e) {
            console.error("Init movies failed", e);
        }
    }, 2500); 
});

// Final Failsafe
window.onload = function() {
    setTimeout(() => {
       const loader = document.getElementById('preloader');
       if(loader && loader.style.display !== 'none') {
           CutieLoader.hide();
       }
    }, 5000);
}