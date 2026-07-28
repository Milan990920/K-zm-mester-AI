// SPEC.md 4. pont, 5. szabály: POD-formátum ellenőrzés — villamos energiánál
// 33, földgáznál 16 karakter (utóbbi "39N" prefixszel). Ez SOHA nem
// blokkolhatja a mentést, mert a valós szolgáltatói minták eltérhetnek —
// ezért ez a modul csak figyelmeztetést ad vissza, nem zod-hibát.

const EXPECTED_LENGTH: Record<string, number> = {
  electricity: 33,
  gas: 16,
};

export function podFormatWarning(energyTypeCode: string, podCode: string): string | null {
  const expectedLength = EXPECTED_LENGTH[energyTypeCode];
  if (expectedLength === undefined) return null;

  const trimmed = podCode.trim();
  if (energyTypeCode === "gas" && !trimmed.startsWith("39N")) {
    return `A földgáz POD-kódok jellemzően "39N" előtaggal kezdődnek — ellenőrizd a beírt kódot.`;
  }
  if (trimmed.length !== expectedLength) {
    return `A megadott POD-kód ${trimmed.length} karakter hosszú, a szokásos hossz ${expectedLength} karakter — ellenőrizd a beírt kódot.`;
  }
  return null;
}
