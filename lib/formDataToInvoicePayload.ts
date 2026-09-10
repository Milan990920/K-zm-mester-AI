// A böngésző FormData mindent stringként küld — az üres opcionális mezőket
// null-lá kell alakítani mentés előtt, különben pl. z.coerce.date("") egy
// érvénytelen dátumot adna vissza "üres" helyett, és a boolean mezőket is
// kézzel kell értelmezni, mert a z.coerce.boolean() minden nem-üres
// stringet (akár "false"-t is) igazra alakítana.
export function formDataToInvoicePayload(formData: FormData): Record<string, unknown> {
  const get = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value : null;
  };

  return {
    customerId: get("customerId"),
    consumptionSiteId: get("consumptionSiteId"),
    measurementPointId: get("measurementPointId"),
    energyTypeId: get("energyTypeId"),
    providerName: get("providerName"),
    invoiceNumber: get("invoiceNumber"),
    issueDate: get("issueDate"),
    periodStart: get("periodStart"),
    periodEnd: get("periodEnd"),
    dueDate: get("dueDate"),
    quantity: get("quantity"),
    unitId: get("unitId"),
    meterSerialNumber: get("meterSerialNumber"),
    netAmount: get("netAmount"),
    vatRate: get("vatRate"),
    vatAmount: get("vatAmount"),
    grossAmount: get("grossAmount"),
    currency: get("currency") ?? "HUF",
    unitPrice: get("unitPrice"),
    invoiceType: get("invoiceType"),
    paymentStatus: get("paymentStatus") ?? "OPEN",
    sourceType: get("attachmentPath") || formData.get("file") ? "PDF_UPLOAD" : "MANUAL",
    recordedBy: get("recordedBy"),
    isDraft: formData.get("isDraft") === "true",
  };
}
