# MusicGen Web App - AudioXGen

Dieses Projekt ist eine Full-Stack-Webanwendung zur Generierung von Musik basierend auf Textbeschreibungen (Prompts). Es kombiniert ein modernes Next.js-Frontend mit einem leistungsstarken FastAPI-Backend, das die MusicGen-KI-Modelle nutzt.

## 🧠 KI-Modell & Technologie

Das System nutzt das **MusicGen**-Modell von Meta AI, welches speziell für die Generierung von hochwertigem Audio aus Text entwickelt wurde.

- **Verwendetes Modell:** `facebook/musicgen-large`
- **Frameworks:** PyTorch, Hugging Face Transformers, FastAPI, Next.js

## 🖥️ Hardware-Anforderungen (VRAM)

Das in diesem Projekt konfigurierte **MusicGen Large** Modell ist die leistungsfähigste Variante der MusicGen-Familie und stellt dementsprechend hohe Anforderungen an die Grafikkarte (GPU).

| Ressource | Anforderung |
| :--- | :--- |
| **GPU** | NVIDIA GPU mit CUDA-Support empfohlen |
| **VRAM (Minimum)** | **~12 GB** (für stabile Generierung) |
| **VRAM (Empfohlen)** | **16 GB+** |
| **System-RAM** | 16 GB oder mehr |

> [!IMPORTANT]
> Mit **12 GB VRAM** (z.B. RTX 3060 12GB oder RTX 4070) kann das Large-Modell betrieben werden. Bei weniger VRAM sollte in der `backend/main.py` auf `facebook/musicgen-medium` oder `facebook/musicgen-small` gewechselt werden.

## 🚀 Projektstruktur

Das Repository ist in zwei Hauptbereiche unterteilt:

### 1. Backend (`/backend`)
Ein Python-basiertes FastAPI-Backend, das:
- Das MusicGen-Modell lädt und im VRAM hält.
- Die Generierung in Segmenten durchführt (für längere Tracks).
- Audio-Nachbearbeitung wie RMS-Normalisierung, High-Pass-Filter und Crossfading anwendet.
- Einen REST-Endpunkt `/generate` bereitstellt.

### 2. Frontend (`/frontend`)
Ein modernes Next.js-Webinterface:
- Eingabemaske für Prompts, Genre und Stimmung.
- Audioplayer zur direkten Wiedergabe der generierten Musik.
- Responsives Design für verschiedene Bildschirmgrößen.

## 🛠️ Installation

### Backend
1. Navigiere in den Ordner `backend`.
2. Erstelle eine virtuelle Umgebung: `python -m venv .venv`
3. Aktiviere sie: `.venv\Scripts\activate`
4. Installiere Abhängigkeiten:
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   pip install transformers fastapi uvicorn numpy scipy pydantic
   ```
5. Starte den Server: `python main.py`

### Frontend
1. Navigiere in den Ordner `frontend`.
2. Installiere Abhängigkeiten: `npm install`
3. Starte die App: `npm run dev`

## 📝 Lizenz
Siehe [LICENSE](LICENSE) Datei für Details.
