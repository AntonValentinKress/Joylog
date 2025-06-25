function printdata() {
  console.log("Date: " + selectedDate);
  console.log("Time: " + selectedTime);
  console.log("Text: " + selectedText);
  console.log("Images: " + selectedImages);
  console.log("Location: " + selectedLatLng);
  console.log("Score: " + selectedScore);
}
/*
let offset = 0;
const limit = 9999;
const cardsWrapper = document.querySelector(".cards-wrapper");

async function loadEntries() {
    const response = await fetch(`/entries?offset=${offset}&limit=${limit}`);
    const entries = await response.json();
    
    for (const entry of entries) {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-header">${entry.date} ${entry.time}</div>
            <div class="card-body">${entry.text}</div>
        `;
        cardsWrapper.appendChild(card);
    }

    offset += entries.length;

    if (entries.length < limit) {
        observer.disconnect(); // Keine weiteren Daten zu laden
    }
}

const sentinel = document.createElement("div");
sentinel.id = "scroll-sentinel";
cardsWrapper.appendChild(sentinel);

const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting) {
        await loadEntries();
    }
}, { root: null, rootMargin: "200px", threshold: 1.0 });

observer.observe(sentinel);
loadEntries(); // Initiale Ladung
*/

let offset = 0;
const limit = 10;
const cardsWrapper = document.querySelector(".cards-wrapper");
let loading = false;
let allLoaded = false;

function createCard(entry) {
  const card = document.createElement("div");
  card.className = "card";

  // Erstelle eindeutige IDs für Swiper und Modal (für mehrere Karten)
  const swiperId = `swiper-${entry.id}`;
  const modalId = `modal-${entry.id}`;

  card.innerHTML = `
    <div class="card-header">${entry.date} ${entry.time}</div>

    <div class="swiper-container" id="${swiperId}">
      <div class="swiper-wrapper">
        ${entry.images
          .map(
            (img) =>
              `<div class="swiper-slide"><img src="${img.image}" alt="${img.filename}" /></div>`
          )
          .join("")}
      </div>
      <div class="swiper-pagination"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-button-next"></div>
    </div>

    <div class="card-body fade-text">${entry.text}</div>

    <!-- Hidden Modal -->
    <div class="modal" id="${modalId}">
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <div class="modal-header">${entry.date} ${entry.time}</div>
        <div class="modal-swiper-container swiper-container">
          <div class="swiper-wrapper">
            ${entry.images
              .map(
                (img) =>
                  `<div class="swiper-slide"><img src="${img.image}" alt="${img.filename}" /></div>`
              )
              .join("")}
          </div>
          <div class="swiper-pagination"></div>
          <div class="swiper-button-prev"></div>
          <div class="swiper-button-next"></div>
        </div>
        <div class="modal-text">${entry.text}</div>
        <div class="modal-score">Score: ${entry.score ?? "N/A"}</div>
        <div class="modal-map" id="map-${entry.id}"></div>
      </div>
    </div>
  `;

  // Swiper für Karte initialisieren
  new Swiper(card.querySelector(`#${swiperId}`), {
    loop: false,
    pagination: {
      el: card.querySelector(`#${swiperId} .swiper-pagination`),
      clickable: true,
    },
    navigation: {
      nextEl: card.querySelector(`#${swiperId} .swiper-button-next`),
      prevEl: card.querySelector(`#${swiperId} .swiper-button-prev`),
    },
  });

  // Swiper für Modal initialisieren
  const modalSwiperContainer = card.querySelector(`#${modalId} .modal-swiper-container`);
  const modalSwiper = new Swiper(modalSwiperContainer, {
    loop: false,
    pagination: {
      el: modalSwiperContainer.querySelector(".swiper-pagination"),
      clickable: true,
    },
    navigation: {
      nextEl: modalSwiperContainer.querySelector(".swiper-button-next"),
      prevEl: modalSwiperContainer.querySelector(".swiper-button-prev"),
    },
  });

  // Modal-Elemente
  const modal = card.querySelector(`#${modalId}`);
  const closeBtn = modal.querySelector(".modal-close");

  // Karte klickbar machen zum Öffnen des Modals
  card.addEventListener("click", (e) => {
    // Modal nur öffnen, wenn nicht auf Buttons / Swiper klickt
    if (
      !e.target.closest(".swiper-button-prev") &&
      !e.target.closest(".swiper-button-next") &&
      !e.target.closest(".modal-close")
    ) {
      modal.style.display = "block";

      // Leaflet-Karte rendern, falls Location vorhanden
      if (entry.location) {
        if (!modal._mapInitialized) {
          const mapEl = modal.querySelector(`#map-${entry.id}`);
          modal._mapInitialized = true;

          // Leaflet Karte erzeugen
          const map = L.map(mapEl).setView([entry.location.lat, entry.location.long], 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© OpenStreetMap contributors',
          }).addTo(map);

          L.marker([entry.location.lat, entry.location.long]).addTo(map);
        }
      }
    }
  });

  // Modal schließen
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    modal.style.display = "none";
  });

  // Modal schließen beim Klick außerhalb der content-Box
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  return card;
}


async function loadEntries() {
    if (loading || allLoaded) return;
    loading = true;

    const response = await fetch(`/entries?offset=${offset}&limit=${limit}`);
    const entries = await response.json();

    for (const entry of entries) {
        const card = createCard(entry);
        cardsWrapper.appendChild(card);
    }

    offset += entries.length;
    loading = false;

    if (entries.length < limit) {
        allLoaded = true;
    }
}

// Bei Scroll prüfen, ob fast am Ende
cardsWrapper.addEventListener("scroll", () => {
    const threshold = 150; // Pixel vom unteren Rand entfernt
    const scrollPosition = cardsWrapper.scrollTop + cardsWrapper.clientHeight;
    const scrollHeight = cardsWrapper.scrollHeight;

    if (scrollHeight - scrollPosition < threshold) {
        loadEntries();
    }
});



function openExpanded(entry) {
    const modalBody = document.getElementById("modal-body");

    const imageSlider = entry.images.map(img => `<img src="${img.image}" class="expanded-img">`).join("");

    modalBody.innerHTML = `
        <div class="modal-header">${entry.date} ${entry.time}</div>
        <div class="modal-images">${imageSlider}</div>
        <div class="modal-text">${entry.text}</div>
        ${entry.score !== undefined ? `<div class="modal-score">🌟 ${entry.score}</div>` : ""}
        ${entry.location ? `<div id="map" class="map"></div>` : ""}
    `;

    document.getElementById("modal").classList.remove("hidden");

    if (entry.location) {
        setTimeout(() => {
            const map = L.map('map').setView([entry.location.lat, entry.location.long], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
            L.marker([entry.location.lat, entry.location.long]).addTo(map);
        }, 100);
    }
}

function closeExpanded() {
    document.getElementById("modal").classList.add("hidden");
}



// Initiales Laden
loadEntries();