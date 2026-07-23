from pydantic import BaseModel

from app.models.enums import UtilityType


class MonthlyCost(BaseModel):
    month: str  # "YYYY-MM"
    gross_amount_sum: float
    currency: str


class MonthlyConsumption(BaseModel):
    month: str  # "YYYY-MM"
    utility_type: UtilityType
    consumption_unit: str | None
    consumption_sum: float


class DashboardSummary(BaseModel):
    monthly_costs: list[MonthlyCost]
    monthly_consumption: list[MonthlyConsumption]
    yearly_total_cost: float
    yearly_total_cost_currency: str
