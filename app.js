/**
 * 宮城県離島スタンプラリー アプリケーション
 * メインスクリプト (最終解決策版)
 */

//================================================================
// グローバル変数
//================================================================
let currentUser = null;
let userProfile = null;
let collectedStamps = new Set();
let prizeHistory = [];
let map = null;
let canUseCamera = false;
let html5QrCode = null;
const islandMarkers = {};

//================================================================
// 定数データ
//================================================================
const islands = [
  { id: "aji", name: "網地島", lat: 38.274976, lng: 141.461628, description: "東北の”ハワイ”ビーチとして知られる網地白浜海水浴場は、美しいエメラルドグリーンが特徴で、東北有数の透明度を誇る。", location: "網地白浜海水浴場", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//aji.jpeg" },
  { id: "tashiro", name: "田代島", lat: 38.294834, lng: 141.426264, description: "”猫の島”として有名で、猫神社もある猫好きの聖地。人口より猫が多く、猫神社が「島の宝100景」に選定。", location: "猫神社", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//tashiro.jpg" },
  { id: "katsura", name: "桂島", lat: 38.334949, lng: 141.095117, description: "塩竈市本土から一番近い島。島内には遊歩道があり、風光明媚な景観を楽しむことができるほか、夏には海水浴場が開設される。", location: "桂島海水浴場", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//katsura.jpg" },
  { id: "nono", name: "野々島", lat: 38.341113, lng: 141.101831, description: "”花の島”として知られ、椿やツツジ、アジサイなどが咲き誇る。島内にはウォーキングコースが整備されている。", location: "野々島ビジターセンター", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//nono.jpg" },
  { id: "miyato", name: "宮戸島", lat: 38.349692, lng: 141.157855, description: "日本三景松島の一角をなす最大の島。奥松島の絶景が広がり、縄文時代の「里浜貝塚」は国の史跡に指定されている。", location: "里浜貝塚", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//miyato.jpg" },
  { id: "kinkasan", name: "金華山", lat: 38.299104, lng: 141.566378, description: "島全体が黄金山神社の神域で、神の使いとされる鹿が多数生息。三年続けてお参りすればお金に不自由しないと言われる。", location: "黄金山神社", image: "https://impkzpdypusdminmyyea.supabase.co/storage/v1/object/public/isla//kinkasan.jpg" }
];
const testLocationForMap = { id: "test", name: "テスト用ロケーション", lat: 38.26883, lng: 140.87188, description: "開発テスト用の地点です。", image: "" };


//================================================================
// 認証フロー
//================================================================

/**
 * アプリ起動時の認証処理のメイン関数
 */
async function initializeAuth() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    // ステップ1: まず、Supabaseの現在のセッションを確認 (ページ内遷移などのため)
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        console.log("アクティブなセッションが見つかりました。アプリを初期化します。");
        currentUser = session.user;
        await initializeApp();
        return;
    }

    // ステップ2: セッションがない場合、保存されたユーザーIDを探す
    const storedUserId = localStorage.getItem('p8n_user_id');
    if (storedUserId) {
        console.log(`保存されたユーザーIDが見つかりました: ${storedUserId}。セッションの再確立を試みます。`);
        try {
            // ステップ3: 保存されたIDで、同意画面なしのセッション再確立を試みる
            const { data, error } = await supabaseClient.functions.invoke('refresh-pocketsign-token', {
                body: { userId: storedUserId },
            });

            // ★★★ ここからが修正点 ★★★
            if (error) {
                // Edge Functionから返されたエラーの詳細を確認
                // SupabaseのFunctionエラーは 'context' に元のレスポンス情報を持つ
                if (error.context && typeof error.context.json === 'function') {
                    try {
                        const errBody = await error.context.json();
                        // リフレッシュトークンが無効などの理由で、再認証が必要な場合
                        if (errBody.requiresReauth) {
                            console.warn("リフレッシュトークンが無効です。再認証が必要です。");
                            localStorage.removeItem('p8n_user_id'); // 古いIDを削除
                            window.location.href = './auth.html'; // フル認証フローを開始
                            return; // これ以降の処理を中断
                        }
                    } catch (parseError) {
                        // エラーレスポンスがJSON形式でなかった場合
                        console.error("FunctionからのエラーJSONの解析に失敗しました。", parseError);
                    }
                }
                // 上記以外の予期せぬエラーはここで投げる
                throw error;
            }
            // ★★★ ここまでが修正点 ★★★
            
            const { accessToken } = data;
            if (!accessToken) throw new Error('再確立したアクセストークンの取得に失敗しました。');
            
            await supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: accessToken,
            });
            
            console.log("セッションの再確立に成功しました。アプリを初期化します。");
            const { data: { user } } = await supabaseClient.auth.getUser();
            currentUser = user;
            await initializeApp();

        } catch (e) {
            // リフレッシュに失敗したら、最終手段としてフル認証フローへ
            console.error("セッションの再確立に失敗しました。通常のログインフローに移行します。", e);
            localStorage.removeItem('p8n_user_id'); // 古いIDを削除
            window.location.href = './auth.html';
        }
    } else {
        // ステップ4: 保存されたユーザーIDもない場合 (完全な初回起動)
        console.log("保存されたユーザーIDがありません。通常のログインフローを開始します。");
        window.location.href = './auth.html';
    }
}


//================================================================
// アプリケーション初期化・UI制御
//================================================================

/**
 * 認証成功後にアプリのメイン機能を初期化する
 */
async function initializeApp() {
    showAuthenticatedUI();
    await loadAndInitializeApp();
    document.getElementById('loadingOverlay').style.display = 'none';
}

/**
 * 認証済みユーザー向けのUIを表示する
 */
function showAuthenticatedUI() {
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
}

/**
 * 未認証ユーザー向けのUIを表示する
 */
function showLoginUI() {
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginPrompt').style.display = 'block';
}

/**
 * ユーザーデータやスタンプ情報をDBから取得し、画面を更新する
 */
async function loadAndInitializeApp() {
    await fetchUserData();
    updatePointsDisplay();
    initializeMap();
    updateStampCards();
    updatePrizeHistory();
    setupEventListeners();
    checkInitialLocationAndSetCameraPermission();
}


//================================================================
// データ取得・更新
//================================================================

async function fetchUserData() {
    if (!currentUser) return;
    try {
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('total_points, birth_year, gender, address')
            .eq('id', currentUser.id)
            .single();
        if (profileError) throw profileError;
        userProfile = profileData;

        const { data: stampsData, error: stampsError } = await supabaseClient
            .from('collected_stamps')
            .select('island_id')
            .eq('user_id', currentUser.id);
        if (stampsError) throw stampsError;
        collectedStamps = new Set(stampsData.map(s => s.island_id));

        const { data: prizeData, error: prizeError } = await supabaseClient
            .from('prize_entries')
            .select('prize_id, entered_at, prize_name')
            .eq('user_id', currentUser.id)
            .order('entered_at', { ascending: false });
        if (prizeError) throw prizeError;
        prizeHistory = prizeData;

    } catch (error) {
        console.error('ユーザーデータの取得に失敗しました:', error);
    }
}

// ... (ここから下のUI更新、イベントリスナー、QRスキャン、地図、計算などの関数は、
//      既存のapp.jsから変更ありませんので、そのまま流用します。)

function updatePointsDisplay() {
    const pointsValue = document.getElementById('pointsValue');
    if (pointsValue && userProfile) {
        pointsValue.textContent = userProfile.total_points || 0;
    }
}

function updateStampCards() {
    const stampGrid = document.getElementById('stampGrid');
    if (!stampGrid) return;
    stampGrid.innerHTML = '';
    islands.forEach(island => {
        const isCollected = collectedStamps.has(island.id);
        const card = document.createElement('div');
        card.className = `stamp-card ${isCollected ? 'collected' : ''}`;
        card.innerHTML = `
            <div class="stamp-card-inner">
                <div class="stamp-card-front">
                    <img src="${island.image}" alt="${island.name}" class="stamp-image">
                    <h3 class="stamp-name">${island.name}</h3>
                </div>
                <div class="stamp-card-back">
                    <div class="stamp-icon">済</div>
                    <p>${island.name}のスタンプ</p>
                </div>
            </div>
        `;
        stampGrid.appendChild(card);
    });
}

function updatePrizeHistory() {
    const historyList = document.getElementById('prizeHistoryList');
    if (!historyList) return;
    historyList.innerHTML = '';
    if (prizeHistory.length === 0) {
        historyList.innerHTML = '<p>まだ応募履歴はありません。</p>';
        return;
    }
    prizeHistory.forEach(entry => {
        const item = document.createElement('li');
        item.className = 'history-item';
        const entryDate = new Date(entry.entered_at).toLocaleDateString('ja-JP');
        item.innerHTML = `
            <div class="info">
                <span class="prize-name">${entry.prize_name}</span>
                <span class="entry-time">${entryDate}</span>
            </div>
            <span class="points">5 ポイント</span>
        `;
        historyList.appendChild(item);
    });
}

function initializeMap() {
    if (map) return;
    map = L.map('map').setView([38.3, 141.2], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    islands.forEach(island => {
        const iconHtml = `<div class="map-icon ${collectedStamps.has(island.id) ? 'collected' : ''}"></div>`;
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-map-icon-container',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([island.lat, island.lng], { icon: customIcon }).addTo(map);
        marker.on('click', () => showIslandModal(island));
        islandMarkers[island.id] = marker;
    });
}

function setupEventListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    document.getElementById('startQRScanBtn').addEventListener('click', startQRScanner);
    document.getElementById('closeScannerBtn').addEventListener('click', stopQRScanner);
    document.getElementById('closeIslandModal').addEventListener('click', () => document.getElementById('islandModal').style.display = 'none');
    document.getElementById('closeSuccessModal').addEventListener('click', () => document.getElementById('successModal').style.display = 'none');
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    
    document.querySelectorAll('.apply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prizeName = e.target.getAttribute('data-prize-name');
            const prizeId = e.target.getAttribute('data-prize-id');
            showConfirmModal(prizeName, prizeId);
        });
    });
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('ログアウトエラー', error);
    }
}

function showIslandModal(island) {
    document.getElementById('modalIslandName').textContent = island.name;
    document.getElementById('modalIslandDescription').textContent = island.description;
    document.getElementById('modalIslandLocation').textContent = `場所: ${island.location}`;
    document.getElementById('modalIslandImage').src = island.image;
    document.getElementById('islandModal').style.display = 'flex';
}

function startQRScanner() {
    if (!canUseCamera) {
        showMessage("スタンプラリーエリア外のため、カメラを起動できません。", "error");
        return;
    }
    const scannerContainer = document.getElementById('qrScannerContainer');
    scannerContainer.style.display = 'block';
    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure);
}

function stopQRScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('qrScannerContainer').style.display = 'none';
        }).catch(err => console.error("QRスキャナーの停止に失敗", err));
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    stopQRScanner();
    const island = islands.find(i => i.id === decodedText);
    if (island) {
        if (collectedStamps.has(island.id)) {
            showMessage(`${island.name}のスタンプは既に獲得済みです。`, "info");
        } else {
            await grantStampAndPoints(island);
        }
    } else {
        showMessage("無効なQRコードです。", "error");
    }
}

function onScanFailure(error) { /* 意図的に空 */ }

async function grantStampAndPoints(island) {
    try {
        const { error } = await supabaseClient.rpc('grant_stamp_and_points', {
            p_user_id: currentUser.id,
            p_island_id: island.id,
            p_points_to_add: 10
        });
        if (error) throw error;

        collectedStamps.add(island.id);
        userProfile.total_points += 10;
        updatePointsDisplay();
        updateStampCards();
        updateMarkerIcon(island.id);
        showSuccessModal(`${island.name}のスタンプを獲得！`, "10ポイントゲット！");
    } catch (error) {
        console.error("スタンプ付与エラー:", error);
        showMessage("スタンプの付与に失敗しました。", "error");
    }
}

function showConfirmModal(prizeName, prizeId) {
    document.getElementById('confirmTitle').textContent = `${prizeName}に応募`;
    document.getElementById('confirmMessage').textContent = `本当に${prizeName}に応募しますか？ (5ポイント消費)`;
    const confirmBtn = document.getElementById('confirmApplyBtn');
    const cancelBtn = document.getElementById('cancelApplyBtn');
    
    const confirmHandler = () => {
        applyForPrize(prizeName, prizeId);
        closeConfirmModal();
    };

    const closeConfirmModal = () => {
        document.getElementById('confirmModal').style.display = 'none';
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', closeConfirmModal);
    };

    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', closeConfirmModal);
    document.getElementById('confirmModal').style.display = 'flex';
}

async function applyForPrize(prizeName, prizeId) {
    if (userProfile.total_points < 5) {
        showMessage("ポイントが足りません。", "error");
        return;
    }
    try {
        const { error } = await supabaseClient.rpc('apply_for_prize', {
            p_user_id: currentUser.id,
            p_prize_id: prizeId,
            p_prize_name: prizeName,
            p_points_to_deduct: 5
        });
        if (error) throw error;
        userProfile.total_points -= 5;
        await fetchUserData(); // 応募履歴を再取得
        updatePointsDisplay();
        updatePrizeHistory();
        showSuccessModal("応募完了！", `${prizeName}に応募しました。`);
    } catch (error) {
        console.error("応募エラー:", error);
        showMessage("応募に失敗しました。", "error");
    }
}

function showSuccessModal(title, message) {
    document.getElementById('successTitle').textContent = title;
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successModal').style.display = 'flex';
}

function showMessage(message, type = "info") {
    const container = document.getElementById('messageContainer');
    container.textContent = message;
    container.className = `message-container ${type} show`;
    setTimeout(() => container.classList.remove('show'), 3000);
}

function updateMarkerIcon(islandId) {
    const marker = islandMarkers[islandId];
    if (marker) {
        const iconHtml = `<div class="map-icon collected"></div>`;
        const newIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-map-icon-container',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        marker.setIcon(newIcon);
    }
}

async function checkInitialLocationAndSetCameraPermission() {
    showMessage("現在地から利用可能エリアか確認しています...", "info");
    try {
        const position = await getCurrentLocation();
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        const allLocations = [...islands, testLocationForMap];
        for (const location of allLocations) {
            const distance = getDistanceInKm(userLat, userLon, location.lat, location.lng);
            if (distance <= 8) {
                canUseCamera = true;
                showMessage("スタンプラリーエリア内です。QRコードをスキャンできます。", "success");
                return;
            }
        }
        showMessage("スタンプラリーエリア外です。島に近づいてください。", "info");
    } catch (error) {
        console.error("位置情報取得エラー:", error);
        showMessage("位置情報の取得に失敗しました。ブラウザの設定を確認してください。", "error");
    }
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser."));
        }
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


//================================================================
// イベントリスナー
//================================================================

// ログアウト処理などのために認証状態の変更を監視
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        currentUser = null;
        localStorage.removeItem('p8n_user_id'); // ログアウト時にIDも削除
        showLoginUI();
    }
});

// アプリ起動
document.addEventListener('DOMContentLoaded', initializeAuth);
