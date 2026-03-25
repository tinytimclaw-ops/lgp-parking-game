// Game State
const state = {
  airport: null,
  outDate: null,
  outTime: '06:00',
  inDate: null,
  inTime: '12:00',
  currentStep: 1,
  currentMonth: 0, // Months from today
  carPosition: 0, // Position in calendar grid (0-34)
  activeCalendar: null,
  carInLift: false, // Track if car is in the lift
  liftTraveling: false // Track if lift is moving
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

  // Keyboard controls
  document.addEventListener('keydown', handleKeyboard);
});

function handleKeyboard(e) {
  if (!state.activeCalendar) return;

  const key = e.key;
  let newPosition = state.carPosition;

  if (key === 'ArrowLeft') {
    newPosition = Math.max(0, state.carPosition - 1);
    e.preventDefault();
  } else if (key === 'ArrowRight') {
    newPosition = Math.min(34, state.carPosition + 1);
    e.preventDefault();
  } else if (key === 'ArrowUp') {
    newPosition = Math.max(0, state.carPosition - 7);
    e.preventDefault();
  } else if (key === 'ArrowDown') {
    newPosition = Math.min(34, state.carPosition + 7);
    e.preventDefault();
  } else if (key === 'Enter' || key === ' ') {
    parkCar();
    e.preventDefault();
    return;
  } else {
    return;
  }

  state.carPosition = newPosition;
  updateCarPosition();
}

function updateCarPosition() {
  const container = document.getElementById(state.activeCalendar);
  const spaces = container.querySelectorAll('.parking-space');
  const targetSpace = spaces[state.carPosition];

  if (!targetSpace) return;

  const carId = state.activeCalendar === 'dropoff-calendar' ? 'car-dropoff' : 'car-collection';
  const car = document.getElementById(carId);

  // Remove highlight from all spaces
  spaces.forEach(s => s.classList.remove('highlighted'));

  // Highlight current space
  if (!targetSpace.classList.contains('disabled')) {
    targetSpace.classList.add('highlighted');
  }

  // Move car to space
  const spaceRect = targetSpace.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  car.style.left = `${spaceRect.left - containerRect.left + spaceRect.width / 2}px`;
  car.style.top = `${spaceRect.top - containerRect.top + spaceRect.height / 2}px`;
  car.style.transform = 'translate(-50%, -50%)';
}

function parkCar() {
  const container = document.getElementById(state.activeCalendar);
  const spaces = container.querySelectorAll('.parking-space');
  const targetSpace = spaces[state.carPosition];

  if (!targetSpace || targetSpace.classList.contains('disabled')) return;

  const dateField = state.activeCalendar === 'dropoff-calendar' ? 'outDate' : 'inDate';
  const dateStr = targetSpace.dataset.date;

  if (dateField === 'inDate' && state.outDate) {
    const selectedDate = new Date(dateStr);
    const outDateObj = new Date(state.outDate);
    if (selectedDate < outDateObj) {
      return; // Don't allow collection before drop-off
    }
  }

  state[dateField] = dateStr;

  const carId = state.activeCalendar === 'dropoff-calendar' ? 'car-dropoff' : 'car-collection';
  const car = document.getElementById(carId);
  car.classList.add('parked');

  // Mark as selected
  container.querySelectorAll('.parking-space').forEach(s => s.classList.remove('selected', 'highlighted'));
  targetSpace.classList.add('selected');

  setTimeout(() => {
    car.classList.remove('parked');
    state.activeCalendar = null;
    nextStep();
  }, 800);
}

function nextStep() {
  state.currentStep++;

  // Hide all steps
  document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));

  // Show next step
  if (state.currentStep === 2) {
    document.getElementById('step-dropoff').classList.add('active');
    state.currentMonth = 0;
    state.carPosition = 0;
    state.activeCalendar = 'dropoff-calendar';
    generateCalendar('dropoff-calendar', 'outDate', 1);
  } else if (state.currentStep === 3) {
    document.getElementById('step-dropoff-time').classList.add('active');
  } else if (state.currentStep === 4) {
    document.getElementById('step-collection').classList.add('active');
    state.currentMonth = 0;
    state.carPosition = 0;
    state.activeCalendar = 'collection-calendar';
    const minDate = state.outDate ? new Date(state.outDate) : new Date();
    const minDays = Math.ceil((minDate - new Date()) / (1000 * 60 * 60 * 24)) + 1;
    generateCalendar('collection-calendar', 'inDate', minDays);
  } else if (state.currentStep === 5) {
    document.getElementById('step-collection-time').classList.add('active');
  } else if (state.currentStep === 6) {
    showSummary();
  }

  updateProgress();
}

function generateCalendar(containerId, dateField, minDays = 1) {
  const wrapper = document.getElementById(containerId).parentElement;
  const existingLift = wrapper.querySelector('.lift-picker');
  const existingCalendar = document.getElementById(containerId);

  // Remove old lift picker if it exists
  if (existingLift) {
    existingLift.remove();
  }

  // Add lift-style floor picker for months
  const liftPicker = document.createElement('div');
  liftPicker.className = 'lift-picker';

  // Generate 12 months (floors)
  const today = new Date();
  let floorsHTML = '';
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthName = monthDate.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    const floorNumber = i + 1;
    const isSelected = i === state.currentMonth ? 'selected' : '';
    floorsHTML += `
      <button class="lift-floor ${isSelected}" data-floor="${i}">
        <span class="floor-number">${floorNumber}</span>
        <span class="floor-label">${monthName}</span>
      </button>
    `;
  }

  liftPicker.innerHTML = `
    <div class="lift-shaft">
      <div class="lift-label">🛗 Select Floor (Month)</div>
      <div class="lift-floors">
        ${floorsHTML}
      </div>
      <div class="lift-indicator">
        <span class="lift-arrow">▶</span>
        <span id="currentFloorLabel">Floor 1</span>
      </div>
    </div>
  `;

  wrapper.insertBefore(liftPicker, existingCalendar);

  // Generate calendar
  renderCalendar(containerId, dateField, minDays);

  // Add floor button listeners
  wrapper.querySelectorAll('.lift-floor').forEach(floor => {
    floor.addEventListener('click', () => {
      if (state.liftTraveling) return; // Don't allow clicks while traveling

      const floorNum = parseInt(floor.dataset.floor);

      // Update selected floor
      wrapper.querySelectorAll('.lift-floor').forEach(f => f.classList.remove('selected'));
      floor.classList.add('selected');

      // Update indicator
      const floorLabel = wrapper.querySelector('#currentFloorLabel');
      if (floorLabel) {
        floorLabel.textContent = `Floor ${floorNum + 1}`;
      }

      // Animate car journey through lift
      animateCarThroughLift(floorNum, containerId, dateField, minDays);
    });
  });
}

function renderCalendar(containerId, dateField, minDays) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth() + state.currentMonth, 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + state.currentMonth + 1, 0);

  // Get first day of week (0 = Sunday)
  const firstDayOfWeek = firstDayOfMonth.getDay();

  // Add empty spaces for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    const emptySpace = document.createElement('div');
    emptySpace.className = 'parking-space disabled';
    container.appendChild(emptySpace);
  }

  // Add days of the month
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    const daysSinceToday = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    const space = document.createElement('div');
    space.className = 'parking-space';
    space.dataset.date = dateStr;

    // Disable past dates and dates before minimum
    if (daysSinceToday < minDays) {
      space.classList.add('disabled');
    }

    space.innerHTML = `
      <div class="space-number">${day}</div>
      <div class="space-label">${date.toLocaleDateString('en', { month: 'short' })}</div>
    `;

    if (!space.classList.contains('disabled')) {
      space.addEventListener('click', () => {
        const allSpaces = container.querySelectorAll('.parking-space');
        state.carPosition = Array.from(allSpaces).indexOf(space);
        updateCarPosition();
        setTimeout(parkCar, 200);
      });
    }

    container.appendChild(space);
  }

  // Fill remaining spaces to complete the grid
  const totalSpaces = container.children.length;
  const remainingSpaces = 35 - totalSpaces;
  for (let i = 0; i < remainingSpaces; i++) {
    const emptySpace = document.createElement('div');
    emptySpace.className = 'parking-space disabled';
    container.appendChild(emptySpace);
  }

  // Position car at first available space
  setTimeout(() => updateCarPosition(), 100);
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

function animateCarThroughLift(targetFloor, containerId, dateField, minDays) {
  state.liftTraveling = true;

  const car = document.getElementById(state.activeCalendar.replace('-calendar', ''));
  const liftShaft = document.querySelector('.lift-shaft');

  if (!car || !liftShaft) {
    // Fallback if elements not found
    state.currentMonth = targetFloor;
    state.carPosition = 0;
    renderCalendar(containerId, dateField, minDays);
    state.liftTraveling = false;
    return;
  }

  // Step 1: Car drives into lift (move to center of lift shaft)
  car.classList.add('driving-to-lift');
  const liftRect = liftShaft.getBoundingClientRect();
  const carRect = car.getBoundingClientRect();
  const offsetX = liftRect.left + liftRect.width / 2 - carRect.left - carRect.width / 2;
  const offsetY = liftRect.top + liftRect.height / 2 - carRect.top - carRect.height / 2;

  car.style.transition = 'all 0.8s ease';
  car.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(0.8)`;

  // Step 2: After car enters lift, make lift "travel" with pulsing animation
  setTimeout(() => {
    car.classList.remove('driving-to-lift');
    car.classList.add('in-lift');
    liftShaft.classList.add('traveling');

    // Step 3: After lift travels, update month and render calendar
    setTimeout(() => {
      state.currentMonth = targetFloor;
      state.carPosition = 0;
      renderCalendar(containerId, dateField, minDays);

      // Step 4: Car drives out of lift onto calendar
      setTimeout(() => {
        liftShaft.classList.remove('traveling');
        car.classList.remove('in-lift');
        car.classList.add('exiting-lift');
        car.style.transition = 'all 0.6s ease';
        car.style.transform = '';

        // Step 5: Position car at first available space
        setTimeout(() => {
          car.classList.remove('exiting-lift');
          updateCarPosition();
          state.liftTraveling = false;
        }, 600);
      }, 200);
    }, 1200); // Lift travel time
  }, 800); // Time to drive into lift
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
