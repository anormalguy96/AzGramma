import os
import re
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
  from symspellpy.symspellpy import SymSpell, Verbosity
except Exception:  # pragma: no cover
  SymSpell = None  # type: ignore
  Verbosity = None  # type: ignore

app = FastAPI(title="AzGramma Local Service")

USE_SYMSPELL = os.getenv("AZGRAMMA_USE_SYMSPELL", "0") == "1"
FREQ_DICT = os.getenv("AZGRAMMA_FREQ_DICT")

_symspell: Optional[SymSpell] = None

def _init_symspell() -> None:
  global _symspell
  if not USE_SYMSPELL:
    return
  if SymSpell is None:
    raise RuntimeError("symspellpy not installed")
  if not FREQ_DICT or not os.path.exists(FREQ_DICT):
    raise RuntimeError(
      "Set AZGRAMMA_FREQ_DICT to the path of frequency_dictionary_az_80k.txt"
    )

  ss = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
  # The file is in `term count` format.
  if not ss.load_dictionary(FREQ_DICT, term_index=0, count_index=1):
    raise RuntimeError("Failed to load frequency dictionary")
  _symspell = ss

@app.on_event("startup")
def startup() -> None:
  if USE_SYMSPELL:
    _init_symspell()

class SpellReq(BaseModel):
  text: str

def _correct_word(word: str) -> str:
  if not _symspell:
    return word
  suggestions = _symspell.lookup(word.lower(), Verbosity.CLOSEST, max_edit_distance=2)
  if not suggestions:
    return word
  correction = suggestions[0].term
  # Preserve original case
  if word.isupper():
    return correction.upper()
  if word[0].isupper():
    return correction.capitalize()
  return correction

@app.post("/spellfix")
def spellfix(req: SpellReq):
  if not USE_SYMSPELL or not _symspell:
    raise HTTPException(status_code=400, detail="SymSpell is disabled. Set AZGRAMMA_USE_SYMSPELL=1")

  parts = re.split(r"(\W+)", req.text)
  out = []
  for part in parts:
    if not part or not part.strip() or not re.match(r"\w+", part):
      out.append(part)
      continue
    out.append(_correct_word(part))

  return {"corrected": "".join(out)}
