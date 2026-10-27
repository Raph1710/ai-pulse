import json
import re
from . import llm

ALLOWED_FLAGS = {
    "customer_data_shared",
    "confidential_data_shared",
    "unreviewed_output",
    "policy_unaware",
}

NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
}

FALLBACK_RESULT = {
    "score": 3,
    "reason": "Automated evaluation fallback applied.",
    "flags": [],
}


def _clean_markdown(raw: str) -> str:
    """Strips markdown code blocks like ```json ... ``` from model output."""
    raw = raw.strip()
    if raw.startswith("```"):
        # Strip leading ```json or ```
        lines = raw.split("\n")
        if len(lines) >= 2 and lines[-1].strip() == "```":
            return "\n".join(lines[1:-1]).strip()
    return raw


def parse_and_validate_ai_output(raw: str) -> dict:
    """Safely extracts, validates, and normalizes LLM evaluation output."""
    if not raw or not isinstance(raw, str):
        return dict(FALLBACK_RESULT)

    cleaned = _clean_markdown(raw)

    data = None
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: attempt regex extraction of the first {...} block
        match = re.search(r"\{.*?\}", cleaned, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

    if not isinstance(data, dict):
        return dict(FALLBACK_RESULT)

    # 1. Parse and clamp score to 1-5
    raw_score = data.get("score")
    score = 3
    if isinstance(raw_score, (int, float)):
        score = int(round(raw_score))
    elif isinstance(raw_score, str):
        raw_score_str = raw_score.strip().lower()
        if raw_score_str in NUMBER_WORDS:
            score = NUMBER_WORDS[raw_score_str]
        else:
            try:
                score = int(round(float(raw_score_str)))
            except ValueError:
                score = 3

    # Strictly clamp between 1 and 5
    score = max(1, min(5, score))

    # 2. Validate reason string
    raw_reason = data.get("reason")
    if isinstance(raw_reason, str) and raw_reason.strip():
        reason = raw_reason.strip()[:300]
    else:
        reason = "Assessed employee AI usage."

    # 3. Filter flags strictly to ALLOWED_FLAGS
    raw_flags = data.get("flags")
    flags = []
    if isinstance(raw_flags, list):
        for f in raw_flags:
            if isinstance(f, str) and f in ALLOWED_FLAGS and f not in flags:
                flags.append(f)

    return {
        "score": score,
        "reason": reason,
        "flags": flags,
    }


def score_open_answer(question_text: str, answer: str) -> dict:
    # Limit answer length to prevent prompt bloat and resource exhaustion
    sanitized_answer = (answer or "").strip()[:1000]
    try:
        raw = llm.score_answer(question_text, sanitized_answer)
        return parse_and_validate_ai_output(raw)
    except Exception:
        return dict(FALLBACK_RESULT)
