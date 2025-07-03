// グローバル変数
let currentPoints = 0;
let collectedStamps = [];
let userLocation = null;
let html5QrCode; // QRコードリーダーのインスタンスを保持

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
    // ローカルストレージからデータを読み込む
    loadUserData();
    // ポイント表示の更新
    updatePointsDisplay();
    // 位置情報の取得
    getCurrentLocation();
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
            },
            (error) => {
                console.error('位置情報の取得に失敗しました:', error);
            }
        );
    }
}

// ▼▼▼ 変更箇所 ▼▼▼

// QRコードモーダルを開く

// QRコードモーダルを開く
function openQRModal() {
    document.getElementById('qrModal').style.display = 'flex';
    
    // Html5Qrcodeが定義されているか確認
    if (typeof Html5Qrcode === 'undefined') {
        console.error('Html5Qrcode is not defined. Library may not be loaded.');
        alert('QRコードリーダーの初期化に失敗しました。ページを再読み込みしてください。');
        closeQRModal();
        return;
    }
    
    // QRコードリーダーの初期化と開始
    try {
        html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCode.start(
            { facingMode: "environment" }, // 背面カメラを使用
            {
                fps: 10, // 1秒あたりのスキャンフレーム数
                qrbox: { width: 250, height: 250 } // スキャン領域のサイズ（ピクセル）
            },
            onScanSuccess, // スキャン成功時のコールバック
            onScanFailure  // スキャン失敗時のコールバック
        ).catch(err => {
            // カメラの起動失敗などのエラー処理
            console.error("QRコードリーダーの起動に失敗しました。", err);
            alert("カメラの起動に失敗しました。ブラウザのカメラアクセスを許可してください。");
            closeQRModal();
        });
    } catch (error) {
        console.error("Html5Qrcode initialization error:", error);
        alert('QRコードリーダーの初期化中にエラーが発生しました。');
        closeQRModal();
    }
}

// QRコードモーダルを閉じる
function closeQRModal() {
    document.getElementById('qrModal').style.display = 'none';
    
    // QRコードリーダーが起動していれば停止する
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(ignore => {
            console.log("QR Code scanning stopped.");
        }).catch(err => {
            console.error("Failed to stop QR Code scanning.", err);
        });
    }
}

// QRコード読み取り成功時の処理
function onScanSuccess(decodedText, decodedResult) {
    console.log('QRコード読み取り成功:', decodedText);
    // スキャン成功後、一度だけ処理を実行し、すぐにリーダーを閉じる
    html5QrCode.stop();
    processQRCode(decodedText);
    closeQRModal();
}

// QRコード読み取り失敗時の処理
function onScanFailure(error) {
    // このコールバックはスキャンが成功するまで呼ばれ続けるため、通常はエラーをコンソールに出力しない
}

// QRコードの処理
function processQRCode(decodedText) {
    // QRコードの文字列が "_island" で終わるかチェック
    if (!decodedText || !decodedText.endsWith('_island')) {
        alert('無効なQRコードです');
        return;
    }

    // "_island" を取り除いて島のキーを取得
    const islandKey = decodedText.replace('_island', '');

    // 島のキーが存在するか確認
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

// ▲▲▲ 変更箇所 ▲▲▲


// スタンプを追加
function addStamp(islandKey) {
    collectedStamps.push(islandKey);
    currentPoints++;
    
    const stampElement = document.getElementById(`stamp-${islandKey}`);
    stampElement.classList.add('collected', 'animating');
    
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
        alert('ポイントが不足しています');
        return;
    }
    
    if (confirm(`${prize}賞に応募しますか？（${requiredPoints}ポイント消費）`)) {
        currentPoints -= requiredPoints;
        updatePointsDisplay();
        saveUserData();
        alert(`${prize}賞への応募が完了しました！`);
    }
}

// ユーザーデータの保存（ローカルストレージ）
function saveUserData() {
    const userData = {
        collectedStamps: collectedStamps,
        currentPoints: currentPoints
    };
    localStorage.setItem('stampRallyData', JSON.stringify(userData));
}

// ユーザーデータの読み込み（ローカルストレージ）
function loadUserData() {
    const savedData = localStorage.getItem('stampRallyData');
    if (savedData) {
        const userData = JSON.parse(savedData);
        collectedStamps = userData.collectedStamps || [];
        currentPoints = userData.currentPoints || 0;
        
        collectedStamps.forEach(islandKey => {
            const stampElement = document.getElementById(`stamp-${islandKey}`);
            stampElement.classList.add('collected');
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
