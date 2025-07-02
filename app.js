// グローバル変数
let currentPoints = 0;
let collectedStamps = [];
let userLocation = null;

// 島の情報
const islands = {
    aji: { name: '網地島', lat: 38.3833, lng: 141.4667 },
    tashiro: { name: '田代島', lat: 38.3167, lng: 141.4167 },
    katsura: { name: '桂島', lat: 38.2833, lng: 141.1000 },
    nonoshima: { name: '野々島', lat: 38.2667, lng: 141.0833 },
    sabusawa: { name: '寒風沢島', lat: 38.2500, lng: 141.0667 },
    ho: { name: '朴島', lat: 38.2333, lng: 141.0500 },
    izushima: { name: '出島', lat: 38.2167, lng: 140.9667 },
    enoshima: { name: '江島', lat: 38.2000, lng: 140.9500 }
};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    // Supabaseクライアントの初期化
    // const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
    
    // Google Maps APIの初期化
    // initMap();
    
    // 位置情報の取得
    getCurrentLocation();
    
    // ローカルストレージからデータを読み込む（Supabase実装前の暫定処理）
    loadUserData();
    
    // ポイント表示の更新
    updatePointsDisplay();
});

// 位置情報の取得
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('現在位置:', userLocation);
                // Google Maps APIで現在位置を表示
                // updateUserLocationOnMap(userLocation);
            },
            (error) => {
                console.error('位置情報の取得に失敗しました:', error);
            }
        );
    }
}

// Google Maps初期化（API組み込み時に実装）
function initMap() {
    // const map = new google.maps.Map(document.getElementById('map'), {
    //     center: { lat: 38.3, lng: 141.0 },
    //     zoom: 10
    // });
    
    // 各島にマーカーを配置
    // Object.keys(islands).forEach(islandKey => {
    //     const island = islands[islandKey];
    //     const marker = new google.maps.Marker({
    //         position: { lat: island.lat, lng: island.lng },
    //         map: map,
    //         title: island.name
    //     });
    // });
}

// QRコードモーダルを開く
function openQRModal() {
    document.getElementById('qrModal').style.display = 'flex';
    // QRコードリーダーの初期化
    // const html5QrCode = new Html5Qrcode("qr-reader");
    // html5QrCode.start(
    //     { facingMode: "environment" },
    //     { fps: 10, qrbox: 250 },
    //     onScanSuccess,
    //     onScanFailure
    // );
    
    // 暫定的にテスト用のQRコード読み取りをシミュレート
    setTimeout(() => {
        simulateQRScan();
    }, 2000);
}

// QRコードモーダルを閉じる
function closeQRModal() {
    document.getElementById('qrModal').style.display = 'none';
    // QRコードリーダーを停止
    // html5QrCode.stop();
}

// QRコード読み取り成功時の処理
function onScanSuccess(decodedText, decodedResult) {
    console.log('QRコード読み取り成功:', decodedText);
    processQRCode(decodedText);
    closeQRModal();
}

// QRコード読み取り失敗時の処理
function onScanFailure(error) {
    // エラーは無視（連続的にスキャンするため）
}

// テスト用：QRスキャンをシミュレート
function simulateQRScan() {
    const testIslands = Object.keys(islands);
    const randomIsland = testIslands[Math.floor(Math.random() * testIslands.length)];
    processQRCode(randomIsland);
    closeQRModal();
}

// QRコードの処理
function processQRCode(islandKey) {
    if (!islands[islandKey]) {
        alert('無効なQRコードです');
        return;
    }
    
    if (collectedStamps.includes(islandKey)) {
        alert('この島のスタンプは既に取得済みです');
        return;
    }
    
    // スタンプを追加
    addStamp(islandKey);
}

// スタンプを追加
function addStamp(islandKey) {
    collectedStamps.push(islandKey);
    currentPoints++;
    
    // アニメーション付きでスタンプを表示
    const stampElement = document.getElementById(`stamp-${islandKey}`);
    stampElement.classList.add('collected', 'animating');
    
    // データを保存
    saveUserData();
    updatePointsDisplay();
    
    // Supabaseにデータを保存
    // saveToSupabase(islandKey);
    
    alert(`${islands[islandKey].name}のスタンプを獲得しました！`);
}

// ポイント表示の更新
function updatePointsDisplay() {
    document.getElementById('current-points').textContent = currentPoints;
    
    // 応募ボタンの有効/無効を更新
    document.querySelectorAll('.apply-button').forEach(button => {
        const requiredPoints = parseInt(button.parentElement.querySelector('.prize-points').textContent.match(/\d+/)[0]);
        button.disabled = currentPoints < requiredPoints;
    });
}

// 賞品に応募
function applyForPrize(prize, requiredPoints) {
    if (currentPoints < requiredPoints) {
        alert('ポイントが不足しています');
        return;
    }
    
    if (confirm(`${prize}賞に応募しますか？（${requiredPoints}ポイント消費）`)) {
        currentPoints -= requiredPoints;
        updatePointsDisplay();
        saveUserData();
        
        // Supabaseに応募情報を保存
        // saveApplicationToSupabase(prize, requiredPoints);
        
        alert(`${prize}賞への応募が完了しました！`);
    }
}

// ユーザーデータの保存（ローカルストレージ - 暫定）
function saveUserData() {
    const userData = {
        collectedStamps: collectedStamps,
        currentPoints: currentPoints
    };
    localStorage.setItem('stampRallyData', JSON.stringify(userData));
}

// ユーザーデータの読み込み（ローカルストレージ - 暫定）
function loadUserData() {
    const savedData = localStorage.getItem('stampRallyData');
    if (savedData) {
        const userData = JSON.parse(savedData);
        collectedStamps = userData.collectedStamps || [];
        currentPoints = userData.currentPoints || 0;
        
        // 既存のスタンプを表示
        collectedStamps.forEach(islandKey => {
            const stampElement = document.getElementById(`stamp-${islandKey}`);
            stampElement.classList.add('collected');
        });
    }
}

// Supabaseへの保存（API実装時に使用）
async function saveToSupabase(islandKey) {
    // const { data, error } = await supabase
    //     .from('stamps')
    //     .insert([
    //         {
    //             user_id: currentUserId,
    //             island: islandKey,
    //             collected_at: new Date()
    //         }
    //     ]);
}

// Supabaseへの応募情報保存（API実装時に使用）
async function saveApplicationToSupabase(prize, points) {
    // const { data, error } = await supabase
    //     .from('applications')
    //     .insert([
    //         {
    //             user_id: currentUserId,
    //             prize: prize,
    //             points_used: points,
    //             applied_at: new Date()
    //         }
    //     ]);
}

// 島スポットクリック時の処理
document.querySelectorAll('.island-spot').forEach(spot => {
    spot.addEventListener('click', function() {
        const islandKey = this.dataset.island;
        const island = islands[islandKey];
        const hasStamp = collectedStamps.includes(islandKey);
        alert(`${island.name}\n緯度: ${island.lat}\n経度: ${island.lng}\nスタンプ: ${hasStamp ? '取得済み' : '未取得'}`);
    });
});

// ▼▼ タブ切替ロジック ▼▼
document.addEventListener('DOMContentLoaded', () => {
  // 初期画面＝「実際の位置を確認」
  switchSection('map-section');

  document.querySelectorAll('.bottom-nav button').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const target = btn.dataset.target;
      switchSection(target);
      // active 表示を切替
      document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

function switchSection(sectionId){
  // すべて非表示 → 対象だけ表示
  document.querySelectorAll('.app-section').forEach(sec=>sec.style.display='none');
  document.getElementById(sectionId).style.display='block';
}