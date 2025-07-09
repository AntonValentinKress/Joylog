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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                console.log('Daten gespeichert!')
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
        const template = document
            .getElementById('joylog-feed')
            .content
            .cloneNode(true);

        this.attachShadow({ mode: 'open' })
            .appendChild(template);

        this.offset = 0;
        this.limit = 10;
        this.loading = false;
        this.container = null;
    }

    connectedCallback() {
        this.container = this.shadowRoot.querySelector('#feed-container');
        console.log('Feed wurde geöffnet!');
        this.loadEntries();
    }

    async loadEntries() {
        if (this.loading) return;
        this.loading = true;

        try {
            const res = await fetch(`/api/entries?offset=${this.offset}&limit=${this.limit}`);
            const { entries } = await res.json();

            entries.forEach(entry => {
                const el = document.createElement('joylog-entry');
                el.data = entry;
                this.container.appendChild(el);
            });

            this.offset += this.limit;
        } catch (err) {
            console.error("Fehler beim Laden:", err);
        } finally {
            this.loading = false;
        }
    }

    disconnectedCallback() {
        console.log('Feed wird geschlossen!');
    }
}

class JoylogEntry extends HTMLElement {
    constructor() {
        super();
        const template = document
            .getElementById('joylog-entry')
            .content.cloneNode(true);
        this.attachShadow({ mode: 'open' }).appendChild(template);
    }

    set data(entry) {
        this.shadowRoot.querySelector('.date').textContent = entry.date;
        this.shadowRoot.querySelector('.score').textContent = `Score: ${entry.score}`;
        this.shadowRoot.querySelector('.text').textContent = entry.text;

        const img = this.shadowRoot.querySelector('.file');
        if (entry.file) {
            img.src = entry.file;
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
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
    loadView('joylog-readentrys'); // oder was du möchtest
});