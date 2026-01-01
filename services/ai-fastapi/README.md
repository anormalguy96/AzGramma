# AzGramma Local AI Service (optional)

This service is **optional** and intended for:

- Local development (faster iteration)
- Future self-hosting (your own domain / VPS)

It provides:
-*SymSpell-based Azerbaijani spell correction*

(fast, MIT-licensed) using LocalDoc-Azerbaijan's frequency dictionary

- A simple `/analyze` endpoint compatible with the web app (same request shape)

## Setup

```bash
cd services/ai-fastapi
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Download the dictionary from LocalDoc-Azerbaijan/SymSpell-Azerbaijani (the repo includes `frequency_dictionary_az_80k.txt`).
Set:

```bash
export AZGRAMMA_FREQ_DICT=/path/to/frequency_dictionary_az_80k.txt
export AZGRAMMA_USE_SYMSPELL=1
export OPENAI_API_KEY=...
```

Run:

```bash
uvicorn app.main:app --reload --port 8000
```
