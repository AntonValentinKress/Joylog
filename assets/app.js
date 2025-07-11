class Header extends HTMLElement {
    // Class public field
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields
    constructor() {
        super();
        const templateContent = document
            .getElementById('joylog-header')
            .content
            .cloneNode(true);

        this.attachShadow({ mode: 'open' })
            .appendChild(templateContent);
    }

    connectedCallback() {
        console.log('Header wurde geöffnet!');
    }

    disconnectedCallback() {
        console.log('Header wird geschlossen!');
    }

}

class Footer extends HTMLElement {
    // Class public field
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields
    constructor() {
        super();
        const templateContent = document
            .getElementById('joylog-footer')
            .content
            .cloneNode(true);

        this.attachShadow({ mode: 'open' })
            .appendChild(templateContent);

        // Footer-Buttons aktivieren
        this.shadowRoot.querySelectorAll('button').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                switch (idx) {
                    case 0: loadView('joylog-feed'); break;
                    case 1: loadView('joylog-createentry'); break;
                    case 2: loadView('joylog-calendar'); break;
                    case 3: loadView('joylog-dashboard'); break;
                }
            });
        });
    }

    connectedCallback() {
        console.log('Footer wurde geöffnet!');
    }

    disconnectedCallback() {
        console.log('Footer wird geschlossen!');
    }

}

class EntryForm extends HTMLElement {
    constructor() {
        super();
        const templateContent = document
            .getElementById('joylog-createentry')
            .content
            .cloneNode(true);

        this.attachShadow({ mode: 'open' })
            .appendChild(templateContent);
    }

    connectedCallback() {
        console.log('Form wurde geöffnet!');

        // Inputs auf der Seite
        const dateInput = this.shadowRoot.querySelector('#date');
        const fileInput = this.shadowRoot.querySelector('#file');
        //const textInput = this.shadowRoot.querySelector('#textarea');
        //const scoreInput = this.shadowRoot.querySelector('#score');

        const preview = this.shadowRoot.querySelector('#preview');
        const form = this.shadowRoot.querySelector('form');

 

        // Wert des Sliders anzeigen (im Herz)
        const value = this.shadowRoot.querySelector("#value");
        const input = this.shadowRoot.querySelector("#score");
        value.textContent = input.value;
        input.addEventListener("input", (event) => {
            value.textContent = event.target.value;
        });

        //Datum automatisch auf "heute" setzen wenn noch leer
        function updateDate() {
            if (dateInput && !dateInput.value) {
                dateInput.valueAsDate = new Date(); // setzt das Datum nur, wenn noch leer
            }
        }
        updateDate()

        // Bildvorschau anzeigen
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    preview.src = reader.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.src = '';
                preview.style.display = 'none';
            }
        });

        // Bildvorschau beim Reset entfernen
        form.addEventListener('reset', () => {
            setTimeout(() => {
                preview.src = '';
                preview.style.display = 'none';
                fileInput.value = ''; // Optional, falls man erneut das gleiche Bild wählen möchte
                input.dispatchEvent(new Event("input")); // Input event auslösen, damit aktualisierungen laufen
                updateDate()
            }, 0);
        });


        form.addEventListener('submit',  (e) => {
            e.preventDefault(); // Standard-Submit verhindern  

            // Logik des Absendens von Daten
            const date = this.shadowRoot.querySelector('#date').value;
            const text = this.shadowRoot.querySelector('#textarea').value;
            const score = this.shadowRoot.querySelector('#score').value;
            const fileInput = this.shadowRoot.querySelector('#file');
            const file = fileInput.files[0];

            const storeData = async () => {
                let fileData = null;
                if (file) {
                    fileData = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                }

                const payload = {
                    date,
                    text,
                    file: fileData, // ← Jetzt ist es ein String (Base64), kein Promise
                    score,
                };

                
                await fetch('/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                    body: JSON.stringify(payload),
                });

                console.log('Daten gespeichert!')
                loadView('joylog-feed');
            };

            storeData().catch(console.error);
        });
    }

    disconnectedCallback() {
        console.log('Form wird geschlossen!');
    }

}

class FeedForm extends HTMLElement {
    constructor() {
        super();
        const templateContent = document
            .getElementById('joylog-feed')
            .content
            .cloneNode(true);

        this.attachShadow({ mode: 'open' }).appendChild(templateContent);
    }

    connectedCallback() {
        console.log('Feed wurde geöffnet!');
        this.container = this.shadowRoot.querySelector('#feed-container');
        this.offset = 0;
        this.limit = 5;
        this.loading = false;

        this.loadEntries(); // initiale Einträge laden

        // Lazy-Loading Scroll-Handler
        this.container.addEventListener('scroll', () => this.handleScroll());
    }

    disconnectedCallback() {
        console.log('Feed wird geschlossen!');
        this.container.removeEventListener('scroll', this.handleScroll);
    }

    async loadEntries() {
        if (this.loading) return;
        this.loading = true;

        try {
            const res = await fetch(`/read?offset=${this.offset}&limit=${this.limit}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            });
            const { entries } = await res.json();

            if (!entries || entries.length === 0) {
                console.log("Keine weiteren Einträge.");
                return;
            }

            entries.forEach((entry, index) => {
                const el = document.createElement('joylog-entry');
                el.data = entry;
                this.container.appendChild(el);

                // Verzögere das Setzen der Klasse 'visible' für den Fade-Effekt
                setTimeout(() => {
                    el.classList.add('visible');
                }, index * 200); // 200ms Abstand pro Eintrag (kann angepasst werden)
            });

            this.offset += this.limit;
        } catch (err) {
            console.error("Fehler beim Laden:", err);
        } finally {
            this.loading = false;
        }
    }

    handleScroll() {
        const threshold = 200; // Puffer in Pixeln
        const container = this.container;

        const scrollBottom = container.scrollTop + container.clientHeight;
        const scrollHeight = container.scrollHeight;

        if (scrollHeight - scrollBottom < threshold) {
            this.loadEntries();
        }
    }
}

class JoylogEntry extends HTMLElement {
    constructor() {
        super();
        const template = document
            .getElementById('joylog-entry')
            .content.cloneNode(true);
        this.attachShadow({ mode: 'open' }).appendChild(template);
        this._id = null; //Property für ID
    }

    set data(entry) {
        this._id = entry.id;
        this.shadowRoot.querySelector('.id').textContent = `#${entry.id.toString().padStart(4, '0')}`;
        this.shadowRoot.querySelector('.date').textContent = new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        this.shadowRoot.querySelector('.score').textContent = entry.score;
        this.shadowRoot.querySelector('.text').innerHTML = entry.text.replace(/\n/g, '<br>');;

        const img = this.shadowRoot.querySelector('.file');
        if (entry.file) {
            img.src = entry.file;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }

    connectedCallback() {
        const textElement = this.shadowRoot.querySelector('.text');
        if (textElement) {
            textElement.addEventListener('click', () => {
                textElement.classList.toggle('expanded');
            });
        }

        // Funktion pro Entry auf Basis der jeweiligen ID
        const idButton = this.shadowRoot.querySelector('.id');
        if (idButton) {
            idButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Verhindert, dass andere Handler hochgehen (optional)
                console.log(this._id); // Loggt die unformatierte ID als Zahl
            });
        }
    }
}

//Define Custom Elements
customElements.define('joylog-header', Header);
customElements.define('joylog-footer', Footer);
customElements.define('joylog-createentry', EntryForm);
customElements.define('joylog-feed', FeedForm);
customElements.define('joylog-entry', JoylogEntry);

function loadView(tagName) {
    const container = document.getElementById('content');

    // Entferne alle bisherigen Custom Elements (damit disconnectedCallback feuert)
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Erstelle das neue Custom Element und füge es hinzu
    const newElement = document.createElement(tagName);
    container.appendChild(newElement);
}

// Initiale Ansicht beim öffnen der Seite
globalThis.addEventListener('DOMContentLoaded', () => {
    loadView('joylog-feed'); // oder was du möchtest
});