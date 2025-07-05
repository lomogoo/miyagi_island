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
let html5QrcodeScanner;

//================================================================
// 1. アプリケーションのエントリーポイントと認証管理
//================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 開発者モードの処理
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
        // 開発者モードの場合、擬似的なユーザー情報を作成して強制的にログイン状態にする
        console.log("🛠️ 開発者モードで起動しました。");
        
        // Supabaseで作成した開発者用ユーザーのID
        const devUserId = '87177bcf-87a0-4ef4-b4c7-f54f3073fbe5'; 
        
        currentUser = {
            id: devUserId,
            email: 'developer@example.com' // 仮のメールアドレス
        };
        showAuthenticatedUI();
        loadAndInitializeApp();
    } else {
        // 通常の認証フロー
        // Supabaseの認証状態の変化を監視
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

    // ログアウトボタンのイベントリスナー
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (params.get('dev') === 'true') {
                window.location.href = window.location.pathname;
            } else {
                const { error } = await supabaseClient.auth.signOut();
                if (error) {
                    console.error('Logout failed:', error);
                    showMessage('ログアウトに失敗しました。', 'error');
                }
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
    if (currentUser && currentUser.email) {
        document.getElementById('userName').textContent = currentUser.email.split('@')[0];
    } else {
        document.getElementById('userName').textContent = 'ようこそ';
    }
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
        // プロフィール(ポイント)と獲得済みスタンプ情報を並行して取得
        const [profileRes, stampsRes] = await Promise.all([
            supabaseClient.from('profiles').select('total_points').eq('id', currentUser.id).single(),
            supabaseClient.from('collected_stamps').select('island_id').eq('user_id', currentUser.id)
        ]);

        if (profileRes.error) {
            if (profileRes.error.code === 'PGRST116') {
                 console.error(`ユーザーID (${currentUser.id}) が 'profiles' テーブルに見つかりません。Supabaseでユーザーを作成してください。`);
                 showMessage("ユーザーデータが見つかりません。", "error");
            }
            throw profileRes.error;
        }
        if (stampsRes.error) throw stampsRes.error;

        userProfile = profileRes.data;
        collectedStamps = new Set(stampsRes.data.map(s => s.island_id));
        
    } catch (error) {
        console.error("ユーザーデータの取得に失敗しました:", error);
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
    initializeDevTools();
}

//================================================================
// 4. 主要機能 (Supabase連携)
//================================================================

async function onScanSuccess(decodedText) {
    const qrStatus = document.getElementById('qrStatus');
    const matchedIsland = islands.find(island => island.name === decodedText.trim());

    if (matchedIsland) {
        if (collectedStamps.has(matchedIsland.id)) {
            qrStatus.textContent = `${matchedIsland.name}のスタンプは既に獲得済みです。`;
            qrStatus.className = 'qr-status warning';
            return;
        }

        try {
            // SupabaseのRPCを呼び出して、スタンプ追加とポイント加算をトランザクションとして実行
            const { error } = await supabaseClient.rpc('add_stamp_and_point', {
                p_island_id: matchedIsland.id
            });
            if (error) throw error;
            
            // 成功したらローカルの状態を更新
            collectedStamps.add(matchedIsland.id);
            userProfile.total_points += 1;

            qrStatus.textContent = `${matchedIsland.name}のスタンプを獲得しました！`;
            qrStatus.className = 'qr-status success';
            
            // UIを更新
            updatePointsDisplay();
            updateStampCards();
            updateMapMarkers();
            updatePrizes();
            
            setTimeout(() => {
                closeQRCamera();
                showSuccessModal(matchedIsland.name);
            }, 1500);

        } catch (error) {
            console.error("スタンプ追加処理に失敗しました:", error);
            qrStatus.textContent = `エラーが発生しました: ${error.message}`;
            qrStatus.className = 'qr-status error';
        }
    } else {
        qrStatus.textContent = '対象外のQRコードです。';
        qrStatus.className = 'qr-status error';
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
        const newPoints = userProfile.total_points - prize.points;
        
        // 応募履歴の保存とポイント更新を並行して実行
        const [entryRes, profileRes] = await Promise.all([
            supabaseClient.from('prize_entries').insert({ prize_name: prize.name, points_spent: prize.points, user_id: currentUser.id }),
            supabaseClient.from('profiles').update({ total_points: newPoints }).eq('id', currentUser.id)
        ]);
        
        if (entryRes.error) throw entryRes.error;
        if (profileRes.error) throw profileRes.error;
        
        // ローカルの状態を更新
        userProfile.total_points = newPoints;
        
        // UIを更新
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
    if (map) { map.remove(); } // 既存のマップを削除
    map = L.map('map').setView([38.3, 141.3], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    markers = []; // マーカー配列をリセット
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
            map.invalidateSize(); // マップ表示時にサイズを再計算
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

async function openQRCamera() {
    const qrModal = document.getElementById('qrModal');
    const qrStatus = document.getElementById('qrStatus');
    qrModal.classList.add('active');
    qrStatus.textContent = 'カメラを探しています...';
    qrStatus.className = 'qr-status';

    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        await html5QrcodeScanner.stop().catch(e => console.error("Scanner stop failed", e));
    }
    
    html5QrcodeScanner = new Html5Qrcode("qrReader");
    try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
            const cameraId = devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[devices.length - 1].id;
            html5QrcodeScanner.start(cameraId, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanError);
        } else {
            qrStatus.textContent = 'カメラが見つかりません。';
        }
    } catch (err) {
        qrStatus.textContent = 'カメラの起動に失敗しました。';
        console.error("Camera start failed:", err);
    }
}

function closeQRCamera() {
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().catch(err => console.error("Scanner stop failed.", err));
    }
    document.getElementById('qrModal').classList.remove('active');
}

function onScanError(error) {
    // console.log('QR scan error:', error); // デバッグ時以外は静かにする
}

// --- スタンプカード ---
function initializeStampCards() {
    const stampGrid = document.getElementById('stampGrid');
    stampGrid.innerHTML = ''; // 初期化
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
        if (collectedStamps.has(island.id)) {
            stampCard.classList.add('collected');
            statusElement.textContent = '獲得済み';
        } else {
            stampCard.classList.remove('collected');
            statusElement.textContent = '未獲得';
        }
    });
}

// --- 賞品応募 ---
function initializePrizes() {
    const prizesContainer = document.getElementById('prizesContainer');
    prizesContainer.innerHTML = ''; // 初期化
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
// 6. ユーティリティと開発者ツール
//================================================================

function showSuccessModal(islandName) {
    const successModal = document.getElementById('successModal');
    document.getElementById('successTitle').textContent = 'スタンプ獲得！';
    document.getElementById('successMessage').textContent = `${islandName}のスタンプを獲得しました！ポイントが1つ増えました。`;
    successModal.classList.add('active');
    document.getElementById('closeSuccessModal').onclick = () => successModal.classList.remove('active');
    setTimeout(() => successModal.classList.remove('active'), 3000);
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function initializeDevTools() {
    const devBtn = document.getElementById('devAddStampBtn');
    if (devBtn) {
        devBtn.addEventListener('click', async () => {
            if (!currentUser) {
                showMessage('ログインしていません。', 'warning');
                return;
            }
            const uncollected = islands.filter(island => !collectedStamps.has(island.id));
            if (uncollected.length === 0) {
                showMessage('全てのスタンプが収集済みです。', 'info');
                return;
            }
            const randomIsland = uncollected[Math.floor(Math.random() * uncollected.length)];
            await onScanSuccess(randomIsland.name);
            console.log(`【開発用】${randomIsland.name}のスタンプを追加しました。`);
        });
    }
}
