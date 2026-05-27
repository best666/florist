"""Memory importance scoring — determines which memories are worth long-term retention."""

from __future__ import annotations

import re

import anthropic

from app.config import settings

# Keyword-based importance signals for efficient scoring without LLM call
IMPORTANCE_SIGNALS = {
    "user_explicit_save": {
        "patterns": [r"记住", r"别忘了", r"下次提醒我", r"保存", r"记一下"],
        "score": 1.0,
    },
    "preference_indicator": {
        "patterns": [r"我喜欢", r"我习惯", r"我偏好", r"我更愿意", r"我不喜欢", r"我讨厌"],
        "score": 0.9,
    },
    "plant_critical_info": {
        "patterns": [r"死了", r"快死了", r"救活", r"长新芽", r"开花", r"换盆"],
        "score": 0.85,
    },
    "successful_solution": {
        "patterns": [r"好了", r"恢复了", r"有用", r"效果不错", r"成功了", r"改善了"],
        "score": 0.8,
    },
    "repeated_topic": {
        "patterns": [r"又是", r"又来了", r"又出现", r"还是那个", r"和上次一样"],
        "score": 0.7,
    },
    "emotional_signal": {
        "patterns": [r"好开心", r"好难过", r"担心", r"焦虑", r"惊喜"],
        "score": 0.6,
    },
    "unique_preference": {
        "patterns": [r"我家", r"我的习惯", r"我的方法", r"我都是"],
        "score": 0.75,
    },
    "routine_info": {
        "patterns": [r"今天", r"好的", r"谢谢", r"知道了"],
        "score": 0.3,
    },
}


class MemoryImportance:
    """Evaluates memory importance using keyword signals and optional LLM classification."""

    def __init__(self, client: anthropic.AsyncAnthropic | None = None) -> None:
        self._client = client

    def score_quick(self, text: str) -> float:
        """Fast keyword-based importance scoring. Returns 0.0 to 1.0."""
        text_lower = text.lower()
        max_score = 0.0

        for signal_name, signal_info in IMPORTANCE_SIGNALS.items():
            for pattern in signal_info["patterns"]:
                if re.search(pattern, text_lower):
                    if signal_info["score"] > max_score:
                        max_score = signal_info["score"]

        # Bonus for longer, more substantive text
        if len(text) > 200:
            max_score = min(max_score + 0.1, 1.0)
        if len(text) < 20:
            max_score = max_score * 0.5

        return max_score

    async def score_llm(self, text: str) -> float:
        """Use LLM for more accurate importance scoring (higher cost, use sparingly)."""
        if not self._client:
            return 0.5

        try:
            response = await self._client.messages.create(
                model=settings.anthropic_simple_model,
                max_tokens=50,
                temperature=0,
                system="你是一个记忆重要性评估器。评估以下内容对长期记忆的重要性，只输出 0.0 到 1.0 之间的数字。",
                messages=[{"role": "user", "content": text[:2000]}],
            )
            text_block = next(b for b in response.content if b.type == "text")
            score_str = text_block.text.strip()
            score = float(score_str)
            return max(0.0, min(1.0, score))
        except Exception:
            return 0.5
