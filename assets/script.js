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

async function loadEntries() {
    if (loading || allLoaded) return;
    loading = true;

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

// Initiales Laden
loadEntries();