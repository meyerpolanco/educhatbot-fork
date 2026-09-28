# Education Policy Research Chatbot

A RAG (Retrieval-Augmented Generation) chatbot designed to help researchers and policy creators analyze education policy documents.

## Getting Started Locally

The chatbot runs locally with Python, Node.js, Ollama, and a persistent Chroma database.

### 1. Install and prepare Ollama

Install [Ollama](https://ollama.com), start it, and download the two models:

```bash
ollama pull nomic-embed-text
ollama pull qwen3:8b
```

### 2. Install dependencies

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd frontend && npm ci && cd ..
```

### 3. Build the local document index

Run this once, and again whenever the PDFs change:

```bash
.venv/bin/python src/ingest.py
```

### 4. Run the application

Start the backend:

```bash
.venv/bin/python UI.py
```

In another terminal, start the frontend:

```bash
cd frontend
npm run dev
```

The backend is available at `http://localhost:7860` and the frontend at `http://localhost:5173`.

## Project Structure

- `UI.py`: Flask backend providing the `/chat` and `/health` endpoints.
- `src/query.py`: Core RAG logic using LangChain, Ollama, and Chroma.
- `src/ingest.py`: Script to process PDFs from the `docs/` folder into the vector database.
- `frontend/`: Vite + React application for the user interface.

## Ingesting Documents

If the database is empty or you've added new PDFs to the `docs/` folder, run:

```bash
.venv/bin/python src/ingest.py
```
