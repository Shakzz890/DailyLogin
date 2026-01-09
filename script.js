/* =========================================================
   SHAKZZ TV — MERGED SCRIPT
   (Original Redflix + Optimized Fix Combined)
   ========================================================= */
let currentDetail = {
  id: null,
  type: 'movie', // movie | tv
  season: 1,
  episode: 1,
  title: ''
};

/* =========================================================
   1. UTILS & CONFIG (URLS FIXED - NO SPACES)
   ========================================================= */
const API_KEY = '4eea503176528574efd91847b7a302cc'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_URL = 'https://image.tmdb.org/t/p/w300';
const PLACEHOLDER_IMG = 'logo.png';

// Provider-specific sandbox policies - optimized for compatibility
const PROVIDER_SANDBOX_POLICY = {
    'vidsrc.to': "allow-scripts allow-same-origin allow-presentation allow-forms allow-pointer-lock",
    'vidsrc.me': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'vidlink.pro': "allow-scripts allow-same-origin allow-presentation allow-forms allow-pointer-lock allow-orientation-lock",
    'superembed.stream': "allow-scripts allow-same-origin allow-presentation",
    '2embed.cc': "allow-scripts allow-same-origin allow-forms",
    'vidsrc.cc': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'vidsrc.xyz': "allow-scripts allow-same-origin allow-presentation",
    'vidsrc.vip': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'vidsrc.net': "allow-scripts allow-same-origin allow-presentation allow-forms",
    'net20.cc': "allow-scripts allow-same-origin allow-forms allow-presentation"
};

let currentSeason = 1;
let currentEpisode = 1;
let currentItem = null;
let currentDetails = null;
let currentSlideIndex = 0;
let lastSidebarView = 'home';
let cinemaTimer = null;
let sliderInterval = null;




/* --- LOADER CONTROL (FIXED) --- */
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
        } else {
            console.warn("Loader element #preloader not found in HTML");
        }
    }
};

function getDisplayTitle(item) {
  // Always prefer original title for PH content
  if (
    item.origin_country?.includes('PH') ||
    item.original_language === 'tl'
  ) {
    return item.original_name || item.name || item.title;
  }

  return item.title || item.name;
}

function setSidebarActive(view) {
    const searchModal = document.getElementById('search-modal');

    // 🚫 Do NOT change highlight while Explore (search) is open
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
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('overlay');

    // Views
    if (viewName === 'live') {
        if (home) home.style.display = 'none';
        if (live) live.style.display = 'flex';
    } else {
        if (home) home.style.display = 'block';
        if (live) live.style.display = 'none';
    }

    // ✅ FIX: update sidebar highlight
    setSidebarActive(viewName);

    // Mobile close
    if (window.innerWidth < 1024) {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
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

async function initMovies() {
    try {
const [
  latest,
  kdrama,
  cdrama,
  filipino, // ✅ ADD
  anime,
  movies,
  tv,
  upcoming
] = await Promise.all([
  fetchData('/tv/on_the_air?sort_by=popularity.desc'),
  fetchData('/discover/tv?with_original_language=ko&with_origin_country=KR&sort_by=popularity.desc'),
  fetchData('/discover/tv?with_original_language=zh&with_origin_country=CN&sort_by=popularity.desc'),

  // 🇵🇭 Filipino Drama
  fetchData('/discover/tv?with_original_language=tl&with_origin_country=PH&sort_by=popularity.desc'),

  fetchData('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
  fetchData('/trending/movie/week'),
  fetchData('/trending/tv/week'),
  fetchData('/movie/upcoming?region=US')
]);

        
        initSlider(movies.results);
        displayList(latest.results, 'latest-list');
        displayList(cdrama.results, 'cdrama-list');
        displayList(filipino.results, 'filipino-list');
        displayList(kdrama.results, 'kdrama-list');
        displayList(movies.results, 'movies-list');
        displayList(tv.results, 'tvshows-list');
        displayList(anime.results, 'anime-list');
        
        if (upcoming && upcoming.results) {
            displayUpcomingList(upcoming.results, 'upcoming-list');
        }

        
    } catch (e) { console.error(e); } 
}


function playContent() {
    const overlay = document.getElementById('player-overlay');
    const iframe = document.getElementById('overlay-video');

    if (!overlay || !iframe || !currentItem) return;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    changeDetailServer(currentSeason, currentEpisode, iframe);
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
        
        card.onclick = () => {
            CutieLoader.show("Opening...");
            setTimeout(() => showDetailView(item), 10);
        };
        
        card.innerHTML = `
            <div class="badge-overlay">HD</div>
            <img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
            <div class="card-title">${getDisplayTitle(item)}</div>
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
        card.onclick = () => {
            CutieLoader.show("Opening...");
            setTimeout(() => showDetailView(item), 10);
        };
        card.innerHTML = `
            <div class="coming-label">Coming ${dateStr}</div>
            <img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
            <div class="card-title">${getDisplayTitle(item)}</div>
        `;
        container.appendChild(card);
    });
}

function initSlider(items) {
    const track = document.getElementById('slider-track');
    const dotsContainer = document.getElementById('slider-dots');
    if (!track || !dotsContainer || !items?.length) return;

    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    currentSlideIndex = 0;
    const slideCount = Math.min(items.length, 5);

    items.slice(0, slideCount).forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'slide fade-in';
        slide.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
        slide.onclick = () => {
            CutieLoader.show("Opening...");
            setTimeout(() => showDetailView(item), 10);
        };
        slide.innerHTML = `
            <div class="slide-content">
                <h1>${getDisplayTitle(item)}</h1>
            </div>
        `;
        track.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = index === 0 ? 'dot active' : 'dot';
        dotsContainer.appendChild(dot);
    });

    if (sliderInterval) clearInterval(sliderInterval);

    sliderInterval = setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % slideCount;
        track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
        document.querySelectorAll('.dot').forEach((d, i) =>
            d.classList.toggle('active', i === currentSlideIndex)
        );
    }, 4000);
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
                const card = document.createElement('div');
                card.className = 'movie-card fade-in';
                card.onclick = () => {
                    CutieLoader.show("Opening...");
                    setTimeout(() => showDetailView(item), 10);
                };
                
                let badge = '';
                if(categoryState.endpoint.includes('upcoming')) {
                    const dateObj = new Date(item.release_date);
                    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    badge = `<div class="coming-label">Coming ${dateStr}</div>`;
                }

                card.innerHTML = `${badge}<img src="${POSTER_URL}${item.poster_path}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'"><div class="card-title">${getDisplayTitle(item)}</div>`;
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
   6. DETAIL VIEW LOGIC (MERGED & OPTIMIZED)
   ========================================================= */
async function showDetailView(item) {
    currentItem = item;
    currentDetail.id = item.id;
    currentDetail.type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    currentDetail.title = item.title || item.name || '';
    currentDetail.season = 1;
    currentDetail.episode = 1;

    const view = document.getElementById('detail-view');
    if (!view) return;

    const backdrop = view.querySelector('.detail-backdrop-container');
    const playerSection = document.getElementById('player-section');
    const video = document.getElementById('detail-video');

    document.body.classList.remove('cinema-hide');
    document.body.style.overflow = 'hidden';
    view.style.display = 'flex';

    if (playerSection) playerSection.style.display = 'none';
    if (video) video.src = '';

    // ✅ SAFE SWIPE (BACKDROP ONLY, ONCE)
    let startY = 0;
    let startX = 0;

    if (backdrop && !backdrop.dataset.swipeBound) {
        backdrop.dataset.swipeBound = 'true';

        backdrop.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) return;
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
        }, { passive: true });

        backdrop.addEventListener('touchend', e => {
            const endY = e.changedTouches[0].clientY;
            const endX = e.changedTouches[0].clientX;

            if (endY - startY > 150 && Math.abs(endX - startX) < 80) {
                closeDetailView();
            }
        }, { passive: true });
    }

    // UI DATA
    document.getElementById('detail-title').innerText = getDisplayTitle(item);
    document.getElementById('detail-overview').innerText = item.overview || 'No overview';
    document.getElementById('detail-date').innerText =
        (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
    document.getElementById('detail-rating').innerText =
        item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    const bg = document.getElementById('detail-backdrop-img');
    if (bg && item.backdrop_path) bg.src = IMG_URL + item.backdrop_path;

    loadWatchProgress();

    try {
        const type = currentDetail.type === 'tv' ? 'tv' : 'movie';
        const [details, recs] = await Promise.all([
            fetch(`${BASE_URL}/${type}/${item.id}?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}`).then(r => r.json())
        ]);

        populateSeasons(details.seasons || []);
        renderMovieEpisode();

        const recGrid = document.getElementById('recommendations-grid');
        recGrid.innerHTML = '';

        recs.results?.slice(0, 10).forEach(r => {
            if (!r.poster_path) return;
            const d = document.createElement('div');
            d.className = 'rec-card';
            d.innerHTML = `<img src="${POSTER_URL}${r.poster_path}"><div>${r.title || r.name}</div>`;
            d.onclick = () => showDetailView(r);
            recGrid.appendChild(d);
        });

    } finally {
        CutieLoader.hide();
    }
}

 
function closeDetailView() {
    if (currentItem) saveWatchProgress();

    const view = document.getElementById('detail-view');
    const video = document.getElementById('detail-video');

    document.body.classList.remove('cinema-hide');
    document.body.style.overflow = '';

    if (view) {
        view.style.opacity = '0';
        setTimeout(() => {
            view.style.display = 'none';
            view.style.opacity = '1';
            if (video) video.src = '';
        }, 250);
    }
}

function loadSeasons(id) {
    // Placeholder for additional season loading logic
    // Already populated via populateSeasons() in showDetailView
}

function onSeasonChange() {
    const seasonSelect = document.getElementById('season-select');
    if(seasonSelect) {
        currentSeason = parseInt(seasonSelect.value);
        currentDetail.season = currentSeason;
        currentDetail.episode = 1;
        renderEpisodes();
    }
}

async function renderEpisodes() {
    try {
        const res = await fetch(
            `${BASE_URL}/tv/${currentDetail.id}/season/${currentSeason}?api_key=${API_KEY}`
        );
        const data = await res.json();

        const grid = document.getElementById('episode-grid');
        grid.innerHTML = '';

        data.episodes.forEach(ep => {
            const watched = localStorage.getItem(
                `watched_${currentDetail.id}_${currentSeason}_${ep.episode_number}`
            );

            grid.innerHTML += `
                <button class="ep-btn ${watched ? 'watched' : ''}"
                  onclick="playEpisode(${ep.episode_number})">
                  EP ${ep.episode_number}
                </button>`;
        });
    } catch (err) {
        console.error(err);
    }
}

function playEpisode(ep) {
    currentDetail.episode = ep;
    currentEpisode = ep;
    playContent();
}

function toggleSandbox() {
    const toggle = document.getElementById('sandbox-toggle');
    if (!toggle) return;
    const newState = toggle.checked; 
    localStorage.setItem("sandboxEnabled", newState);
    changeDetailServer(currentSeason, currentEpisode);
}

function changeDetailServer(season = 1, episode = 1, targetIframe = null) {

    if(!currentItem) return;
    
    currentSeason = season;
    currentEpisode = episode;
    currentDetail.season = season;
    currentDetail.episode = episode;
    
    const serverSelect = document.getElementById('detail-server');
    if(!serverSelect) return;
    
    const server = serverSelect.value;
    const id = currentItem.id;
    const type = currentDetail.type;
    
    // Fixed: No spaces in URLs
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
    else if (server === 'viu') {
  // Placeholder — map TMDB → VIU ID later
  url = `https://www.viu.com/ott/ph/en-us/vod/${currentItem.id}`;
}


    const iframe =
    targetIframe ||
    document.getElementById('overlay-video') ||
    document.getElementById('detail-video');
    const toggleBtn = document.getElementById('sandbox-toggle');

    // Sandbox logic
    const storedSetting = localStorage.getItem("sandboxEnabled");
    const isSandboxEnabled = storedSetting !== "false";
    
    if (toggleBtn) toggleBtn.checked = isSandboxEnabled;
    
    const policy = PROVIDER_SANDBOX_POLICY[server];

    if (isSandboxEnabled && policy) {
        iframe.setAttribute("sandbox", policy);
        iframe.setAttribute("allowfullscreen", "");
    } else {
        iframe.removeAttribute("sandbox");
        iframe.removeAttribute("allowfullscreen");
    }

    // Set src after applying sandbox
    if(iframe) iframe.src = url;
    
    // Save progress
    saveWatchProgress();
    markEpisodeWatched();
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
    seasonSelect.value = currentDetail.season || 1;
    seasonSelect.onchange = onSeasonChange;
    onSeasonChange();
}

function renderMovieEpisode() {
    const grid = document.getElementById('episode-grid');
    if(grid) grid.innerHTML = '<div class="ep-box active" onclick="playContent()">Movie</div>';
}

// Watch Progress Functions from Redflix
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

function updateContinueWatching() {
    let list = JSON.parse(localStorage.getItem('continue_list') || '[]');

    list = list.filter(i => i.id !== currentDetail.id);
    list.unshift({
        id: currentDetail.id,
        title: currentDetail.title,
        type: currentDetail.type
    });

    localStorage.setItem('continue_list', JSON.stringify(list.slice(0, 10)));
}

window.toggleDetailFavorite = function(btn) {
    btn.classList.toggle('active');
};

function closePlayerOverlay() {
    const overlay = document.getElementById('player-overlay');
    const iframe = document.getElementById('overlay-video');

    if (iframe) iframe.src = '';
    if (overlay) overlay.style.display = 'none';

    document.body.style.overflow = '';
}


window.shareContent = function() {
    const titleEl = document.getElementById('detail-title');
    if (navigator.share) {
        navigator.share({
            title: titleEl ? titleEl.innerText : 'Shakzz TV',
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
    const targetUrl = `https://www.google.com/search?q=download+${encodeURIComponent(title)}+free`;
    window.open(targetUrl, '_blank');
};

window.scrollToPlayer = function() {
    const playerSection = document.getElementById('player-section');
    if(playerSection) playerSection.scrollIntoView({ behavior: 'smooth' });
};

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

  // 🇵🇭 Filipino
  'filipino': '/discover/tv?with_original_language=tl&with_origin_country=PH&sort_by=popularity.desc'
};



window.openSearchModal = () => {
    const modal = document.getElementById('search-modal');
    if(!modal) return;

    modal.style.display = 'flex';

    // ✅ ADD THIS LINE
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

    setSidebarActive(lastSidebarView);
};



window.handleSearchInput = () => {
    const input = document.getElementById('search-input');
    if (!input) return;

    toggleClearButton(input.value);

    clearTimeout(searchDebounceTimer);

    searchDebounceTimer = setTimeout(() => {
        searchTMDB();
    }, 400); // 👈 smooth delay
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

    if (
    container.scrollTop + container.clientHeight >= container.scrollHeight - 120 &&
    browseState.hasMore
) {
    loadMoreBrowseResults();
}

}


function renderBrowseResults(items) {
    const container = document.getElementById('search-results');
    if(!container) return;
    items.forEach(item => {
        if(!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => {
            CutieLoader.show("Opening...");
            closeSearchModal();
            setTimeout(() => showDetailView(item), 10);
        };
        card.innerHTML = `<img src="${POSTER_URL}${item.poster_path}" onerror="this.src='${PLACEHOLDER_IMG}'"><div class="card-title">${getDisplayTitle(item)}</div>`;
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
    browseState.hasMore = false; // disable trending pagination
    container.innerHTML = '';

    try {
        const res = await fetch(
            `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
        );
        const data = await res.json();

        if (!data.results || data.results.length === 0) {
            container.innerHTML =
                '<p style="color:#888; padding:10px;">No results found.</p>';
            return;
        }

        data.results.forEach(item => {
            if (!item.poster_path) return;
            if (browseState.category === 'movie' && item.media_type !== 'movie') return;
            if (browseState.category === 'tv' && item.media_type !== 'tv') return;

            const card = document.createElement('div');
            card.className = 'movie-card';
            card.onclick = () => {
                closeSearchModal();
                showDetailView(item);
            };

            card.innerHTML = `
                <img src="${POSTER_URL}${item.poster_path}">
                <div class="card-title">${getDisplayTitle(item)}</div>
            `;

            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
    }
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

// Skip Intro Button (from Redflix)
document.getElementById('skipIntroBtn')?.addEventListener('click', () => {
    const iframe =
        document.getElementById('overlay-video') ||
        document.getElementById('detail-video');

    iframe?.contentWindow?.postMessage({ action: 'seek', time: 85 }, '*');
});


['mousemove','touchstart','keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
        const playerSection = document.getElementById('player-section');

        // ❌ Do NOT run cinema mode if player is hidden
        if (!playerSection || playerSection.style.display !== 'block') return;

        document.body.classList.remove('cinema-hide');
        clearTimeout(cinemaTimer);

        cinemaTimer = setTimeout(() => {
            document.body.classList.add('cinema-hide');
        }, 3000);
    });
});


/* =========================================================
   FIXED: SMART SWIPE-TO-CLOSE LOGIC
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    CutieLoader.show("Initializing...");

    try {
        /* ============================
           1. Setup UI Logic
        ============================ */
        setupCategoryTabs();
        setupTvRemoteLogic();
        checkLoginState();

        // Sandbox Toggle
        const toggleBtn = document.getElementById('sandbox-toggle');
        if (toggleBtn) {
            toggleBtn.checked = localStorage.getItem("sandboxEnabled") !== "false";
        }

        // Mobile Category Modal
        const mobCatBtn = document.getElementById('mobileCategoryBtn');
        const categoryModal = document.getElementById('categoryModal');
        const closeCatModal = document.getElementById('closeCategoryModal');

        if (mobCatBtn && categoryModal) {
            mobCatBtn.onclick = () => categoryModal.style.display = 'flex';
        }
        if (closeCatModal && categoryModal) {
            closeCatModal.onclick = () => categoryModal.style.display = 'none';
        }

        /* ============================
           2. Initialize Channels
        ============================ */
        if (typeof channels !== 'undefined') {
            sortedChannels = Object.entries(channels)
                .sort((a, b) => a[1].name.localeCompare(b[1].name));

            loadFavoritesFromStorage();

            const lastPlayed = localStorage.getItem("lastPlayedChannel");
            currentChannelKey =
                lastPlayed && channels[lastPlayed]
                    ? lastPlayed
                    : sortedChannels[0]?.[0] || "";

            renderChannelButtons();

            if (currentChannelKey) {
                loadChannel(currentChannelKey);
            }
        }

        /* ============================
           3. Initialize Movies
        ============================ */
        showGlobalSkeletons();
        initMovies().finally(() => {
            CutieLoader.hide();
        });

    } catch (e) {
        console.error("Fatal init error:", e);
        CutieLoader.hide(); // 🛡️ GUARANTEED HIDE
    }
});

