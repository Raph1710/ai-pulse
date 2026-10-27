import json
import os
import pytest
from app.services.scoring import parse_and_validate_ai_output, score_open_answer, ALLOWED_FLAGS

_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "eval_inputs.json")
_MOCK_RESPONSES_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "mock_ai_responses.json")


def load_fixtures():
    with open(_FIXTURE_PATH) as f:
        return json.load(f)


def test_all_canned_mock_responses_validate_cleanly():
    """Verify that every single mock response in mock_ai_responses.json is handled safely."""
    with open(_MOCK_RESPONSES_PATH) as f:
        canned = json.load(f)

    for idx, raw in enumerate(canned):
        result = parse_and_validate_ai_output(raw)
        assert isinstance(result, dict), f"Failed on index {idx}: {raw}"
        assert "score" in result
        assert "reason" in result
        assert "flags" in result
        assert 1 <= result["score"] <= 5, f"Score {result['score']} out of range on index {idx}"
        assert isinstance(result["reason"], str) and len(result["reason"]) > 0
        assert isinstance(result["flags"], list)
        for flag in result["flags"]:
            assert flag in ALLOWED_FLAGS, f"Invalid flag '{flag}' not in allowed flags on index {idx}"


def test_malformed_fixture_outputs():
    fixtures = load_fixtures()
    for case in fixtures["malformed_outputs"]:
        raw = case["raw"]
        result = parse_and_validate_ai_output(raw)
        assert 1 <= result["score"] <= 5
        assert len(result["reason"]) > 0
        assert all(f in ALLOWED_FLAGS for f in result["flags"])
        if "expected_score" in case:
            assert result["score"] == case["expected_score"]
        if "expected_flags" in case:
            assert result["flags"] == case["expected_flags"]


def test_prompt_injection_and_untrusted_input_handling():
    fixtures = load_fixtures()
    for adv in fixtures["adversarial_inputs"]:
        # When evaluating an adversarial input, score_open_answer must never crash
        result = score_open_answer("Describe your AI usage.", adv["text"])
        assert isinstance(result, dict)
        assert 1 <= result["score"] <= 5
        assert all(f in ALLOWED_FLAGS for f in result["flags"])
