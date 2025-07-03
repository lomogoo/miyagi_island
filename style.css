// app.js の全コード

// グローバル変数
let currentPoints = 0;
let collectedStamps = [];
let html5QrCode;
let map; // Google Mapオブジェクトを保持する変数
let infoWindow; // 情報ウィンドウを保持する変数

// 島の情報（descriptionプロパティを追加）
const islands = {
    aji: { name: '網地島', lat: 38.3833, lng: 141.4667, description: '美しい砂浜が広がる、夏には多くの海水浴客で賑わう島。' },
    tashiro: { name: '田代島', lat: 38.3167, lng: 141.4167, description: '「猫の島」として有名。多くの猫たちが自由気ままに暮らしている。' },
    katsura: { name: '桂島', lat: 38.2833, lng: 141.1000, description: '浦戸諸島の一つで、歴史的な見どころも多い風光明媚な島。' },
    nonoshima: { name: '野々島', lat: 38.2667, lng: 141.0833, description: 'ツバキのトンネルや潟湖など、豊かな自然が魅力の島。' },
    sabusawa: { name: '寒風沢島', lat: 38.2500, lng: 141.0667, description: '江戸時代の歴史的な港跡が残る、歴史とロマンの島。' },
    ho: { name: '朴島', lat: 38.2333, lng: 141.0500, description: '比較的小さな島で、静かな時間を過ごすことができる。' },
    izushima: { name: '出島', lat: 38.2167, lng: 140.9667, description: '本土と橋で結ばれており、アクセスしやすい漁業の盛んな島。' },
    enoshima: { name: '江島', lat: 38.2000, lng: 140.9500, description: 'ウミネコの繁殖地として知られ、自然豊かな景観が広がる。' }
};

// ▼▼▼ Google Maps APIによって呼び出されるグローバル関数 ▼▼▼
function initMap() {
    // マップの初期位置（宮城県中心あたり）
    const miyagiPref = { lat: 38.2682, lng: 140.8694 };

    // マップを作成し、'map'というIDの要素に表示
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: miyagiPref,
        mapTypeControl: false, // 不要なコントロールを非表示
        streetViewControl: false,
    });

    // 情報ウィンドウを初期化（使いまわすため）
    infoWindow = new google.maps.InfoWindow();

    // ユーザーの現在地を表示
    displayUserLocation();

    // 各島にマーカーを設置
    for (const islandKey in islands) {
        createIslandMarker(islandKey, islands[islandKey]);
    }
}
// ▲▲▲ ここまでがマップ初期化のメイン関数 ▲▲▲

// ユーザーの現在地を表示する関数
function displayUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                // 現在地に青い丸のマーカーを設置
                new google.maps.Marker({
                    position: pos,
                    map: map,
                    title: "あなたの現在地",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "white",
                    },
                });
                map.setCenter(pos); // マップの中心を現在地に移動
            },
            () => {
                // 位置情報の取得に失敗した場合
                console.error("位置情報の取得に失敗しました。");
            }
        );
    }
}

// 島のマーカーを作成する関数
function createIslandMarker(key, island) {
    const marker = new google.maps.Marker({
        position: { lat: island.lat, lng: island.lng },
        map: map,
        title: island.name,
    });

    // マーカークリック時のイベント
    marker.addListener("click", () => {
        // 情報ウィンドウの内容を作成
        const contentString = 
            `<div>` +
                `<h3 style="margin:0;">${island.name}</h3>` +
                `<p>${island.description}</p>` +
                `<p>スタンプ: ${collectedStamps.includes(key) ? '取得済み ✅' : '未取得 ❌'}</p>` +
            `</div>`;
        
        infoWindow.setContent(contentString);
        infoWindow.open(map, marker);
    });
}


// DOM読み込み完了時に実行される関数
document.addEventListener('DOMContentLoaded', function() {
    setupApp();
});

// アプリの初期設定
function setupApp() {
    loadUserData();
    updatePointsDisplay();
    // 島スポットのクリックイベントなどを設定
    document.querySelectorAll('.island-spot').forEach(spot => {
        spot.addEventListener('click', function() {
            const islandKey = this.dataset.island;
            const island = islands[islandKey];
            const hasStamp = collectedStamps.includes(islandKey);
            alert(`${island.name}\n緯度: ${island.lat}\n経度: ${island.lng}\nスタンプ: ${hasStamp ? '取得済み' : '未取得'}`);
        });
    });
    // タブ切替ロジック
    switchSection('map-section');
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
        btn.addEventListener('click', e => {
            const target = btn.dataset.target;
            switchSection(target);
            document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
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
        updatePointsDisplay();
        saveUserData();
        alert(`${prize}賞への応募が完了しました！`);
    }
}

// ユーザーデータの保存
function saveUserData() {
    const userData = { collectedStamps, currentPoints };
    localStorage.setItem('stampRallyData', JSON.stringify(userData));
}

// ユーザーデータの読み込み
function loadUserData() {
    const savedData = localStorage.getItem('stampRallyData');
    if (savedData) {
        const userData = JSON.parse(savedData);
        collectedStamps = userData.collectedStamps || [];
        currentPoints = userData.currentPoints || 0;
        collectedStamps.forEach(islandKey => {
            document.getElementById(`stamp-${islandKey}`).classList.add('collected');
        });
    }
}

function switchSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
}
