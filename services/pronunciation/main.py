import json
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from .schemas import AudioRecord, AudioSource

app = FastAPI(title="Pronunciation service")
DATA = Path("/data")


def entry(word_id: UUID) -> AudioRecord:
    index_path = DATA / "index.json"
    if not index_path.exists():
        raise HTTPException(404, "No recording")
    record = json.loads(index_path.read_text(encoding="utf-8")).get(str(word_id))
    if not record:
        raise HTTPException(404, "No recording")
    return AudioRecord.model_validate(record)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/pronunciation/{word_id}")
def pronunciation(word_id: UUID) -> FileResponse:
    try:
        record = entry(word_id)
        filename = record.filename
        path = DATA / filename
        if path.is_file():
            return FileResponse(
                path, media_type=record.mime_type, headers={"Cache-Control": "public, max-age=86400"}
            )
    except HTTPException:
        pass
    generated = DATA / f"{word_id}.wav"
    if generated.is_file():
        return FileResponse(
            generated, media_type="audio/wav", headers={"Cache-Control": "public, max-age=86400"}
        )
    raise HTTPException(404, "No recording")


@app.get("/pronunciation/{word_id}/source", response_model=AudioSource)
def source(word_id: UUID) -> AudioSource:
    record = entry(word_id)
    return AudioSource(
        word=record.word,
        source=record.source,
        license=record.license,
        license_url=record.license_url,
        artist=record.artist,
    )
