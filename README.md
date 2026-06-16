# BigQuery Release Intel Dashboard

A modern, high-performance web application designed to track and share official Google Cloud BigQuery release updates. The application fetches the official RSS/Atom feed, parses the payload to split daily updates into individual granular feature cards, and includes an interactive X (Twitter) Post Composer to broadcast updates directly.

---

## 🚀 Key Features

* **Granular Card Parsing**: Uses BeautifulSoup to split day entries by their sub-headings (`<h3>`), presenting each distinct update (Feature, Issue, Deprecation) as a separate card.
* **Premium Responsive UI**: Features a sleek glassmorphic dark slate theme with smooth micro-animations, loading states, and custom typography (Outfit + Inter).
* **Search & Filters**: Live searching of text across descriptions and filtering by category type (Features, Issues, Deprecations) with date sorting toggle.
* **X (Twitter) Broadcast Integration**:
  * Rich Composer Modal with live character validation (up to 280 characters).
  * Quick-insert hashtags (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`, `#GenAI`).
  * One-click copy with copy success indicator.
  * Direct Twitter Web Intent integration.
* **Caching & Error Handling**: In-memory caching on the server side to minimize external feed calls, with an automatic fallback mechanism if the GCP feed is offline.

---

## 🛠️ Technology Stack

* **Backend**: Python 3.10+, Flask
* **HTML Parsing**: BeautifulSoup4, xml.etree.ElementTree
* **HTTP Client**: Requests
* **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
* **Iconography**: FontAwesome CDN

---

## 📂 Project Structure

```text
├── app.py                 # Flask app server & XML feed parser
├── hello.txt              # Workspace welcome message
├── templates/
│   └── index.html         # Main dashboard template
└── static/
    ├── css/
    │   └── style.css      # Core styles & variables (glassmorphic dark theme)
    └── js/
        └── main.js        # Controller logic for syncing, search, & composer modal
```

---

## ⚙️ Quick Start

### 1. Installation

Clone or download the project folder, then install the required Python packages:

```bash
pip install flask requests beautifulsoup4
```

### 2. Run the Application

Start the Flask server from the root directory:

```bash
python app.py
```

The application will start on **`http://127.0.0.1:5000`**. Open this URL in any web browser to view the dashboard.

---

## 💡 How it Works

### Feed Parsing & Splitting
GCP release notes group updates for a single day under a single Atom `<entry>` in standard HTML format:
```html
<h3>Feature</h3>
<p>First update description...</p>
<h3>Issue</h3>
<p>Second update description...</p>
```
The Flask backend in `app.py` parses this feed and splits the contents on the `<h3>` headers. This converts a single entry into multiple granular update entries, enabling the frontend grid to render clean category-badge cards.

### Twitter Sharing Intent
The "Share Update" action creates a pre-populated post format inside the app's composer modal, fitting under the 280-character boundary. Clicking "Post on X" opens Twitter's web share URL:
```text
https://twitter.com/intent/tweet?text=<encoded_text>
```
This requires no API keys or developer registrations, giving you immediate broadcasting capabilities out of the box.
