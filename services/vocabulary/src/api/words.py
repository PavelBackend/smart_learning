from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Query, UploadFile

from shared.contracts.words import ImportResult, WordExport, WordInput, WordList, WordRead

from ..services.words import WordService

router = APIRouter(tags=["words"])
service = WordService()


@router.get("/words", response_model=WordList)
def list_words(
    search: str = "",
    limit: Annotated[int, Query(ge=1, le=10000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return service.list(search, limit, offset)


@router.get("/words/export", response_model=WordExport)
def export_words():
    return service.export()


@router.get("/words/{word_id}", response_model=WordRead)
def get_word(word_id: UUID):
    return service.get(word_id)


@router.post("/words", response_model=WordRead, status_code=201)
def create_word(payload: WordInput):
    return service.create(payload)


@router.put("/words/{word_id}", response_model=WordRead)
def update_word(word_id: UUID, payload: WordInput):
    return service.update(word_id, payload)


@router.delete("/words/{word_id}", status_code=204)
def delete_word(word_id: UUID):
    service.delete(word_id)


@router.post("/words/import", response_model=ImportResult)
async def import_words(file: Annotated[UploadFile, File()]):
    return service.import_file(file.filename, await file.read(2_000_001))
