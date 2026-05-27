"""Plant diagnosis tool using Claude Vision for image + symptom analysis."""

from __future__ import annotations

import logging

from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)


@tool_registry.register(
    name="diagnose_plant",
    description="基于用户描述的症状和/或图片(base64 data URL)诊断植物健康问题。返回可能的病因、排查步骤和处理建议。优先做保守排查式诊断，不武断下结论。",
)
async def diagnose_plant(
    symptoms_description: str,
    plant_id: str | None = None,
    image_data_url: str | None = None,
) -> dict:
    """This tool is a pass-through — the actual vision analysis is done by the agent
    using Claude's native image understanding when an image is attached to the message.
    This tool provides a structured template for the agent to organize the diagnosis.
    """
    return {
        "message": "诊断功能已激活。请基于用户的症状描述和提供的图片(如有)进行系统排查。",
        "symptoms": symptoms_description,
        "plant_id": plant_id,
        "has_image": image_data_url is not None,
        "diagnosis_template": {
            "possible_issues": ["列出2-4个可能的病因，从最可能到次可能排列"],
            "check_first": ["优先排查的方向和具体观察要点"],
            "treatment_suggestions": ["温和的处理步骤，从物理防治开始"],
            "prevention_tips": ["后续预防建议"],
            "when_to_worry": ["什么情况下需要更专业的帮助"],
        },
    }
