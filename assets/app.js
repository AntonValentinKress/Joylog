import { GlobalStore } from './dataStore.js'; // <– ganz oben importieren

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
                    case 0: loadView('joylog-readentrys'); break;
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
    // Class public field
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields
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

        const value = this.shadowRoot.querySelector("#value");
        const input = this.shadowRoot.querySelector("#score");
        value.textContent = input.value;
        input.addEventListener("input", (event) => {
            value.textContent = event.target.value;
        });

        //Datum automatisch auf "heute" setzen
        const dateInput = this.shadowRoot.querySelector('input[type="date"]');
        if (dateInput && !dateInput.value) {
            dateInput.valueAsDate = new Date(); // setzt das Datum nur, wenn noch leer
        }

        // Referenzen
        const fileInput = this.shadowRoot.querySelector('#file');
        const preview = this.shadowRoot.querySelector('#preview');
        const form = this.shadowRoot.querySelector('form');

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
            // Timeout notwendig, weil der Reset sofort zurücksetzt und wir danach verstecken müssen
            setTimeout(() => {
                preview.src = '';
                preview.style.display = 'none';
                fileInput.value = ''; // Optional, falls man erneut das gleiche Bild wählen möchte
            }, 0);
        });


        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Standard-Submit verhindern

            const date = this.shadowRoot.querySelector('#date').value;
            const text = this.shadowRoot.querySelector('#textarea').value;
            const fileInput = this.shadowRoot.querySelector('#file');
            const file = fileInput.files[0];

            // Datei als Base64 lesen (optional, nur wenn Bild enthalten)
            let fileData = null;
            if (file) {
                fileData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file); // Ergebnis: "data:image/jpeg;base64,..."
                });
            }

            // JSON-Payload
            const payload = {
                date,
                text,
                file: fileData, // kann auch null sein
            };

            try {
                const response = await fetch(`${globalThis.location.origin.replace(/:\d+$/, ':8000')}/submit`,  {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                const result = await response.json();
                console.log('Antwort vom Server:', result);
            } catch (err) {
                console.error('Fehler beim Senden:', err);
            }
        });


    }

    disconnectedCallback() {
        console.log('Form wird geschlossen!');

        const date = this.shadowRoot.querySelector('#date').value;
        const text = this.shadowRoot.querySelector('#textarea').value;
        const fileInput = this.shadowRoot.querySelector('#file');
        const file = fileInput.files[0];

        let fileData = null;
        if (file) {
            fileData = new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        const payload = {
            date,
            text,
            file: fileData,
        };

        // 🟢 Global speichern
        GlobalStore.set('entryData', payload);

        // ⬇️ Optional: Logging
        console.log('Daten im GlobalStore:', GlobalStore.get('entryData'));

    }

}

//Define Custom Elements
customElements.define('joylog-header', Header);
customElements.define('joylog-footer', Footer);
customElements.define('joylog-createentry', EntryForm)

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


globalThis.addEventListener('DOMContentLoaded', () => {
    loadView('joylog-readentrys'); // oder was du möchtest
});