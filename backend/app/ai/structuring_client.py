"""AI structuring step (docs/03-architektura-terv.md §3.7).

Deliberately a thin Protocol + one real implementation, so the pipeline
orchestrator and its tests depend only on the interface. Determinism is
enforced by pinning the model version and by using `temperature=0` with a
forced tool call — the model can never answer in free text.
"""

import json
from typing import Protocol

import anthropic
from google import genai
from google.genai import types as genai_types

from app.ai.schemas import ExtractedInvoiceData
from app.core.config import get_settings

# Pinned, not an alias like "latest" — see docs/03-architektura-terv.md §4
# (determinism table) for why this matters.
STRUCTURING_MODEL = "claude-sonnet-4-5"
GEMINI_STRUCTURING_MODEL = "gemini-2.0-flash"

_TOOL_NAME = "record_invoice_data"

_INVOICE_TOOL_SCHEMA = {
    "name": _TOOL_NAME,
    "description": "Rögzíti a közüzemi számlából kinyert strukturált adatokat.",
    "input_schema": ExtractedInvoiceData.model_json_schema(),
}

# Rendered once at import time, embedded as prompt text for clients (Gemini)
# that get JSON-mode output rather than a schema-constrained tool call —
# validation still happens on our side either way via ExtractedInvoiceData.
_INVOICE_JSON_SCHEMA_TEXT = json.dumps(ExtractedInvoiceData.model_json_schema(), ensure_ascii=False)


def _build_hint_block(provider_hint: str | None, invoice_type_hints: list[str]) -> str:
    hints = []
    if provider_hint:
        hints.append(f"Valószínű szolgáltató: {provider_hint}")
    if invoice_type_hints:
        joined_hints = ", ".join(invoice_type_hints)
        hints.append(f"Lehetséges számlatípus(ok) kulcsszó alapján: {joined_hints}")
    return "\n".join(hints)


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
        hint_block = _build_hint_block(provider_hint, invoice_type_hints)
        prompt = (
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


class GeminiAiStructuringClient:
    """Free-tier alternative to the Anthropic client (same Protocol), for
    deployments without an Anthropic API key. Uses plain JSON mode rather
    than Gemini's own schema-constrained decoding: `ExtractedInvoiceData`
    has nested lists and an open-ended confidence map that don't map
    cleanly onto Gemini's stricter OpenAPI-subset schema support, so the
    shape is described in the prompt instead and validated on our side —
    the orchestrator's existing retry loop already treats a validation
    failure here the same as any other structuring failure.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self._client = genai.Client(api_key=api_key or get_settings().google_api_key)

    def structure_invoice(
        self, segmented_text: str, provider_hint: str | None, invoice_type_hints: list[str]
    ) -> ExtractedInvoiceData:
        hint_block = _build_hint_block(provider_hint, invoice_type_hints)
        prompt = (
            "A következő egy magyarországi közüzemi számla szegmentált szövege. "
            "Válaszolj KIZÁRÓLAG egy darab, ennek a JSON Schemának megfelelő JSON "
            "objektummal, semmi mást ne írj a válaszba:\n\n"
            f"{_INVOICE_JSON_SCHEMA_TEXT}\n\n"
            "Csak a számlából ténylegesen kiolvasható adatokat töltsd ki. Ha egy "
            "mező nem szerepel a számlán, hagyd ki vagy írj null-t — SOHA ne "
            "találj ki vagy becsülj adatot. Minden kitöltött mezőhöz add meg a "
            "saját bizonyosságodat a field_confidence mezőben (0 és 1 között).\n\n"
            f"{hint_block}\n\n"
            "--- SZÁMLA SZÖVEGE ---\n"
            f"{segmented_text}"
        )

        response = self._client.models.generate_content(
            model=GEMINI_STRUCTURING_MODEL,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0,
                response_mime_type="application/json",
            ),
        )
        return ExtractedInvoiceData.model_validate_json(response.text)
