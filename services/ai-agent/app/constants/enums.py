"""Mirror of the existing contracts enums from @florist/contracts."""

from enum import StrEnum


class FlowerCategory(StrEnum):
    SUCCULENT = "succulent"
    HERBACEOUS = "herbaceous"
    WOODY = "woody"
    HYDROPONIC = "hydroponic"
    VINE = "vine"


class FlowerPlacement(StrEnum):
    INDOOR_BALCONY = "indoor_balcony"
    OUTDOOR_OPEN_AIR = "outdoor_open_air"
    INDOOR_SHADE = "indoor_shade"


class FlowerCareDifficulty(StrEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class FlowerHealthStatus(StrEnum):
    WATERING_NEEDED = "watering-needed"
    HEALTHY = "healthy"
    DORMANT = "dormant"
    FERTILIZING_NEEDED = "fertilizing-needed"


class RecordActionType(StrEnum):
    WATERING = "watering"
    FERTILIZING = "fertilizing"
    PRUNING = "pruning"
    REPOTTING = "repotting"
    PEST_CONTROL = "pest_control"
    LEAF_CLEANING = "leaf_cleaning"
    LIGHT_ADJUSTMENT = "light_adjustment"


class WeatherCondition(StrEnum):
    SUNNY = "sunny"
    CLOUDY = "cloudy"
    OVERCAST = "overcast"
    RAINY = "rainy"
    STORM = "storm"
    SNOW = "snow"
    FOGGY = "foggy"
    HAZY = "hazy"


ACTION_LABELS: dict[RecordActionType, str] = {
    RecordActionType.WATERING: "浇水",
    RecordActionType.FERTILIZING: "施肥",
    RecordActionType.PRUNING: "修剪",
    RecordActionType.REPOTTING: "换盆",
    RecordActionType.PEST_CONTROL: "除虫",
    RecordActionType.LEAF_CLEANING: "擦叶",
    RecordActionType.LIGHT_ADJUSTMENT: "调整光照",
}

CATEGORY_LABELS: dict[FlowerCategory, str] = {
    FlowerCategory.SUCCULENT: "多肉",
    FlowerCategory.HERBACEOUS: "草本",
    FlowerCategory.WOODY: "木本",
    FlowerCategory.HYDROPONIC: "水培",
    FlowerCategory.VINE: "藤蔓",
}

PLACEMENT_LABELS: dict[FlowerPlacement, str] = {
    FlowerPlacement.INDOOR_BALCONY: "室内阳台",
    FlowerPlacement.OUTDOOR_OPEN_AIR: "户外露天",
    FlowerPlacement.INDOOR_SHADE: "室内阴面",
}
