# AI Meeting Notes & Summarizer

Aplikasi AI untuk mengubah file Audio/Video rekaman meeting menjadi transkrip dan ringkasan terstruktur.

## ✨ Fitur

- 🎙️ **Upload Audio/Video** - Mendukung MP3, WAV, M4A, OGG, MP4, MOV, MKV, AVI, WEBM
- 📝 **Transkripsi Otomatis** - Menggunakan OpenAI Whisper API dengan dukungan Bahasa Indonesia
- 📋 **Ringkasan Terstruktur** - Ringkasan singkat, poin penting, dan action items
- 🎬 **Ekstraksi Audio Otomatis** - Video akan dikonversi ke audio secara otomatis
- 📥 **Download Hasil** - Export hasil sebagai file TXT

## 🛠️ Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Python FastAPI |
| Media Processing | FFmpeg |
| Speech-to-Text | OpenAI Whisper API |
| Summarization | Groq API (Llama 3) |

## 📋 Prerequisites

- Python 3.9+
- Node.js 18+
- FFmpeg
- OpenAI API Key
- Groq API Key

### Install FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg
```

## 🚀 Quick Start

### 1. Clone & Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys
```

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp env.example .env.local
```

### 3. Configure API Keys

Edit `backend/.env`:

```env
OPENAI_API_KEY=sk-your-openai-api-key
GROQ_API_KEY=gsk_your-groq-api-key
```

### 4. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Open Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# With environment variables
OPENAI_API_KEY=sk-xxx GROQ_API_KEY=gsk-xxx docker-compose up --build
```

## 📁 Project Structure

```
AI Summarizer/
├── backend/
│   ├── main.py              # FastAPI app & endpoints
│   ├── config.py            # Configuration management
│   ├── validators.py        # File validation
│   ├── media_processor.py   # FFmpeg processing
│   ├── transcription.py     # Whisper API integration
│   ├── summarization.py     # Groq API integration
│   ├── cleanup.py           # Temp file cleanup
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx     # Main page
│   │   │   ├── layout.tsx   # Root layout
│   │   │   └── globals.css  # Global styles
│   │   └── components/
│   │       ├── UploadZone.tsx
│   │       ├── ProcessingStatus.tsx
│   │       └── ResultDisplay.tsx
│   ├── Dockerfile
│   └── env.example
│
├── docker-compose.yml
└── README.md
```

## 📝 API Endpoints

### `GET /health`
Health check endpoint.

### `POST /api/process`
Process audio/video file.

**Request:** `multipart/form-data` with file

**Response:**
```json
{
  "status": "success",
  "original_filename": "meeting.mp4",
  "duration_minutes": 45,
  "transcript": "...",
  "summary": {
    "ringkasan_singkat": "...",
    "poin_penting": ["..."],
    "action_items": ["..."]
  }
}
```

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for Whisper | Required |
| `GROQ_API_KEY` | Groq API key for Llama 3 | Required |
| `MAX_FILE_SIZE_MB` | Maximum upload file size | 50 |
| `TEMP_DIR` | Temporary file directory | /tmp/ai_summarizer |

## 📄 License

MIT License
