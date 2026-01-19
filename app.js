/**
 * 宮城県離島スタンプラリー アプリケーション
 * メインスクリプト (最終完成版)
 */

//================================================================
// 定数データ
//================================================================

const islands = [
  { id: "aji", name: "網地島", lat: 38.274976, lng: 141.461628, description: "東北の”ハワイ”ビーチとして知られる網地白浜海水浴場は、美しいエメラルドグリーンが特徴で、東北有数の透明度を誇る。", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//aji.JPG", qrLocation: "網地浜船着場待合所" },
  { id: "tashiro", name: "田代島", lat: 38.294834, lng: 141.426264, description: "”猫の島”として有名で、猫神社もある猫好きの聖地。人口より猫が多く、猫神社が「島の宝100景」に選定。", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//tashiro.jpg", qrLocation: "仁斗田港船着場待合所" },
  { id: "katsura", name: "桂島", lat: 38.334949, lng: 141.095117, description: "塩竈市本土から一番近い島。島内には遊歩道があり、風光明媚な景観を楽しむことができるほか、夏には海水浴場がオープンし、多くの観光客で賑わう。", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//katsura.JPG", qrLocation: "桂島ステイ・ステーション" },
  { id: "nonoshima", name: "野々島", lat: 38.338475, lng: 141.105808, description: "宿泊研 修施設「ブルーセンター」や診療所、小中学校があり、生活面でも中心的な島。ボラと呼ばれる洞穴群や椿のトンネルなど神秘的な景観が魅力。", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//nono.jpg", qrLocation: "菜の花ラウンジ(浦戸諸島開発総合センター)" },
  { id: "sabusawa", name: "寒風沢島", lat: 38.338049, lng: 141.118135, description: "江戸時代に伊達藩の江戸廻米の港として繁栄を極め、当時を語り継ぐ風景や歴史が多く存在する。島の奥には懐かしい田園風景、美しい砂浜に辿り着く。", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//sabusawa.jpeg", qrLocation: "寒風沢桟橋前待合所" },
  { id: "ho", name: "朴島", lat: 38.348959, lng: 141.124619, description: "浦戸諸島の有人島で一番小さく、ミネラル豊富な漁場で種牡蠣の生産地として有名。仙台白菜の種も生産しており、春には美しい菜の花の景色が楽しめる。", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//ho.jpg", qrLocation: "市営汽船朴島待合室" },
  { id: "izushima", name: "出島", lat: 38.457811, lng: 141.518860, description: "2024年完成の大橋で本土と直結。釣りや散策が気軽に楽しめる。出島大橋が開通しアクセスが向上、レクリエーションに適した島。", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//ide.jpg", qrLocation: "出島漁港内公衆用トイレ" },
  { id: "enoshima", name: "江島", lat: 38.400473, lng: 141.593721, description: "江島褶曲地層があり、海鳥繁殖地としても知られる。断崖が迫る冒険的な島で、ウミネコの観察や神社巡りも楽しめる。", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//enoshima.jpg", qrLocation: "江島離島航路待合所" },
];

const prizes = [
  { name: "A賞", points: 3, description: "みやぎの特産品（5,000円相当）" },
  { name: "B賞", points: 2, description: "みやぎの特産品（3,000円相当）" },
  { name: "C賞", points: 1, description: "みやぎの特産品（1,000円相当）" },
  { name: "D賞", points: 1, description: "みやぎポイント 1,000pt" }
];

//================================================================
// グローバル状態変数
//================================================================

let currentUser = null;
let userProfile = null;
let collectedStamps = new Set();
let map;
let markers = [];
let userLocationMarker = null;
let html5Qrcode;
let isProcessingQR = false;
let isAppInitialized = false;
let canUseCamera = false;
let prizeHistory = [];
let qrScanTimeout = null;

//================================================================
// スタンプラリー設定
//================================================================

const STAMP_RALLY_CONFIG = {
    IS_ENDED: true  // スタンプラリー期間終了フラグ
};

//================================================================
// 1. アプリケーションのエントリーポイントと認証管理
//================================================================

document.addEventListener('DOMContentLoaded', () => {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            currentUser = session.user;
            showAuthenticatedUI();
            loadAndInitializeApp();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userProfile = null;
            showLoginUI();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentUser) {
            console.log("アプリが再度表示されました。位置情報を再チェックします。");
            checkInitialLocationAndSetCameraPermission();
        }
    });
});

//================================================================
// 2. UI表示の切り替え
//================================================================

function showAuthenticatedUI() {
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
}

function showLoginUI() {
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'block';
}

//================================================================
// 3. データの読み込みとアプリ初期化
//================================================================

async function loadAndInitializeApp() {
    await fetchUserData();
    // ★★★ 当選者入力フォーム機能を一時停止 ★★★
    // await checkIfWinnerAndRequestInfo();
    // ★★★ ここまで ★★★
    initializeApp();
    await checkInitialLocationAndSetCameraPermission();
}

async function fetchUserData() {
    if (!currentUser) return;
    try {
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles').select('total_points').eq('id', currentUser.id).single();
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        userProfile = profileData || { total_points: 0 };

        const { data: stampsData, error: stampsError } = await supabaseClient
            .from('collected_stamps').select('island_id').eq('user_id', currentUser.id);
        if (stampsError) throw stampsError;
        collectedStamps = new Set(stampsData.map(s => s.island_id));

        const { data: historyData, error: historyError } = await supabaseClient
            .from('prize_entries').select('prize_name, points_spent, entry_at').eq('user_id', currentUser.id).order('entry_at', { ascending: false });
        if (historyError) throw historyError;
        prizeHistory = historyData || [];

    } catch (error) {
        console.error("ユーザーデータの取得に失敗しました:", error);
        userProfile = { total_points: 0 };
        collectedStamps = new Set();
        prizeHistory = [];
    }
}

function initializeApp() {
    if (isAppInitialized) return;
    initializeMap();
    initializeNavigation();
    initializeQRCamera();
    initializeStampCards();
    initializePrizeSection();
    renderPrizes();
    renderHistory();
    updatePointsDisplay();
    initializeGeolocation();
    isAppInitialized = true;

    // 期間終了の場合、起動時に全画面モーダルでお知らせを表示
    if (STAMP_RALLY_CONFIG.IS_ENDED) {
        setTimeout(() => {
            showEndPeriodModal();
        }, 500);
    }
}

//================================================================
// 4. 主要機能 (Supabase連携)
//================================================================

async function onScanSuccess(decodedText) {
    if (qrScanTimeout) {
        clearTimeout(qrScanTimeout);
        qrScanTimeout = null;
    }

    if (isProcessingQR) {
        return;
    }
    isProcessingQR = true;

    const qrStatus = document.getElementById('qrStatus');
    qrStatus.textContent = 'QRコードをチェックしています...';
    qrStatus.className = 'qr-status info';

    try {
        const normalizedDecodedText = decodedText.trim().normalize();
        const matchedIsland = islands.find(island => island.name.normalize() === normalizedDecodedText);

        if (!matchedIsland) {
            throw new Error(`「${decodedText}」は対象外のQRコードです。`);
        }

        qrStatus.textContent = 'スタンプをデータベースに保存中...';

        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('add_stamp_and_point', {
            p_island_id: matchedIsland.id
        });

        if (rpcError) {
            throw new Error(rpcError.message);
        }

        collectedStamps.add(matchedIsland.id);
        userProfile.total_points += 1;

        if (html5Qrcode && html5Qrcode.isScanning) {
            await html5Qrcode.stop().catch(err => console.error("QRスキャナの停止に失敗しました。", err));
        }

        closeQRCamera();
        showSuccessModal(matchedIsland.name, () => {
            updatePointsDisplay();
            updateStampCards();
            updateMapMarkers();
            updatePrizes();
        });

        isProcessingQR = false;

    } catch (error) {
        console.error("スタンプ処理中にエラーが発生しました:", error);

        const cleanErrorMessage = error.message.replace(/^(Error: )?/, '');
        qrStatus.textContent = cleanErrorMessage;
        qrStatus.className = 'qr-status error';

        showMessage(cleanErrorMessage, 'error');

        setTimeout(async () => {
            isProcessingQR = false;
            qrStatus.textContent = 'QRコードを枠内に収めてください';
            qrStatus.className = 'qr-status info';
        }, 3000);

    } finally {
        if (isProcessingQR) {
            setTimeout(() => {
                isProcessingQR = false;
            }, 2000);
        }
    }
}

async function applyForPrize(prizeIndex) {
    // 期間終了チェック
    if (STAMP_RALLY_CONFIG.IS_ENDED) {
        showMessage("応募期間は終了しました。ご参加ありがとうございました。", 'warning', 5000);
        return;
    }

    const prize = prizes[prizeIndex];
    if (userProfile.total_points < prize.points) {
        showMessage("ポイントが足りません。", 'warning');
        return;
    }
    showConfirmModal(prize, async () => {
        try {
            const rpcParams = { p_prize_name: prize.name, p_points_spent: prize.points };
            const { data, error } = await supabaseClient.rpc('apply_for_prize', rpcParams);
            if (error) throw error;
            if (data !== '応募に成功しました。') throw new Error(data);

            showMessage(`${prize.name}に応募しました！`, 'success');

            await fetchUserData();
            updatePointsDisplay();
            updatePrizes();
            renderHistory();
        } catch (error) {
            console.error("応募処理に失敗しました:", error);
            showMessage(`応募処理中にエラーが発生しました: ${error.message}`, 'error');
        }
    });
}

//================================================================
// 5. UIコンポーネントの初期化と更新
//================================================================

function initializeMap() {
    if (map) { map.remove(); }
    map = L.map('map').setView([38.3, 141.3], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
    markers = [];
    islands.forEach(addIslandMarker);
}

function addIslandMarker(island) {
    const isCollected = collectedStamps.has(island.id);
    const iconHtml = `<div class="island-marker ${isCollected ? 'collected' : ''}">🏝️</div>`;
    const customIcon = L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
    const marker = L.marker([island.lat, island.lng], { icon: customIcon }).addTo(map);

    const popupContent = `<div class="island-popup">
                              <img src="${island.image}" alt="${island.name}" onerror="this.style.display='none'">
                              <h3>${island.name}</h3>
                              <p>${island.description}</p>
                              <p class="qr-location"><b>設置場所:</b> ${island.qrLocation || '各島の主要施設'}</p>
                              ${isCollected ? '<p style="color: var(--color-success); font-weight: bold;">✓ スタンプ獲得済み</p>' : ''}
                           </div>`;
    marker.bindPopup(popupContent);
    markers.push({ marker, island });
}

function updateMapMarkers() {
    markers.forEach(({ marker, island }) => {
        const isCollected = collectedStamps.has(island.id);
        const iconHtml = `<div class="island-marker ${isCollected ? 'collected' : ''}">🏝️</div>`;
        const newIcon = L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
        marker.setIcon(newIcon);

        const popupContent = `<div class="island-popup">
                                  <img src="${island.image}" alt="${island.name}" onerror="this.style.display='none'">
                                  <h3>${island.name}</h3>
                                  <p>${island.description}</p>
                                  <p class="qr-location"><b>設置場所:</b> ${island.qrLocation || '各島の主要施設'}</p>
                                  ${isCollected ? '<p style="color: var(--color-success); font-weight: bold;">✓ スタンプ獲得済み</p>' : ''}
                               </div>`;
        marker.setPopupContent(popupContent);
    });
}

function initializeGeolocation() {
    if (!navigator.geolocation) { console.log("お使いのブラウザは位置情報機能に対応していません。"); return; }
    const locationOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const latLng = [latitude, longitude];
            if (userLocationMarker) {
                userLocationMarker.setLatLng(latLng);
            } else {
                const userIcon = L.divIcon({ html: '<div class="user-location-marker"></div>', className: 'custom-user-location-container', iconSize: [24, 24], iconAnchor: [12, 12] });
                userLocationMarker = L.marker(latLng, { icon: userIcon }).addTo(map);
                map.setView(latLng, 13);
            }
        },
        (error) => {
            console.error("位置情報の取得に失敗しました: ", error);
            if (error.code === 1) showMessage("位置情報の利用が許可されていません。", "warning");
        },
        locationOptions
    );
}

function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            switchSection(this.dataset.section);
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        if (sectionId === 'mapSection' && map) map.invalidateSize();
    }

    const qrButton = document.getElementById('qrCameraBtn');
    if (sectionId === 'entrySection') {
        qrButton.style.display = 'none';
    } else {
        qrButton.style.display = 'flex';
    }
}

function initializeQRCamera() {
    document.getElementById('qrCameraBtn').addEventListener('click', openQRCamera);
    document.getElementById('closeQrModal').addEventListener('click', closeQRCamera);
    document.getElementById('qrModal').addEventListener('click', (e) => { if (e.target.id === 'qrModal') closeQRCamera(); });
    html5Qrcode = new Html5Qrcode("qrReader");
}

async function openQRCamera() {
    // 期間終了チェック
    if (STAMP_RALLY_CONFIG.IS_ENDED) {
        showMessage("スタンプラリーの期間は終了しました。スタンプカードの確認は引き続きご利用いただけます。", "warning", 5000);
        return;
    }

    if (!canUseCamera) {
        showMessage("スタンプラリーエリア外です。QRスキャンを利用するにはいずれかの島に近づいてください。", "warning");
        return;
    }
    isProcessingQR = false;
    const qrModal = document.getElementById('qrModal');
    const qrStatus = document.getElementById('qrStatus');
    qrModal.classList.add('active');
    qrStatus.textContent = 'カメラを起動しています...';
    qrStatus.className = 'qr-status info';
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    try {
        await html5Qrcode.start(
            { facingMode: "environment" }, config,
            (decodedText, decodedResult) => {
                if (isProcessingQR) return;
                onScanSuccess(decodedText);
            }
        );
        qrStatus.textContent = 'QRコードを枠内に収めてください';
        qrStatus.className = 'qr-status info';

        qrScanTimeout = setTimeout(() => {
            console.log("10秒間読み取りがなかったため、カメラを自動的に閉じます。");
            closeQRCamera();
            showMessage("タイムアウトしました。もう一度お試しください。", "warning");
        }, 10000);

    } catch (err) {
        console.error("html5-qrcode.start() failed", err);
        let message = 'カメラの起動に失敗しました。';
        if (err.name === 'NotAllowedError') message = 'カメラの利用が許可されていません。ブラウザの設定を確認してください。';
        qrStatus.textContent = message;
        qrStatus.className = 'qr-status error';
    }
}

function closeQRCamera() {
    if (qrScanTimeout) {
        clearTimeout(qrScanTimeout);
        qrScanTimeout = null;
    }

    if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(err => console.error("QRスキャナの停止に失敗しました。", err));
    }
    document.getElementById('qrModal').classList.remove('active');
}

function initializeStampCards() {
    const stampGrid = document.getElementById('stampGrid');
    stampGrid.innerHTML = '';
    islands.forEach(island => {
        const stampCard = document.createElement('div');
        stampCard.className = 'stamp-card';
        stampCard.id = `stamp-${island.id}`;
        stampCard.innerHTML = `<span class="stamp-icon">🏝️</span><div class="stamp-name">${island.name}</div><div class="stamp-status">未獲得</div>`;
        stampGrid.appendChild(stampCard);
    });
    updateStampCards();
}

function updateStampCards() {
    islands.forEach(island => {
        const stampCard = document.getElementById(`stamp-${island.id}`);
        if (!stampCard) return;
        const statusElement = stampCard.querySelector('.stamp-status');
        let currentIconElement = stampCard.querySelector('.stamp-icon, .stamp-image');
        if (collectedStamps.has(island.id)) {
            stampCard.classList.add('collected');
            statusElement.textContent = '獲得済み';
            if (currentIconElement && currentIconElement.tagName !== 'IMG') {
                const img = document.createElement('img');
                img.src = `./assets/${island.id}.png`;
                img.alt = `${island.name} スタンプ`;
                img.className = 'stamp-image';
                currentIconElement.replaceWith(img);
            } else if (!currentIconElement) {
                 const img = document.createElement('img');
                 img.src = `./assets/${island.id}.png`;
                 img.alt = `${island.name} スタンプ`;
                 img.className = 'stamp-image';
                 stampCard.prepend(img);
            }
        } else {
            stampCard.classList.remove('collected');
            statusElement.textContent = '未獲得';
            if (currentIconElement && currentIconElement.tagName === 'IMG') {
                const span = document.createElement('span');
                span.className = 'stamp-icon';
                span.textContent = '🏝️';
                currentIconElement.replaceWith(span);
            } else if (!currentIconElement) {
                const span = document.createElement('span');
                span.className = 'stamp-icon';
                span.textContent = '🏝️';
                stampCard.prepend(span);
            }
        }
    });
}

function renderPrizes() {
    const prizesContainer = document.getElementById('prizesContainer');
    prizesContainer.innerHTML = '';
    prizes.forEach((prize, index) => {
        const prizeCard = document.createElement('div');
        prizeCard.className = 'prize-card';
        prizeCard.innerHTML = `<div class="prize-info"><h3>${prize.name}</h3><p>${prize.description}</p></div><div class="prize-points">${prize.points}スタンプ</div><button class="prize-btn" data-prize-index="${index}">応募する</button>`;
        prizesContainer.appendChild(prizeCard);
    });
    updatePrizes();
}

function initializePrizeSection() {
    const prizesContainer = document.getElementById('prizesContainer');
    prizesContainer.addEventListener('click', (event) => {
        const prizeButton = event.target.closest('.prize-btn');
        if (prizeButton && !prizeButton.disabled) {
            const prizeIndex = parseInt(prizeButton.dataset.prizeIndex, 10);
            applyForPrize(prizeIndex);
        }
    });
}

function updatePrizes() {
    const prizeButtons = document.querySelectorAll('.prize-btn');
    const currentPoints = userProfile ? userProfile.total_points : 0;
    prizeButtons.forEach((btn) => {
        const prizeIndex = parseInt(btn.dataset.prizeIndex, 10);
        const prize = prizes[prizeIndex];
        if (prize) {
            const canApply = currentPoints >= prize.points;
            btn.disabled = !canApply;
            btn.textContent = canApply ? '応募する' : `${prize.points}スタンプ必要`;
        }
    });
}

function updatePointsDisplay() {
    const pointsValue = document.getElementById('pointsValue');
    pointsValue.textContent = userProfile ? userProfile.total_points : 0;
}

//================================================================
// 6. ユーティリティ
//================================================================

function renderHistory() {
    const historyList = document.getElementById('historyList');
    const historyContainer = document.getElementById('historyContainer');
    if (!historyList || !historyContainer) return;
    historyList.innerHTML = '';
    if (prizeHistory.length === 0) {
        historyContainer.style.display = 'none';
        return;
    }
    historyContainer.style.display = 'block';
    prizeHistory.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'history-item';
        const entryDate = new Date(entry.entry_at).toLocaleString('ja-JP');
        li.innerHTML = `<div class="info"><div class="prize-name">${entry.prize_name}</div><div class="entry-time">${entryDate}</div></div><div class="points">${entry.points_spent}スタンプ 消費</div>`;
        historyList.appendChild(li);
    });
}

function showSuccessModal(islandName, callback) {
    const successModal = document.getElementById('successModal');
    document.getElementById('successTitle').textContent = 'スタンプ獲得！';
    document.getElementById('successMessage').textContent = `${islandName}のスタンプを獲得しました！ポイントが1つ増えました。`;
    successModal.classList.add('active');
    const closeButton = document.getElementById('closeSuccessModal');
    closeButton.onclick = () => {
        successModal.classList.remove('active');
        if (callback && typeof callback === 'function') callback();
        closeButton.onclick = null;
    };
}

function showConfirmModal(prize, onConfirm) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmApplyBtn');
    const cancelBtn = document.getElementById('cancelApplyBtn');
    confirmTitle.textContent = `${prize.name}への応募`;
    confirmMessage.textContent = `${prize.points}スタンプを消費します。本当によろしいですか？`;
    confirmModal.classList.add('active');
    confirmBtn.onclick = () => {
        confirmModal.classList.remove('active');
        onConfirm();
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };
    cancelBtn.onclick = () => {
        confirmModal.classList.remove('active');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };
}

function showEndPeriodModal() {
    const endPeriodModal = document.getElementById('endPeriodModal');
    endPeriodModal.classList.add('active');
    const closeButton = document.getElementById('closeEndPeriodModal');
    closeButton.onclick = () => {
        endPeriodModal.classList.remove('active');
        closeButton.onclick = null;
    };
}

/**
 * 画面上部にメッセージを表示する。
 * この関数はPromiseを返し、メッセージが消えると解決される。
 * @param {string} message 表示するテキスト
 * @param {'info'|'success'|'warning'|'error'} type メッセージの種類
 * @param {number} duration 表示時間 (ミリ秒)
 * @returns {Promise<void>}
 */
function showMessage(message, type = 'info', duration = 3000) {
    return new Promise(resolve => {
        // 既存のメッセージをすべて探し、重なりを防ぐために削除する
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        // 指定された時間後にメッセージを削除し、Promiseを解決する
        setTimeout(() => {
            // メッセージがまだDOMに存在する場合のみ削除
            if (document.body.contains(messageDiv)) {
                messageDiv.remove();
            }
            resolve();
        }, duration);
    });
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { return reject(new Error('お使いのブラウザは位置情報機能に対応していません。')); }
        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
}

function getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * アプリ起動時に現在地を確認し、QRカメラの使用可否を設定する。
 * メッセージの表示タイミングを制御し、重なりを防ぐ。
 */
async function checkInitialLocationAndSetCameraPermission() {
    // 期間終了時はエリアチェックをスキップ（コードは保持）
    if (STAMP_RALLY_CONFIG.IS_ENDED) {
        canUseCamera = false;
        console.log("スタンプラリー期間終了のため、位置情報チェックをスキップします。");
        return;
    }

    // 1. 「確認中」メッセージを表示し、そのPromiseを保持する
    const checkingPromise = showMessage("現在地から利用可能エリアか確認しています...", "info", 3000);

    try {
        // 2. 「確認中」メッセージの表示と並行して位置情報を取得する
        const position = await getCurrentLocation();
        
        // 3. 最初のメッセージが表示完了するのを待つ
        await checkingPromise;

        // 4. 位置情報を評価し、結果を4秒間表示する
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        const allLocations = [...islands];
        let inArea = false;

        for (const location of allLocations) {
            const distance = getDistanceInKm(userLat, userLon, location.lat, location.lng);
            if (distance <= 50) {
                inArea = true;
                break;
            }
        }

        if (inArea) {
            canUseCamera = true;
            showMessage("スタンプラリーエリア内です。QRスキャンが利用できます！", "success", 4000);
        } else {
            canUseCamera = false;
            showMessage("スタンプラリーエリア外です。QRスキャンを利用するにはいずれかの島に近づいてください。", "warning", 4000);
        }
    } catch (error) {
        // エラー時も、最初のメッセージが表示完了するのを待ってからエラーメッセージを表示する
        await checkingPromise;
        
        canUseCamera = false;
        console.error("起動時の位置情報取得に失敗しました:", error);
        showMessage("位置情報の取得に失敗しました。QRスキャンは利用できません。", "error", 4000);
    }
}


// ================================================================
// ★★★ ここから追加: 当選者情報入力機能 ★★★
// ================================================================

/**
 * ユーザーが当選者かどうかを確認し、情報が未入力ならフォームを表示する
 */
async function checkIfWinnerAndRequestInfo() {
    if (!currentUser) return;

    // 賞のテーブル名と表示名のマッピング
    const prizeTables = {
        'winners_a': 'A賞',
        'winners_b': 'B賞',
        'winners_c': 'C賞',
        'winners_d': 'D賞'
    };

    for (const tableName in prizeTables) {
        try {
            const { data, error } = await supabaseClient
                .from(tableName)
                .select('full_name, postal_code, shipping_address')
                .eq('user_id', currentUser.id)
                .single();

            // データがあり、かつ氏名、郵便番号、住所のいずれかが未入力の場合
            if (data && (!data.full_name || !data.postal_code || !data.shipping_address)) {
                const prizeName = prizeTables[tableName];
                showWinnerForm(tableName, prizeName);
                // 一致するものが見つかったらループを抜ける
                break;
            }

            // "PGRST116" は該当データがないエラーなので無視する
            if (error && error.code !== 'PGRST116') {
                throw error;
            }

        } catch (error) {
            console.error(`Error checking winner status for ${tableName}:`, error);
        }
    }
}

/**
 * 当選者情報入力フォームのモーダルを表示し、送信処理をセットアップする
 * @param {string} tableName - 更新対象のSupabaseテーブル名
 * @param {string} prizeName - 表示用の賞の名前
 */
function showWinnerForm(tableName, prizeName) {
    const inputModal = document.getElementById('winnerInfoModal');
    const confirmModal = document.getElementById('winnerConfirmModal');
    const form = document.getElementById('winnerInfoForm');
    const title = document.getElementById('winnerModalTitle');
    const message = document.getElementById('winnerModalMessage');
    const submitBtn = document.getElementById('submitWinnerInfoBtn');

    title.textContent = `${prizeName}ご当選おめでとうございます！`;
    message.textContent = `賞品発送のため、お名前、郵便番号、ご住所の入力をお願いいたします。`;

    inputModal.classList.add('active');

    // 入力フォームの送信処理（確認画面へ遷移）
    form.onsubmit = async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('winnerName').value.trim();
        const postalCode = document.getElementById('winnerPostalCode').value.trim();
        const shippingAddress = document.getElementById('winnerAddress').value.trim();

        if (!fullName || !postalCode || !shippingAddress) {
            showMessage('氏名、郵便番号、住所のすべてを入力してください。', 'warning');
            return;
        }

        // 確認画面に値を表示
        document.getElementById('confirmName').textContent = fullName;
        document.getElementById('confirmPostalCode').textContent = postalCode;
        document.getElementById('confirmAddress').textContent = shippingAddress;

        // 入力画面を閉じて確認画面を表示
        inputModal.classList.remove('active');
        confirmModal.classList.add('active');
    };

    // 確認画面の「修正する」ボタン
    const backToEditBtn = document.getElementById('backToEditBtn');
    backToEditBtn.onclick = () => {
        confirmModal.classList.remove('active');
        inputModal.classList.add('active');
    };

    // 確認画面の「この内容で登録する」ボタン
    const finalSubmitBtn = document.getElementById('finalSubmitBtn');
    finalSubmitBtn.onclick = async () => {
        finalSubmitBtn.disabled = true;
        finalSubmitBtn.textContent = '登録中...';

        const fullName = document.getElementById('confirmName').textContent;
        const postalCode = document.getElementById('confirmPostalCode').textContent;
        const shippingAddress = document.getElementById('confirmAddress').textContent;

        try {
            await submitWinnerInfo(tableName, fullName, postalCode, shippingAddress);
            confirmModal.classList.remove('active');
            showMessage('ご登録ありがとうございました！賞品の発送までしばらくお待ちください。', 'success');

            // フォームをリセット
            form.reset();
        } catch (error) {
            showMessage(`登録に失敗しました: ${error.message}`, 'error');
        } finally {
            finalSubmitBtn.disabled = false;
            finalSubmitBtn.textContent = 'この内容で登録する';
        }
    };
}

/**
 * 入力された当選者情報をSupabaseに保存する
 * @param {string} tableName - 更新対象のテーブル名
 * @param {string} fullName - ユーザーが入力した氏名
 * @param {string} postalCode - ユーザーが入力した郵便番号
 * @param {string} shippingAddress - ユーザーが入力した住所
 */
async function submitWinnerInfo(tableName, fullName, postalCode, shippingAddress) {
    if (!currentUser) throw new Error('ユーザーがログインしていません。');

    const { error } = await supabaseClient
        .from(tableName)
        .update({
            full_name: fullName,
            postal_code: postalCode,
            shipping_address: shippingAddress,
            updated_at: new Date().toISOString() // 更新日時を記録
        })
        .eq('user_id', currentUser.id);

    if (error) {
        console.error('Failed to submit winner info:', error);
        throw error;
    }

    console.log(`Successfully updated winner info in ${tableName}`);
}
