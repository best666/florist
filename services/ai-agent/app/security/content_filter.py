"""Content safety filtering for input and output."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Topics that should be blocked in input
BLOCKED_INPUT_TOPICS = [
    "政治敏感",
    "暴力内容",
    "色情内容",
    "非植物相关的医疗建议",
    "法律咨询",
]

# Output constraints enforced via system prompt (no runtime filtering needed)
OUTPUT_CONSTRAINTS = [
    "不要推荐未经科学验证的偏方",
    "不要推荐高毒性农药",
    "不要建议可能致死的极端操作",
    "不确定时明确告知用户并建议咨询专业人士",
]


class ContentFilter:
    """Content safety checker for agent input and output."""

    def check_input(self, text: str) -> tuple[bool, str]:
        """Check if input is safe. Returns (is_safe, reason)."""
        if not text or not text.strip():
            return False, "输入为空"

        # Check for off-topic redirections
        off_topic_signals = [
            ("写代码", "编程相关"),
            ("翻译", "翻译相关"),
            ("炒股", "投资相关"),
            ("法律", "法律咨询"),
        ]
        for signal, topic in off_topic_signals:
            if signal in text and len(text) < 50:
                return False, f"我是植物养护助手，不太擅长{topic}哦。有什么关于养花的问题我可以帮你？"

        return True, ""

    def check_output(self, text: str) -> bool:
        """Check if agent output looks safe. Currently just length/sanity check."""
        if not text or len(text) < 2:
            return False
        return True
