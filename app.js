/**
 * 宮城県離島スタンプラリー アプリケーション
 * メインスクリプト (最終修正版)
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
let html5Qrcode; // html5-qrcodeのインスタンスを保持
let isProcessingQR = false;
let isAppInitialized = false; // ★★★ 初期化済みフラグ

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
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('total_points')
            .eq('id', currentUser.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        userProfile = profileData || { total_points: 0 };

        const { data: stampsData, error: stampsError } = await supabaseClient
            .from('collected_stamps')
            .select('island_id')
            .eq('user_id', currentUser.id);

        if (stampsError) throw stampsError;
        collectedStamps = new Set(stampsData.map(s => s.island_id));

    } catch (error) {
        console.error("ユーザーデータの取得に失敗しました:", error);
        userProfile = { total_points: 0 };
        collectedStamps = new Set();
    }
}

function initializeApp() {
    // ★★★ 初期化処理が複数回実行されるのを防ぐ
    if (isAppInitialized) return;

    initializeMap();
    initializeNavigation();
    initializeQRCamera();
    initializeStampCards();
    initializePrizeSection(); // イベントリスナー登録
    renderPrizes();           // 初回表示の描画
    updatePointsDisplay();
    initializeGeolocation();
    
    isAppInitialized = true;
}

//================================================================
// 4. 主要機能 (Supabase連携)
//================================================================

async function onScanSuccess(decodedText) {
    // isProcessingQRのチェックは openQRCamera 側で行うため、ここでは主にnullチェック
    if (!decodedText) {
        isProcessingQR = false; // 次のスキャンに備える
        return;
    }
    
    const matchedIsland = islands.find(island => island.name === decodedText.trim());

    if (matchedIsland) {
        if (collectedStamps.has(matchedIsland.id)) {
            showMessage(`${matchedIsland.name}のスタンプは既に獲得済みです。`, 'warning');
            isProcessingQR = false;
            return;
        }
        try {
            // ★★★ データベース関数呼び出しをシンプルな形式に統一
            const { error } = await supabaseClient.rpc('add_stamp_and_point', { 
                p_island_id: matchedIsland.id 
            });
            if (error) throw error;

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

async function applyForPrize(prizeIndex) {
    const prize = prizes[prizeIndex];
    if (userProfile.total_points < prize.points) {
        showMessage("ポイントが足りません。", 'warning');
        return;
    }

    // ★★★ カスタム確認モーダルを呼び出す
    showConfirmModal(prize, async () => {
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
    const customIcon = L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
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
        const newIcon = L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20] });
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
        if (sectionId === 'mapSection' && map) map.invalidateSize();
    }
}

// --- QRカメラ (堅牢版) ---
function initializeQRCamera() {
    document.getElementById('qrCameraBtn').addEventListener('click', openQRCamera);
    document.getElementById('closeQrModal').addEventListener('click', closeQRCamera);
    document.getElementById('qrModal').addEventListener('click', (e) => {
        if (e.target.id === 'qrModal') closeQRCamera();
    });
    html5Qrcode = new Html5Qrcode("qrReader");
}

// app.js

async function openQRCamera() {
    // ★★★ ここからが追加・変更部分 ★★★
    showMessage("現在地を確認しています...", "info");

    try {
        // 1. ユーザーの現在地を取得
        const position = await getCurrentLocation();
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        // 2. いずれかの島から5km以内かチェック
        let isNearIsland = false;
        for (const island of islands) {
            const distance = getDistanceInKm(userLat, userLon, island.lat, island.lng);
            console.log(`- ${island.name}までの距離: ${distance.toFixed(2)} km`); // デバッグ用ログ
            if (distance <= 5) { // 半径5km以内か？
                isNearIsland = true;
                break; // 近くの島を見つけたらループを抜ける
            }
        }

        // 3. 5km以内にいなければ、エラーメッセージを表示して処理を中断
        if (!isNearIsland) {
            showMessage("いずれかの島の5km以内にいません。QRコードをスキャンするには島に近づいてください。", "warning");
            return;
        }

        // 4. 5km以内にいる場合のみ、カメラ起動処理に進む
        isProcessingQR = false;
        const qrModal = document.getElementById('qrModal');
        const qrStatus = document.getElementById('qrStatus');
        qrModal.classList.add('active');
        qrStatus.textContent = 'カメラの許可をリクエストしています...';
        qrStatus.className = 'qr-status info';
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        await html5Qrcode.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                if (isProcessingQR) return;
                isProcessingQR = true;
                html5Qrcode.stop()
                    .then(() => { onScanSuccess(decodedText); })
                    .catch((err) => {
                        console.error("QRスキャナの停止に失敗しました。", err);
                        onScanSuccess(decodedText);
                    });
            }
        );
        qrStatus.textContent = 'QRコードを枠内に収めてください';
        qrStatus.className = 'qr-status info';

    } catch (error) {
        // 位置情報取得のエラーハンドリング
        console.error("位置情報の取得またはカメラの起動に失敗しました:", error);
        let message = "位置情報の取得に失敗しました。";
        if (error.code === 1) { // ユーザーが許可を拒否
            message = "位置情報の利用が許可されていません。ブラウザの設定を確認してください。";
        }
        showMessage(message, "error");
    }
    // ★★★ ここまでが追加・変更部分 ★★★
}

function closeQRCamera() {
    if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(err => console.error("QRスキャナの停止に失敗しました。", err));
    }
    document.getElementById('qrModal').classList.remove('active');
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
        if (callback && typeof callback === 'function') callback();
        closeButton.onclick = null;
    };
}

// ★★★ カスタム確認モーダルの制御関数 ★★★
function showConfirmModal(prize, onConfirm) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmApplyBtn');
    const cancelBtn = document.getElementById('cancelApplyBtn');
    confirmTitle.textContent = `${prize.name}への応募`;
    confirmMessage.textContent = `${prize.points}ポイントを消費します。本当によろしいですか？`;
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

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

// app.js のユーティリティセクション（6. ユーティリティ）などに追加

/**
 * 現在地を一度だけ取得するためのPromiseベースの関数
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error('お使いのブラウザは位置情報機能に対応していません。'));
        }
        // 高精度な位置情報を要求
        const options = {
            enableHighAccuracy: true,
            timeout: 30000, // 10秒でタイムアウト
            maximumAge: 0 // 常に最新の位置情報を取得
        };
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
}

/**
 * 2点間の緯度経度から距離をkm単位で計算する（ハーパーサイン公式）
 */
function getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球の半径 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // 距離 (km)
}
