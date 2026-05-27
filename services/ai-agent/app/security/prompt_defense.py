"""Prompt injection detection and prevention."""

from __future__ import annotations

import logging
import re

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class InjectionRisk(BaseModel):
    score: float  # 0.0 to 1.0
    action: str  # 'allow', 'warn', 'block'
    matched_patterns: list[str]


INJECTION_PATTERNS = [
    (r"ignore\s+(all\s+)?(previous|above|prior)\s+instructions?", 0.95),
    (r"(you\s+are|you're)\s+now\s+(a\s+|an\s+)?", 0.7),
    (r"new\s+system\s+prompt", 0.95),
    (r"forget\s+(everything|all|your)", 0.9),
    (r"\bDAN\b|developer\s*mode", 0.9),
    (r"pretend\s+(to\s+be|you\s+are|that\s+you)", 0.8),
    (r"你(现在|从现在开始)(是|变成)", 0.8),
    (r"忽略(所有|之前|上面)(的)?(指令|提示|规则)", 0.95),
    (r"忘记(所有|一切|你的)", 0.9),
    (r"system\s*:\s*", 0.85),
    (r"<\|im_start\|>|<\|im_end\|>", 0.95),
    (r"\[system\]|\[assistant\]|\[user\]", 0.8),
    (r"output\s+(your\s+)?system\s+prompt", 0.95),
]

JAILBREAK_PATTERNS = [
    (r"do\s+anything\s+now", 0.85),
    (r"no\s+restrictions", 0.8),
    (r"bypass\s+(your\s+)?(rules|guidelines|restrictions|filter)", 0.9),
    (r"without\s+(any\s+)?(restrictions|limitations|filter)", 0.8),
    (r"you\s+(must|have\s+to)\s+(obey|follow)\s+me", 0.7),
]


def detect_injection(user_input: str) -> InjectionRisk:
    """Detect prompt injection attempts in user input."""
    matched = []
    max_score = 0.0

    input_lower = user_input.lower()

    all_patterns = INJECTION_PATTERNS + JAILBREAK_PATTERNS
    for pattern, score in all_patterns:
        if re.search(pattern, input_lower, re.IGNORECASE):
            matched.append(pattern)
            if score > max_score:
                max_score = score

    # Adjust score based on input length (short inputs are less likely to be injection)
    if len(user_input) < 20:
        max_score *= 0.8

    action = "allow"
    if max_score >= 0.9:
        action = "block"
    elif max_score >= 0.7:
        action = "warn"

    return InjectionRisk(score=round(max_score, 2), action=action, matched_patterns=matched)
