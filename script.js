// Game State
const state = {
  airport: null,
  outDate: null,
  outTime: '06:00',
  inDate: null,
  inTime: '12:00',
  currentStep: 1
};

// Airport names
const AIRPORT_NAMES = {
  LHR: "Heathrow", LGW: "Gatwick", STN: "Stansted", LTN: "Luton", MAN: "Manchester",
  BHX: "Birmingham", EDI: "Edinburgh", GLA: "Glasgow", BRS: "Bristol", NCL: "Newcastle"
};

// Date helper
function datePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateProgress();

  // Airport selection
  document.querySelectorAll('.airport-card').forEach(card => {
    card.addEventListener('click', () => {
      state.airport = card.dataset.airport;
      nextStep();
    });
  });

  // Time selection
  document.querySelectorAll('#step-dropoff-time .time-bay').forEach(bay => {
    bay.addEventListener('click', () => {
      state.outTime = bay.dataset.time;
      document.querySelectorAll('#step-dropoff-time .time-bay').forEach(b => b.classList.remove('selected'));
      bay.classList.add('selected');
      setTimeout(nextStep, 300);
    });
  });

  document.querySelectorAll('#step-collection-time .time-bay').forEach(bay => {
    bay.addEventListener('click', () => {
      state.inTime = bay.dataset.time;
      document.querySelectorAll('#step-collection-time .time-bay').forEach(b => b.classList.remove('selected'));
      bay.classList.add('selected');
      setTimeout(nextStep, 300);
    });
  });

  // Search button
  document.getElementById('searchBtn').addEventListener('click', submitSearch);
});

function nextStep() {
  state.currentStep++;

  // Hide all steps
  document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));

  // Show next step
  if (state.currentStep === 2) {
    document.getElementById('step-dropoff').classList.add('active');
    generateCalendar('dropoff-calendar', 'outDate', 1, 30);
  } else if (state.currentStep === 3) {
    document.getElementById('step-dropoff-time').classList.add('active');
  } else if (state.currentStep === 4) {
    document.getElementById('step-collection').classList.add('active');
    const minDate = state.outDate ? new Date(state.outDate) : new Date();
    const minDays = Math.ceil((minDate - new Date()) / (1000 * 60 * 60 * 24)) + 1;
    generateCalendar('collection-calendar', 'inDate', minDays, 60);
  } else if (state.currentStep === 5) {
    document.getElementById('step-collection-time').classList.add('active');
  } else if (state.currentStep === 6) {
    showSummary();
  }

  updateProgress();
}

function generateCalendar(containerId, dateField, startDays, totalDays) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + startDays);

  for (let i = 0; i < 35; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const space = document.createElement('div');
    space.className = 'parking-space';

    if (i >= totalDays) {
      space.classList.add('disabled');
    }

    const dateStr = date.toISOString().split('T')[0];
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString('en', { month: 'short' });

    space.innerHTML = `
      <div class="space-number">${dayNum}</div>
      <div class="space-label">${monthName}</div>
    `;

    if (!space.classList.contains('disabled')) {
      space.addEventListener('click', () => {
        if (dateField === 'inDate' && state.outDate) {
          const selectedDate = new Date(dateStr);
          const outDateObj = new Date(state.outDate);
          if (selectedDate < outDateObj) {
            return; // Don't allow collection before drop-off
          }
        }

        state[dateField] = dateStr;

        // Animate car parking
        const carId = dateField === 'outDate' ? 'car-dropoff' : 'car-collection';
        const car = document.getElementById(carId);
        const spaceRect = space.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        car.style.left = `${spaceRect.left - containerRect.left + spaceRect.width / 2}px`;
        car.style.top = `${spaceRect.top - containerRect.top + spaceRect.height / 2}px`;
        car.style.transform = 'translate(-50%, -50%)';
        car.classList.add('parked');

        // Mark as selected
        container.querySelectorAll('.parking-space').forEach(s => s.classList.remove('selected'));
        space.classList.add('selected');

        setTimeout(() => {
          car.classList.remove('parked');
          nextStep();
        }, 800);
      });
    }

    container.appendChild(space);
  }
}

function showSummary() {
  document.getElementById('step-search').classList.add('active');

  document.getElementById('summary-airport').textContent = AIRPORT_NAMES[state.airport] || state.airport;
  document.getElementById('summary-dropoff').textContent = `${formatDate(state.outDate)} at ${state.outTime}`;
  document.getElementById('summary-collection').textContent = `${formatDate(state.inDate)} at ${state.inTime}`;
}

function updateProgress() {
  const progress = (state.currentStep / 6) * 100;
  document.getElementById('progressFill').style.width = `${progress}%`;
}

function submitSearch() {
  const urlParams = new URLSearchParams(window.location.search);
  const agent = urlParams.get('agent') || 'WY992';
  const adcode = urlParams.get('adcode') || '';
  const promotionCode = urlParams.get('promotionCode') || '';
  const flight = urlParams.get('flight') || 'default';

  // LGP domain resolution
  const host = window.location.host;
  const isLocal = host.startsWith('127') || host.includes('github.io');
  const basedomain = isLocal ? 'www.holidayextras.com' : host.replace('www', 'app');

  // Format times for URL
  const outTimeEncoded = state.outTime.replace(':', '%3A');
  const inTimeEncoded = state.inTime.replace(':', '%3A');

  // Assemble search URL
  const searchUrl = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=${agent}&ppts=&customer_ref=&lang=en&adults=2&depart=${state.airport}&terminal=&arrive=&flight=${flight}&in=${state.inDate}&out=${state.outDate}&park_from=${outTimeEncoded}&park_to=${inTimeEncoded}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=${adcode}&promotionCode=${promotionCode}`;

  window.location.href = searchUrl;
}
