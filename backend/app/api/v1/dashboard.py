from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_tenant_db
from app.models.invoice import Invoice
from app.schemas.dashboard import DashboardSummary, MonthlyConsumption, MonthlyCost

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ROLLING_WINDOW_MONTHS = 12


def _rolling_window_start(today: date, months: int) -> date:
    total_months = today.year * 12 + (today.month - 1) - (months - 1)
    year, month = divmod(total_months, 12)
    return date(year, month + 1, 1)


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
) -> DashboardSummary:
    today = date.today()
    window_start = _rolling_window_start(today, ROLLING_WINDOW_MONTHS)
    month_key = func.to_char(Invoice.invoice_date, "YYYY-MM")

    base_filter = [
        Invoice.tenant_id == current_user.tenant_id,
        Invoice.deleted_at.is_(None),
        Invoice.invoice_date.is_not(None),
        Invoice.invoice_date >= window_start,
    ]

    cost_rows = db.execute(
        select(month_key.label("month"), Invoice.currency, func.sum(Invoice.gross_amount))
        .where(*base_filter, Invoice.gross_amount.is_not(None))
        .group_by("month", Invoice.currency)
        .order_by("month")
    ).all()
    monthly_costs = [
        MonthlyCost(month=month, currency=currency, gross_amount_sum=float(total))
        for month, currency, total in cost_rows
    ]

    consumption_rows = db.execute(
        select(
            month_key.label("month"),
            Invoice.utility_type,
            Invoice.consumption_unit,
            func.sum(Invoice.consumption_value),
        )
        .where(*base_filter, Invoice.consumption_value.is_not(None))
        .group_by("month", Invoice.utility_type, Invoice.consumption_unit)
        .order_by("month")
    ).all()
    monthly_consumption = [
        MonthlyConsumption(
            month=month,
            utility_type=utility_type,
            consumption_unit=consumption_unit,
            consumption_sum=float(total),
        )
        for month, utility_type, consumption_unit, total in consumption_rows
    ]

    yearly_row = db.execute(
        select(Invoice.currency, func.sum(Invoice.gross_amount))
        .where(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.deleted_at.is_(None),
            Invoice.gross_amount.is_not(None),
            func.extract("year", Invoice.invoice_date) == today.year,
        )
        .group_by(Invoice.currency)
        .order_by(func.sum(Invoice.gross_amount).desc())
        .limit(1)
    ).first()
    yearly_total_cost = float(yearly_row[1]) if yearly_row else 0.0
    yearly_total_cost_currency = yearly_row[0] if yearly_row else "HUF"

    return DashboardSummary(
        monthly_costs=monthly_costs,
        monthly_consumption=monthly_consumption,
        yearly_total_cost=yearly_total_cost,
        yearly_total_cost_currency=yearly_total_cost_currency,
    )
