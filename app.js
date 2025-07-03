// グローバル変数
let currentPoints = 0;
let collectedStamps = [];
let userLocation = null;
let html5QrCode;
let map; // Leafletのmapオブジェクトを保持

// 島の情報（画像URLを追加）
const islands = {
    aji: { name: '網地島', lat: 38.3833, lng: 141.4667, description: '美しい砂浜が広がる島。', image: 'https://i.imgur.com/39s93Sn.jpeg' },
    tashiro: { name: '田代島', lat: 38.3167, lng: 141.4167, description: '「猫の島」として有名。', image: 'https://i.imgur.com/xJ4l6c2.jpeg' },
    katsura: { name: '桂島', lat: 38.2833, lng: 141.1000, description: '歴史的な見どころも多い風光明媚な島。', image: 'https://i.imgur.com/39s93Sn.jpeg' },
    nonoshima: { name: '野々島', lat: 38.2667, lng: 141.0833, description: 'ツバキのトンネルが魅力。', image: 'https://i.imgur.com/xJ4l6c2.jpeg' },
    sabusawa: { name: '寒風沢島', lat: 38.2500, lng: 141.0667, description: '江戸時代の歴史的な港跡が残る島。', image: 'https://i.imgur.com/39s93Sn.jpeg' },
    ho: { name: '朴島', lat: 38.2333, lng: 141.0500, description: '静かな時間を過ごせる小さな島。', image: 'https://i.imgur.com/xJ4l6c2.jpeg' },
    izushima: { name: '出島', lat: 38.2167, lng: 140.9667, description: '本土と橋で結ばれた漁業の盛んな島。', image: 'https://i.imgur.com/39s93Sn.jpeg' },
    enoshima: { name: '江島', lat: 38.2000, lng: 140.9500, description: 'ウミネコの繁殖地として知られる。', image: 'https://i.imgur.com/xJ4l6c2.jpeg' }
};

// アプリの初期化
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    updatePointsDisplay();
    setupUI();
    // 初期表示はマップセクション
    switchSection('map-section');
    // マップの初期化は最初にマップセクションが表示されたときに行う
    setTimeout(() => {
        initializeMap();
    }, 100);
});

// マップの初期化と表示
function initializeMap() {
    // すでに初期化されている場合はスキップ
    if (map) {
        return;
    }
    
    // マップを作成し、'map'というIDの要素に表示
    map = L.map('map').setView([38.3, 141.15], 10); // 中心座標とズームレベル

    // OpenStreetMapのタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // ユーザーの現在地を表示
    displayUserLocation();

    // 各島にマーカーを設置
    for (const islandKey in islands) {
        createIslandMarker(islandKey, islands[islandKey]);
    }
    
    // マップのサイズを再計算（重要）
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

// ユーザーの現在地を表示
function displayUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = [position.coords.latitude, position.coords.longitude];
                userLocation = pos;
                
                // 青い丸で現在地を表示
                L.circle(pos, {
                    color: '#4285F4',
                    fillColor: '#4285F4',
                    fillOpacity: 0.5,
                    radius: 500
                }).addTo(map).bindPopup("あなたの現在地");
                
                map.setView(pos, 11); // 現在地を中心にズーム
            },
            () => {
                console.log("位置情報の取得に失敗しました。");
            }
        );
    }
}

// 島のマーカーを作成
function createIslandMarker(key, island) {
    // 絵文字を使ったカスタムアイコンを作成
    const customIcon = L.divIcon({
        className: 'island-marker',
        html: '🏝️',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const marker = L.marker([island.lat, island.lng], { icon: customIcon }).addTo(map);

    // ポップアップ（情報ウィンドウ）の内容を作成
    const popupContent = 
        `<div class="popup-content">` +
            `<img src="${island.image}" alt="${island.name}">` +
            `<div class="popup-text">` +
                `<h3>${island.name}</h3>` +
                `<p>${island.description}</p>` +
                `<p>スタンプ: ${collectedStamps.includes(key) ? '取得済み ✅' : '未取得 ❌'}</p>` +
            `</div>` +
        `</div>`;

    marker.bindPopup(popupContent);
}

// UI関連のイベントリスナーを設定
function setupUI() {
    // 島スポットクリック時の処理
    document.querySelectorAll('.island-spot').forEach(spot => {
        spot.addEventListener('click', function() {
            const islandKey = this.dataset.island;
            const island = islands[islandKey];
            
            // マップタブに切り替え
            switchSection('map-section');
            document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
            document.querySelector('button[data-target="map-section"]').classList.add('active');
            
            // マップが初期化されていない場合は初期化
            if (!map) {
                initializeMap();
            }
            
            // 少し遅延を入れてから島にズーム
            setTimeout(() => {
                map.setView([island.lat, island.lng], 14);
            }, 200);
        });
    });

    // タブ切替ロジック
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
        btn.addEventListener('click', e => {
            const target = btn.dataset.target;
            switchSection(target);
            document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // マップセクションに切り替えた時、マップが初期化されていなければ初期化
            if (target === 'map-section' && !map) {
                setTimeout(() => {
                    initializeMap();
                }, 100);
            }
            // マップセクションに切り替えた時、マップのサイズを再計算
            else if (target === 'map-section' && map) {
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
            }
        });
    });
}

// QRコードモーダルを開く
function openQRModal() {
    document.getElementById('qrModal').style.display = 'flex';
    html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("QRコードリーダーの起動に失敗しました。", err);
        alert("カメラの起動に失敗しました。ブラウザのカメラアクセスを許可してください。");
        closeQRModal();
    });
}

// QRコードモーダルを閉じる
function closeQRModal() {
    document.getElementById('qrModal').style.display = 'none';
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("リーダーの停止に失敗しました。", err));
    }
}

// QRコード読み取り成功
function onScanSuccess(decodedText, decodedResult) {
    closeQRModal();
    processQRCode(decodedText);
}

// QRコード読み取り失敗
function onScanFailure(error) {
    // 連続スキャンのためエラーは無視
}

// QRコードの処理
function processQRCode(decodedText) {
    if (!decodedText || !decodedText.endsWith('_island')) {
        return alert('無効なQRコードです');
    }
    const islandKey = decodedText.replace('_island', '');
    if (!islands[islandKey]) {
        return alert('無効なQRコードです');
    }
    if (collectedStamps.includes(islandKey)) {
        return alert('この島のスタンプは既に取得済みです');
    }
    addStamp(islandKey);
}

// スタンプを追加
function addStamp(islandKey) {
    collectedStamps.push(islandKey);
    currentPoints++;
    document.getElementById(`stamp-${islandKey}`).classList.add('collected', 'animating');
    saveUserData();
    updatePointsDisplay();
    alert(`${islands[islandKey].name}のスタンプを獲得しました！`);
    
    // マップ上のマーカーも更新（もしマップが初期化されていれば）
    if (map) {
        // すべてのマーカーを再作成して更新
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        // マーカーを再作成
        for (const key in islands) {
            createIslandMarker(key, islands[key]);
        }
    }
}

// ポイント表示の更新
function updatePointsDisplay() {
    document.getElementById('current-points').textContent = currentPoints;
    document.querySelectorAll('.apply-button').forEach(button => {
        const requiredPoints = parseInt(button.parentElement.querySelector('.prize-points').textContent.match(/\d+/)[0]);
        button.disabled = currentPoints < requiredPoints;
    });
}

// 賞品に応募
function applyForPrize(prize, requiredPoints) {
    if (currentPoints < requiredPoints) {
        return alert('ポイントが不足しています');
    }
    if (confirm(`${prize}賞に応募しますか？（${requiredPoints}ポイント消費）`)) {
        currentPoints -= requiredPoints;
        updatePoints
