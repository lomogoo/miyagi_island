// Island data
const islands = [
  {
    id: "aji",
    name: "網地島",
    lat: 38.3833,
    lng: 141.4667,
    description: "美しい砂浜が広がる島。",
    image: "https://i.imgur.com/39s93Sn.jpeg"
  },
  {
    id: "tashiro",
    name: "田代島",
    lat: 38.3167,
    lng: 141.4167,
    description: "「猫の島」として有名。",
    image: "https://i.imgur.com/xJ4l6c2.jpeg"
  },
  {
    id: "katsura",
    name: "桂島",
    lat: 38.2833,
    lng: 141.1000,
    description: "歴史的な見どころも多い風光明媚な島。",
    image: "https://i.imgur.com/39s93Sn.jpeg"
  },
  {
    id: "nonoshima",
    name: "野々島",
    lat: 38.2667,
    lng: 141.0833,
    description: "ツバキのトンネルが魅力。",
    image: "https://i.imgur.com/xJ4l6c2.jpeg"
  },
  {
    id: "sabusawa",
    name: "寒風沢島",
    lat: 38.2500,
    lng: 141.0667,
    description: "江戸時代の歴史的な港跡が残る島。",
    image: "https://i.imgur.com/39s93Sn.jpeg"
  },
  {
    id: "ho",
    name: "朴島",
    lat: 38.2333,
    lng: 141.0500,
    description: "静かな時間を過ごせる小さな島。",
    image: "https://i.imgur.com/xJ4l6c2.jpeg"
  },
  {
    id: "izushima",
    name: "出島",
    lat: 38.2167,
    lng: 140.9667,
    description: "本土と橋で結ばれた漁業の盛んな島。",
    image: "https://i.imgur.com/39s93Sn.jpeg"
  },
  {
    id: "enoshima",
    name: "江島",
    lat: 38.2000,
    lng: 140.9500,
    description: "ウミネコの繁殖地として知られる。",
    image: "https://i.imgur.com/xJ4l6c2.jpeg"
  }
];

// Prize data
const prizes = [
  {
    name: "A賞",
    points: 3,
    description: "特別賞品"
  },
  {
    name: "B賞",
    points: 2,
    description: "優秀賞品"
  },
  {
    name: "C賞",
    points: 1,
    description: "参加賞品"
  },
  {
    name: "D賞",
    points: 1,
    description: "参加賞品"
  }
];

// Application state
let collectedStamps = new Set();
let totalPoints = 0;
let map;
let markers = [];
let html5QrcodeScanner;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

function initializeApp() {
  initializeMap();
  initializeNavigation();
  initializeQRCamera();
  initializeStampCards();
  initializePrizes();
  updatePointsDisplay();
}

// Map initialization
function initializeMap() {
  // Initialize map centered on Miyagi Prefecture islands
  map = L.map('map').setView([38.25, 141.1], 10);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Add island markers
  islands.forEach(island => {
    addIslandMarker(island);
  });
}

function addIslandMarker(island) {
  // Create custom icon
  const isCollected = collectedStamps.has(island.id);
  const iconHtml = `
    <div class="island-marker ${isCollected ? 'collected' : ''}">
      🏝️
    </div>
  `;

  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  // Create marker
  const marker = L.marker([island.lat, island.lng], { icon: customIcon })
    .addTo(map);

  // Create popup content
  const popupContent = `
    <div class="island-popup">
      <img src="${island.image}" alt="${island.name}" onerror="this.style.display='none'">
      <h3>${island.name}</h3>
      <p>${island.description}</p>
      ${isCollected ? '<p style="color: var(--color-success); font-weight: bold;">✓ スタンプ獲得済み</p>' : ''}
    </div>
  `;

  marker.bindPopup(popupContent);
  markers.push({ marker, island });
}

// Navigation
function initializeNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const targetSection = this.dataset.section;
      switchSection(targetSection);
      
      // Update active navigation button
      navButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

function switchSection(sectionId) {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.classList.remove('active');
  });
  
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  }
}

// QR Code functionality
function initializeQRCamera() {
  const qrCameraBtn = document.getElementById('qrCameraBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrModal = document.getElementById('closeQrModal');

  qrCameraBtn.addEventListener('click', openQRCamera);
  closeQrModal.addEventListener('click', closeQRCamera);

  // Close modal when clicking outside
  qrModal.addEventListener('click', function(e) {
    if (e.target === qrModal) {
      closeQRCamera();
    }
  });
}

function openQRCamera() {
  const qrModal = document.getElementById('qrModal');
  const qrStatus = document.getElementById('qrStatus');
  
  qrModal.classList.add('active');
  qrStatus.textContent = 'カメラを起動中...';
  qrStatus.className = 'qr-status';

  // Initialize QR scanner
  html5QrcodeScanner = new Html5QrcodeScanner(
    "qrReader",
    {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    }
  );

  html5QrcodeScanner.render(onScanSuccess, onScanError);
}

function closeQRCamera() {
  const qrModal = document.getElementById('qrModal');
  qrModal.classList.remove('active');

  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear();
    html5QrcodeScanner = null;
  }
}

function onScanSuccess(decodedText, decodedResult) {
  const qrStatus = document.getElementById('qrStatus');
  
  // Check if scanned text matches any island name
  const matchedIsland = islands.find(island => island.name === decodedText.trim());
  
  if (matchedIsland) {
    if (collectedStamps.has(matchedIsland.id)) {
      qrStatus.textContent = `${matchedIsland.name}のスタンプは既に獲得済みです。`;
      qrStatus.className = 'qr-status error';
    } else {
      // Add stamp and points
      collectedStamps.add(matchedIsland.id);
      totalPoints += 1;
      
      qrStatus.textContent = `${matchedIsland.name}のスタンプを獲得しました！`;
      qrStatus.className = 'qr-status success';
      
      // Update UI
      updatePointsDisplay();
      updateStampCards();
      updateMapMarkers();
      updatePrizes();
      
      // Show success modal
      setTimeout(() => {
        closeQRCamera();
        showSuccessModal(matchedIsland.name);
      }, 2000);
    }
  } else {
    qrStatus.textContent = '対象外のQRコードです。宮城県の離島のQRコードを読み取ってください。';
    qrStatus.className = 'qr-status error';
  }
}

function onScanError(error) {
  // Handle scan errors silently
  console.log('QR scan error:', error);
}

function showSuccessModal(islandName) {
  const successModal = document.getElementById('successModal');
  const successTitle = document.getElementById('successTitle');
  const successMessage = document.getElementById('successMessage');
  const closeSuccessModal = document.getElementById('closeSuccessModal');

  successTitle.textContent = 'スタンプ獲得！';
  successMessage.textContent = `${islandName}のスタンプを獲得しました！ポイントが1つ増えました。`;
  
  successModal.classList.add('active');

  closeSuccessModal.addEventListener('click', function() {
    successModal.classList.remove('active');
  });

  // Auto close after 3 seconds
  setTimeout(() => {
    successModal.classList.remove('active');
  }, 3000);
}

// Stamp cards
function initializeStampCards() {
  const stampGrid = document.getElementById('stampGrid');
  
  islands.forEach(island => {
    const stampCard = document.createElement('div');
    stampCard.className = 'stamp-card';
    stampCard.id = `stamp-${island.id}`;
    
    stampCard.innerHTML = `
      <span class="stamp-icon">🏝️</span>
      <div class="stamp-name">${island.name}</div>
      <div class="stamp-status">未獲得</div>
    `;
    
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

function updateMapMarkers() {
  // Clear existing markers
  markers.forEach(({ marker }) => {
    map.removeLayer(marker);
  });
  markers = [];

  // Re-add markers with updated status
  islands.forEach(island => {
    addIslandMarker(island);
  });
}

// Prizes
function initializePrizes() {
  const prizesContainer = document.getElementById('prizesContainer');
  
  prizes.forEach((prize, index) => {
    const prizeCard = document.createElement('div');
    prizeCard.className = 'prize-card';
    
    prizeCard.innerHTML = `
      <div class="prize-info">
        <h3>${prize.name}</h3>
        <p>${prize.description}</p>
      </div>
      <div class="prize-points">${prize.points}P</div>
      <button class="prize-btn" data-prize-index="${index}">
        応募する
      </button>
    `;
    
    prizesContainer.appendChild(prizeCard);
  });
  
  updatePrizes();
}

function updatePrizes() {
  const prizeButtons = document.querySelectorAll('.prize-btn');
  
  prizeButtons.forEach((btn, index) => {
    const prize = prizes[index];
    const canApply = totalPoints >= prize.points;
    
    btn.disabled = !canApply;
    btn.textContent = canApply ? '応募する' : `${prize.points}P必要`;
    
    if (canApply) {
      btn.onclick = () => applyForPrize(index);
    }
  });
}

function applyForPrize(prizeIndex) {
  const prize = prizes[prizeIndex];
  
  if (totalPoints >= prize.points) {
    totalPoints -= prize.points;
    updatePointsDisplay();
    updatePrizes();
    
    // Show success message
    alert(`${prize.name}に応募しました！`);
  }
}

// Points display
function updatePointsDisplay() {
  const pointsValue = document.getElementById('pointsValue');
  pointsValue.textContent = totalPoints;
}

// Utility functions
function showMessage(message, type = 'info') {
  // Create a simple message display
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 3000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.remove();
  }, 3000);
}

// Handle visibility changes (for mobile)
document.addEventListener('visibilitychange', function() {
  if (document.hidden && html5QrcodeScanner) {
    closeQRCamera();
  }
});

// Handle resize events
window.addEventListener('resize', function() {
  if (map) {
    map.invalidateSize();
  }
});

// Initialize tooltips for mobile
function initializeMobileTooltips() {
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  
  tooltipElements.forEach(element => {
    element.addEventListener('touchstart', function(e) {
      const tooltip = this.getAttribute('data-tooltip');
      if (tooltip) {
        showMessage(tooltip, 'info');
      }
    });
  });
}

// Call mobile tooltips initialization
setTimeout(initializeMobileTooltips, 1000);