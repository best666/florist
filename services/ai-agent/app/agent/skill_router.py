"""Skill detection and routing based on user intent."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

SKILLS_CONFIG = {
    "plant_care_qa": {
        "name": "plant_care_qa",
        "display": "植物养护问答",
        "description": "通用植物养护问答",
        "required_tools": ["search_plant_knowledge", "get_weather"],
        "optional_tools": ["get_user_plants", "get_care_history"],
        "model_tier": "standard",
    },
    "plant_diagnosis": {
        "name": "plant_diagnosis",
        "display": "病虫害诊断",
        "description": "植物病虫害诊断",
        "required_tools": ["diagnose_plant", "search_plant_knowledge"],
        "optional_tools": ["get_plant_detail", "get_care_history"],
        "model_tier": "complex",
    },
    "daily_advice": {
        "name": "daily_advice",
        "display": "每日养护建议",
        "description": "每日养护建议生成",
        "required_tools": ["generate_daily_advice", "get_weather", "get_user_plants"],
        "model_tier": "standard",
        "batchable": True,
    },
    "plant_analysis": {
        "name": "plant_analysis",
        "display": "全花园分析",
        "description": "全花园综合分析",
        "required_tools": ["get_user_plants", "get_plant_detail", "get_care_history", "get_weather"],
        "model_tier": "complex",
    },
    "trip_care_plan": {
        "name": "trip_care_plan",
        "display": "出差托管计划",
        "description": "出差托管养护计划",
        "required_tools": ["get_weather", "get_plant_detail"],
        "model_tier": "standard",
    },
}


class SkillRouter:
    """Detects which skill to activate based on user message content and attachments."""

    DIAGNOSIS_KEYWORDS = [
        "黄叶", "叶子黄", "枯萎", "虫", "病", "斑", "斑点", "发黄",
        "烂根", "黑腐", "白粉", "霉菌", "红蜘蛛", "蚜虫", "介壳虫",
        "掉叶", "落叶", "卷叶", "焦边", "发软", "化水", "徒长",
        "叶片发", "状态不好", "生病", "长虫", "怎么办它",
    ]

    DAILY_KEYWORDS = [
        "今天", "现在", "检查", "看看", "状态", "情况",
        "需要浇水", "该浇水", "浇水吗", "施肥吗", "今天怎么",
    ]

    TRIP_KEYWORDS = [
        "出差", "旅游", "不在家", "托管", "出门", "离家",
        "几天不在", "没人照顾", "代养", "寄养",
    ]

    ANALYSIS_KEYWORDS = [
        "全部", "所有", "花园", "整体", "总结", "概况",
        "有多少", "哪些", "盘点",
    ]

    def detect(self, message: str, attachments: list | None = None, explicit_skill: str | None = None) -> str:
        if explicit_skill and explicit_skill in SKILLS_CONFIG:
            return explicit_skill

        has_image = bool(attachments and any(a.get("type") == "image" for a in attachments))

        if has_image:
            return "plant_diagnosis"

        if any(kw in message for kw in self.DIAGNOSIS_KEYWORDS):
            return "plant_diagnosis"

        if any(kw in message for kw in self.TRIP_KEYWORDS):
            return "trip_care_plan"

        if any(kw in message for kw in self.DAILY_KEYWORDS):
            return "daily_advice"

        if any(kw in message for kw in self.ANALYSIS_KEYWORDS):
            return "plant_analysis"

        return "plant_care_qa"

    def get_skill_config(self, skill_name: str) -> dict | None:
        return SKILLS_CONFIG.get(skill_name)

    def get_required_tools(self, skill_name: str) -> list[str]:
        config = self.get_skill_config(skill_name)
        if not config:
            return []
        return config.get("required_tools", []) + config.get("optional_tools", [])
