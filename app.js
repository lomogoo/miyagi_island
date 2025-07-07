/**
 * 宮城県離島スタンプラリー アプリケーション
 * メインスクリプト
 */

//================================================================
// 定数データ
//================================================================

// 島の情報
const islands = [
  { id: "aji", name: "網地島", lat: 38.268300, lng: 141.477809, description: "美しい砂浜が広がる島。", image: "https://tohoku.env.go.jp/mct/modelcourse/images/course06_area07_img01.jpg" },
  { id: "tashiro", name: "田代島", lat: 38.294285, lng: 141.424276, description: "「猫の島」として有名。", image: "https://tohoku.env.go.jp/mct/modelcourse/images/course06_area06_img01.jpg" },
  { id: "katsura", name: "桂島", lat: 38.334771, lng: 141.095541, description: "歴史的な見どころも多い風光明媚な島。", image: "https://urato-island.jp/wp-content/uploads/2022/11/katsurashima02.jpg" },
  { id: "nonoshima", name: "野々島", lat: 38.338022, lng: 141.110935, description: "ツバキのトンネルが魅力。", image: "https://urato-island.jp/wp-content/uploads/2023/01/nonoshima12.jpg" },
  { id: "sabusawa", name: "寒風沢島", lat: 38.333481, lng: 141.124332, description: "江戸時代の歴史的な港跡が残る島。", image: "https://urato-island.jp/wp-content/uploads/2022/11/sabusawa09.jpg" },
  { id: "ho", name: "朴島", lat: 38.349648, lng: 141.124462, description: "静かな時間を過ごせる小さな島。", image: "https://urato-island.jp/wp-content/uploads/2022/10/about10.jpg" },
  { id: "izushima", name: "出島", lat: 38.450176, lng: 141.522555, description: "本土と橋で結ばれた漁業の盛んな島。", image: "https://www.pref.miyagi.jp/images/55686/100_r.jpg" },
  { id: "enoshima", name: "江島", lat: 38.398743, lng: 141.593839, description: "ウミネコの繁殖地として知られる。", image: "http://seapal-kisen.co.jp/wp-content/uploads/2025/05/1746735867906.jpg" }
];

// 賞品の情報
const prizes = [
  { name: "A賞", points: 3, description: "特別賞品" },
  { name: "B賞", points: 2, description: "優秀賞品" },
  { name: "C賞", points: 1, description: "参加賞品" },
  { name: "D賞", points: 1, description: "参加賞品" }
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
let isProcessingQR = false;
let sdk; // PocketSign SDKのインスタンスを保持する変数

//================================================================
// 1. アプリケーションのエントリーポイントと認証管理
//================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 開発者モードの処理
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
        console.log("🛠️ 開発者モードで起動しました。");
        const devUserId = '87177bcf-87a0-4ef4-b4c7-f54f3073fbe5';
        currentUser = {
            id: devUserId,
            email: 'developer@example.com'
        };
        showAuthenticatedUI();
        loadAndInitializeApp();
    } else {
        // 通常の認証フロー
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
    }
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
    initializeApp();
}

async function fetchUserData() {
    if (!currentUser) return;
    try {
        // 1. プロフィールを取得
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('total_points')
            .eq('id', currentUser.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }
        userProfile = profileData || { total_points: 0 };

        // 2. スタンプ取得履歴を取得
        const { data: stampsData, error: stampsError } = await supabaseClient
            .from('collected_stamps')
            .select('island_id')
            .eq('user_id', currentUser.id);

        if (stampsError) {
            throw stampsError;
        }

        collectedStamps = new Set(stampsData.map(s => s.island_id));

    } catch (error) {
        console.error("ユーザーデータの取得に失敗しました:", error);
        userProfile = { total_points: 0 };
        collectedStamps = new Set();
    }
}

async function initializeApp() {
    // ★★★ SDKの初期化処理 ★★★
    //     ドキュメントに従い、SDKが利用可能な状態になったらインスタンスを作成します。
    //     ここでは、SDKが`window.pocketsign.inAppSdk`にロードされていると仮定します。
    if (window.pocketsign && window.pocketsign.inAppSdk) {
        const { createSDKInstance, createAppBackend } = window.pocketsign.inAppSdk;
        try {
            sdk = await createSDKInstance({
                serviceId: '2fd2bc48-de60-4145-934f-9bbcabd42cf6', // あなたのサービスID
                backend: createAppBackend()
            });
            console.log("PocketSign SDK has been initialized successfully.");
        } catch(error) {
            console.error("Failed to initialize PocketSign SDK:", error);
            showMessage("ポケットサインSDKの初期化に失敗しました。", "error");
        }
    } else {
        console.warn("PocketSign SDK not found. QR Scanner will not work in PocketSign App.");
    }
    
    initializeMap();
    initializeNavigation();
    initializeQRCamera();
    initializeStampCards();
    initializePrizeSection(); // イベントリスナー登録
    renderPrizes();           // 初回表示の描画
    updatePointsDisplay();
    initializeGeolocation();
}

//================================================================
// 4. 主要機能 (Supabase連携)
//================================================================

async function onScanSuccess(decodedText) {
    if (isProcessingQR || !decodedText) {
        if(isProcessingQR) console.log("Processing another QR, ignoring.");
        isProcessingQR = false;
        return;
    }
    isProcessingQR = true;
    
    const matchedIsland = islands.find(island => island.name === decodedText.trim());

    if (matchedIsland) {
        if (collectedStamps.has(matchedIsland.id)) {
            showMessage(`${matchedIsland.name}のスタンプは既に獲得済みです。`, 'warning');
            isProcessingQR = false;
            return;
        }

        try {
            const { error } = await supabaseClient.rpc('add_stamp_and_point', { 
                p_island_id: matchedIsland.id 
            });

            if (error) {
                throw error;
            }

            collectedStamps.add(matchedIsland.id);
            userProfile.total_points += 1;

            showSuccessModal(matchedIsland.name, () => {
                updatePointsDisplay();
                updateStampCards();
                updateMapMarkers();
                updatePrizes();
                isProcessingQR = false;
            });

        } catch (error) {
            console.error("スタンプ追加処理に失敗しました:", error);
            showMessage(`エラーが発生しました: ${error.message}`, 'error');
            isProcessingQR = false;
        }
    } else {
        showMessage(`「${decodedText}」は対象外のQRコードです。`, 'error');
        isProcessingQR = false;
    }
}

// app.js
async function applyForPrize(prizeIndex) {
    const prize = prizes[prizeIndex];
    if (userProfile.total_points < prize.points) {
        showMessage("ポイントが足りません。", 'warning');
        return;
    }

    // ★★★ confirm() の代わりに新しい関数を呼び出す ★★★
    showConfirmModal(prize, async () => {
        // この中の処理は、ユーザーが「はい」を押した後に実行される
        try {
            const rpcParams = {
                p_prize_name: prize.name,
                p_points_spent: prize.points
            };
            const { data, error } = await supabaseClient.rpc('apply_for_prize', rpcParams);

            if (error) throw error;
            if (data !== '応募に成功しました。') throw new Error(data);

            userProfile.total_points -= prize.points;
            updatePointsDisplay();
            updatePrizes();
            showMessage(`${prize.name}に応募しました！`, 'success');

        } catch (error) {
            console.error("応募処理に失敗しました:", error);
            showMessage(`応募処理中にエラーが発生しました: ${error.message}`, 'error');
        }
    });
}

//================================================================
// 5. UIコンポーネントの初期化と更新
//================================================================

// --- マップ関連 ---
function initializeMap() {
    if (map) { map.remove(); }
    map = L.map('map').setView([38.3, 141.3], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    markers = [];
    islands.forEach(addIslandMarker);
}

function addIslandMarker(island) {
    const isCollected = collectedStamps.has(island.id);
    const iconHtml = `<div class="island-marker ${isCollected ? 'collected' : ''}">🏝️</div>`;
    const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
    const marker = L.marker([island.lat, island.lng], { icon: customIcon }).addTo(map);
    const popupContent = `
        <div class="island-popup">
            <img src="${island.image}" alt="${island.name}" onerror="this.style.display='none'">
            <h3>${island.name}</h3>
            <p>${island.description}</p>
            ${isCollected ? '<p style="color: var(--color-success); font-weight: bold;">✓ スタンプ獲得済み</p>' : ''}
        </div>`;
    marker.bindPopup(popupContent);
    markers.push({ marker, island });
}

function updateMapMarkers() {
    markers.forEach(({ marker, island }) => {
        const isCollected = collectedStamps.has(island.id);
        const iconHtml = `<div class="island-marker ${isCollected ? 'collected' : ''}">🏝️</div>`;
        const newIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-div-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
        marker.setIcon(newIcon);
        const popupContent = `
            <div class="island-popup">
                <img src="${island.image}" alt="${island.name}" onerror="this.style.display='none'">
                <h3>${island.name}</h3>
                <p>${island.description}</p>
                ${isCollected ? '<p style="color: var(--color-success); font-weight: bold;">✓ スタンプ獲得済み</p>' : ''}
            </div>`;
        marker.setPopupContent(popupContent);
    });
}

// --- 現在地表示機能 ---
function initializeGeolocation() {
    if (!navigator.geolocation) {
        console.log("お使いのブラウザは位置情報機能に対応していません。");
        return;
    }

    const locationOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const latLng = [latitude, longitude];

            if (userLocationMarker) {
                userLocationMarker.setLatLng(latLng);
            } else {
                const userIcon = L.divIcon({
                    html: '<div class="user-location-marker"></div>',
                    className: 'custom-user-location-container',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                userLocationMarker = L.marker(latLng, { icon: userIcon }).addTo(map);
                map.setView(latLng, 13);
            }
        },
        (error) => {
            console.error("位置情報の取得に失敗しました: ", error);
            if (error.code === 1) {
                showMessage("位置情報の利用が許可されていません。", "warning");
            }
        },
        locationOptions
    );
}

// --- ナビゲーション ---
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
        if (sectionId === 'mapSection' && map) {
            map.invalidateSize();
        }
    }
}

// --- QRカメラ ---
function initializeQRCamera() {
    document.getElementById('qrCameraBtn').addEventListener('click', openQRCamera);
}

async function openQRCamera() {
    if (!sdk) {
        showMessage("SDKが初期化されていません。標準ブラウザでテストします。", "warning");
        // 標準ブラウザ用のフォールバック（デバッグ用）
        const testData = prompt("【テスト用】QRコードの内容（島の名）を入力してください:");
        if (testData) onScanSuccess(testData);
        return;
    }

    try {
        const { readWithQrScanner } = window.pocketsign.inAppSdk;
        console.log("Calling PocketSign's readWithQrScanner function...");
        
        // 第2引数に空オブジェクトを渡して、デフォルトのフィルタ挙動を利用
        const result = await readWithQrScanner(sdk, {});

        // 返り値の構造はドキュメントで要確認
        // ここでは、result.data にスキャンした文字列そのものが入っていると仮定
        if (result && result.result === 'success' && result.data) {
            onScanSuccess(result.data);
        } else {
            console.log("QR scan was canceled or returned no data.", result);
            showMessage("QRスキャンがキャンセルされました。", "info");
        }
    } catch (error) {
        console.error("An error occurred during the QR scan process:", error);
        showMessage("QRスキャンの起動に失敗しました。", "error");
    }
}

// --- スタンプカード ---
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

// --- 賞品応募 ---
// 表示を更新するための関数
function renderPrizes() {
    const prizesContainer = document.getElementById('prizesContainer');
    prizesContainer.innerHTML = '';
    prizes.forEach((prize, index) => {
        const prizeCard = document.createElement('div');
        prizeCard.className = 'prize-card';
        prizeCard.innerHTML = `
            <div class="prize-info"><h3>${prize.name}</h3><p>${prize.description}</p></div>
            <div class="prize-points">${prize.points}P</div>
            <button class="prize-btn" data-prize-index="${index}">応募する</button>`;
        prizesContainer.appendChild(prizeCard);
    });
    updatePrizes();
}

// イベントリスナーを一度だけ登録するための関数
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
            btn.textContent = canApply ? '応募する' : `${prize.points}P必要`;
        }
    });
}

// --- ポイント表示 ---
function updatePointsDisplay() {
    const pointsValue = document.getElementById('pointsValue');
    pointsValue.textContent = userProfile ? userProfile.total_points : 0;
}

//================================================================
// 6. ユーティリティ
//================================================================

function showSuccessModal(islandName, callback) {
    const successModal = document.getElementById('successModal');
    document.getElementById('successTitle').textContent = 'スタンプ獲得！';
    document.getElementById('successMessage').textContent = `${islandName}のスタンプを獲得しました！ポイントが1つ増えました。`;
    successModal.classList.add('active');

    const closeButton = document.getElementById('closeSuccessModal');
    closeButton.onclick = () => {
        successModal.classList.remove('active');
        if (callback && typeof callback === 'function') {
            callback();
        }
        closeButton.onclick = null;
    };
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

// app.js のユーティリティセクションなどに追加
function showConfirmModal(prize, onConfirm) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmApplyBtn');
    const cancelBtn = document.getElementById('cancelApplyBtn');

    confirmTitle.textContent = `${prize.name}への応募`;
    confirmMessage.textContent = `${prize.points}ポイントを消費します。本当によろしいですか？`;

    confirmModal.classList.add('active');

    // 「はい」ボタンの処理
    confirmBtn.onclick = () => {
        confirmModal.classList.remove('active');
        onConfirm(); // Supabaseへの応募処理を実行
        // リスナーをクリア
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    // 「いいえ」ボタンの処理
    cancelBtn.onclick = () => {
        confirmModal.classList.remove('active');
        // リスナーをクリア
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };
}
