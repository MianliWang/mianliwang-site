# PDF Translate Service (FastAPI)

Independent backend service for PDF translation via BabelDOC.  
This service is intentionally decoupled from Next.js and can be developed/deployed separately.

## API contract

- Runtime docs: `http://localhost:8080/docs`
- OpenAPI JSON: `http://localhost:8080/openapi.json`
- Static schema (for frontend/backend contract review): `./openapi.yaml`

### `POST /translate/pdf`

- `multipart/form-data`
- fields:
  - `file` (required): PDF binary
  - `source_lang` (optional, default `auto`)
  - `target_lang` (required, e.g. `en`, `zh`, `ja`)
  - `output_mode` (optional, default `bilingual`)
    - `translated`: translated-only PDF
    - `bilingual`: dual-language PDF
- success: `application/pdf` (downloadable translated file)
- errors: JSON `{ ok: false, error, detail? }`

## Local run (without Docker)

```bash
cd services/pdf-translate-api
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

## Local run (Docker Compose)

```bash
copy services\pdf-translate-api\.env.example services\pdf-translate-api\.env
docker compose -f docker-compose.translate.yml up --build
```

## Notes

- Minimal abuse protection is in-memory rate limiting.
- BabelDOC binary is invoked via subprocess (`BABELDOC_BIN`, default `babeldoc`).
- Keep this service independent from web frontend runtime and release cadence.
