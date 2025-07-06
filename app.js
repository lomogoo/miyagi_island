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
let html5QrcodeScanner;
let isProcessingQR = false;

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

        // プロフィールが無くても(PGRST116エラー)、処理を止めない。それ以外のエラーは投げる。
        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }
        // プロフィールが見つからない場合は、ポイント0で初期化
        userProfile = profileData || { total_points: 0 };

        // 2. スタンプ取得履歴を取得
        const { data: stampsData, error: stampsError } = await supabaseClient
            .from('collected_stamps')
            .select('island_id')
            .eq('user_id', currentUser.id);

        if (stampsError) {
            throw stampsError;
        }

        // 取得したスタンプ履歴をセット
        collectedStamps = new Set(stampsData.map(s => s.island_id));

    } catch (error) {
        console.error("ユーザーデータの取得に失敗しました:", error);
        // エラーが発生した場合は、安全のため両方をリセット
        userProfile = { total_points: 0 };
        collectedStamps = new Set();
    }
}

function initializeApp() {
    initializeMap();
    initializeNavigation();
    initializeQRCamera();
    initializeStampCards();
    initializePrizes();
    updatePointsDisplay();
    initializeGeolocation();
}

//================================================================
// 4. 主要機能 (Supabase連携)
//================================================================

async function onScanSuccess(decodedText) {
    // 処理中の場合は重複実行を防ぐ
    if (isProcessingQR) {
        return;
    }
    // 処理中フラグを立てる
    isProcessingQR = true;

    const qrStatus = document.getElementById('qrStatus');
    const matchedIsland = islands.find(island => island.name === decodedText.trim());

    if (matchedIsland) {
        // 既にスタンプを持っているかチェック
        if (collectedStamps.has(matchedIsland.id)) {
            qrStatus.textContent = `${matchedIsland.name}のスタンプは既に獲得済みです。`;
            qrStatus.className = 'qr-status warning';
            // ユーザーがメッセージを読めるように少し待ってから再スキャンを許可
            setTimeout(() => { isProcessingQR = false; }, 2000);
            return;
        }

        try {
            // SupabaseのRPCを呼び出してスタンプを登録
            const params = new URLSearchParams(window.location.search);
            const isDevMode = params.get('dev') === 'true';
            const rpcParams = { p_island_id: matchedIsland.id };
            if (isDevMode && currentUser) {
                rpcParams.p_user_id = currentUser.id;
            }
            const { error } = await supabaseClient.rpc('add_stamp_and_point', rpcParams);

            if (error) {
                throw error;
            }

            // フロントエンドの状態を更新
            // この時点ではまだアニメーションは実行しない
            collectedStamps.add(matchedIsland.id);
            userProfile.total_points += 1;

            qrStatus.textContent = `${matchedIsland.name}のQRコードを読み取りました。`;
            qrStatus.className = 'qr-status success';

            // QRカメラを閉じる
            closeQRCamera();

            // 「スタンプ獲得！」ポップアップを表示し、ユーザーが閉じた後にアニメーションを実行
            showSuccessModal(matchedIsland.name, () => {
                // ポップアップが閉じられた後に実行されるコールバック
                updatePointsDisplay();
                updateStampCards(); // ここでスタンプカードが更新され、アニメーションが走る
                updateMapMarkers();
                updatePrizes();
                isProcessingQR = false; // 処理完了フラグをリセット
            });

        } catch (error) {
            console.error("スタンプ追加処理に失敗しました:", error);
            qrStatus.textContent = `エラーが発生しました: ${error.message}`;
            qrStatus.className = 'qr-status error';
            // エラー発生時も、少し待ってから再スキャンを許可
            setTimeout(() => { isProcessingQR = false; }, 2000);
        }
    } else {
        // 対象外のQRコードの場合
        qrStatus.textContent = '対象外のQRコードです。';
        qrStatus.className = 'qr-status error';
        // 少し待ってから再スキャンを許可
        setTimeout(() => { isProcessingQR = false; }, 2000);
    }
}

async function applyForPrize(prizeIndex) {
    const prize = prizes[prizeIndex];
    if (userProfile.total_points < prize.points) {
        showMessage("ポイントが足りません。", 'warning');
        return;
    }

    const confirmed = confirm(`${prize.name}に ${prize.points} ポイントを使って応募しますか？`);
    if (!confirmed) return;

    try {
        const params = new URLSearchParams(window.location.search);
        const isDevMode = params.get('dev') === 'true';

        // RPCに渡すパラメータを定義
        const rpcParams = {
            p_prize_name: prize.name,
            p_points_spent: prize.points
        };

        // 開発者モードの場合、明示的にユーザーIDを渡す
        if (isDevMode && currentUser) {
            rpcParams.p_user_id = currentUser.id;
        }

        // データベース関数を呼び出す
        const { data, error } = await supabaseClient.rpc('apply_for_prize', rpcParams);

        if (error) throw error;

        // 関数からの戻り値をチェック
        if (data !== '応募に成功しました。') {
            throw new Error(data); // 'ポイントが不足しています。'などのメッセージをエラーとして表示
        }

        // フロントエンドの状態を更新
        userProfile.total_points -= prize.points;

        updatePointsDisplay();
        updatePrizes();
        showMessage(`${prize.name}に応募しました！`, 'success');

    } catch (error) {
        console.error("応募処理に失敗しました:", error);
        showMessage(`応募処理中にエラーが発生しました: ${error.message}`, 'error');
    }
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

// --- 現在地表示機能を追加 ---
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
                // 既にマーカーがあれば位置を更新
                userLocationMarker.setLatLng(latLng);
            } else {
                // マーカーがなければ新規作成
                const userIcon = L.divIcon({
                    html: '<div class="user-location-marker"></div>',
                    className: 'custom-user-location-container',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                userLocationMarker = L.marker(latLng, { icon: userIcon }).addTo(map);
                map.setView(latLng, 13); // 最初の位置取得時にマップを中央に移動
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
    document.getElementById('closeQrModal').addEventListener('click', closeQRCamera);
    document.getElementById('qrModal').addEventListener('click', (e) => {
        if (e.target.id === 'qrModal') closeQRCamera();
    });
}

// 修正: QRカメラの起動ロジックを更新
async function openQRCamera() {
  isProcessingQR = false;
    const qrModal = document.getElementById('qrModal');
    const qrStatus = document.getElementById('qrStatus');
    qrModal.classList.add('active');
    qrStatus.textContent = 'カメラを起動しています...';
    qrStatus.className = 'qr-status info';

    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        await html5QrcodeScanner.stop().catch(e => console.error("スキャナーの停止に失敗しました", e));
    }

    html5QrcodeScanner = new Html5Qrcode("qrReader");
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };

    try {
        // 背面カメラ（environment）を優先して起動する
        await html5QrcodeScanner.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanError
        );
        qrStatus.textContent = 'QRコードを枠内に収めてください';
        qrStatus.className = 'qr-status info';
    } catch (err) {
        console.error("背面カメラでの起動に失敗しました:", err);
        qrStatus.textContent = 'カメラの起動に失敗しました。';
        qrStatus.className = 'qr-status error';
    }
}


function closeQRCamera() {
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().catch(err => console.error("Scanner stop failed.", err));
    }
    document.getElementById('qrModal').classList.remove('active');
}

function onScanError(error) { /* デバッグ時以外は静かにする */ }

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
function initializePrizes() {
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

function updatePrizes() {
    const prizeButtons = document.querySelectorAll('.prize-btn');
    const currentPoints = userProfile ? userProfile.total_points : 0;
    prizeButtons.forEach((btn, index) => {
        const prize = prizes[index];
        const canApply = currentPoints >= prize.points;
        btn.disabled = !canApply;
        btn.textContent = canApply ? '応募する' : `${prize.points}P必要`;
        if (canApply) {
            btn.onclick = () => applyForPrize(index);
        } else {
            btn.onclick = null;
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

// showSuccessModal 関数にコールバック引数を追加
function showSuccessModal(islandName, callback) {
    const successModal = document.getElementById('successModal');
    document.getElementById('successTitle').textContent = 'スタンプ獲得！';
    document.getElementById('successMessage').textContent = `${islandName}のスタンプを獲得しました！ポイントが1つ増えました。`;
    successModal.classList.add('active');

    // 閉じるボタンがクリックされた時の処理
    const closeButton = document.getElementById('closeSuccessModal');
    closeButton.onclick = () => {
        successModal.classList.remove('active');
        if (callback && typeof callback === 'function') {
            callback(); // コールバック関数を実行
        }
        // イベントリスナーを一度削除し、重複登録を防ぐ
        closeButton.onclick = null;
    };
    // 自動で閉じないように setTimeout を削除
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}
