// グローバル変数
let currentPoints = 0;
let collectedStamps = [];
let userLocation = null;
let html5QrCode;

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
    loadUserData();
    updatePointsDisplay();
    getCurrentLocation();
});

// 位置情報の取得
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                console.log('現在位置:', userLocation);
            },
            (error) => {
                console.error('位置情報の取得に失敗しました:', error);
            }
        );
    }
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

// 島スポットクリック時の処理
document.querySelectorAll('.island-spot').forEach(spot => {
    spot.addEventListener('click', function() {
        const islandKey = this.dataset.island;
        const island = islands[islandKey];
        const hasStamp = collectedStamps.includes(islandKey);
        alert(`${island.name}\n緯度: ${island.lat}\n経度: ${island.lng}\nスタンプ: ${hasStamp ? '取得済み' : '未取得'}`);
    });
});

// タブ切替ロジック
document.addEventListener('DOMContentLoaded', () => {
    switchSection('map-section');
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
        btn.addEventListener('click', e => {
            const target = btn.dataset.target;
            switchSection(target);
            document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
});

function switchSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
}