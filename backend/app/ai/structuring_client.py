"""AI structuring step (docs/03-architektura-terv.md §3.7).

Deliberately a thin Protocol + one real implementation, so the pipeline
orchestrator and its tests depend only on the interface. Determinism is
enforced by pinning the model version and by using `temperature=0` with a
forced tool call — the model can never answer in free text.
"""

from typing import Protocol

import anthropic

from app.ai.schemas import ExtractedInvoiceData
from app.core.config import get_settings

# Pinned, not an alias like "latest" — see docs/03-architektura-terv.md §4
# (determinism table) for why this matters.
STRUCTURING_MODEL = "claude-sonnet-4-5"

_TOOL_NAME = "record_invoice_data"

_INVOICE_TOOL_SCHEMA = {
    "name": _TOOL_NAME,
    "description": "Rögzíti a közüzemi számlából kinyert strukturált adatokat.",
    "input_schema": ExtractedInvoiceData.model_json_schema(),
}


class AiStructuringClient(Protocol):
    def structure_invoice(
        self, segmented_text: str, provider_hint: str | None, invoice_type_hints: list[str]
    ) -> ExtractedInvoiceData: ...


class AnthropicAiStructuringClient:
    def __init__(self, api_key: str | None = None) -> None:
        self._client = anthropic.Anthropic(api_key=api_key or get_settings().anthropic_api_key)

    def structure_invoice(
        self, segmented_text: str, provider_hint: str | None, invoice_type_hints: list[str]
    ) -> ExtractedInvoiceData:
        prompt = self._build_prompt(segmented_text, provider_hint, invoice_type_hints)

        response = self._client.messages.create(
            model=STRUCTURING_MODEL,
            max_tokens=4096,
            temperature=0,
            tools=[_INVOICE_TOOL_SCHEMA],
            tool_choice={"type": "tool", "name": _TOOL_NAME},
            messages=[{"role": "user", "content": prompt}],
        )

        tool_use_block = next(block for block in response.content if block.type == "tool_use")
        return ExtractedInvoiceData.model_validate(tool_use_block.input)

    @staticmethod
    def _build_prompt(
        segmented_text: str, provider_hint: str | None, invoice_type_hints: list[str]
    ) -> str:
        hints = []
        if provider_hint:
            hints.append(f"Valószínű szolgáltató: {provider_hint}")
        if invoice_type_hints:
            joined_hints = ", ".join(invoice_type_hints)
            hints.append(f"Lehetséges számlatípus(ok) kulcsszó alapján: {joined_hints}")
        hint_block = "\n".join(hints)

        return (
            "A következő egy magyarországi közüzemi számla szegmentált szövege. "
            "Töltsd ki a record_invoice_data eszközt a számlából ténylegesen "
            "kiolvasható adatokkal. Ha egy mező nem szerepel a számlán, hagyd "
            "üresen — SOHA ne találj ki vagy becsülj adatot. Minden kitöltött "
            "mezőhöz add meg a saját bizonyosságodat (field_confidence, 0 és 1 "
            "között).\n\n"
            f"{hint_block}\n\n"
            "--- SZÁMLA SZÖVEGE ---\n"
            f"{segmented_text}"
        )
