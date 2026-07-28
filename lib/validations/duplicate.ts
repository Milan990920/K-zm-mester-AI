// SPEC.md 4. pont, 4. szabály: duplikátum-FIGYELMEZTETÉS, nem kemény tiltás —
// ezért ez sima függvény, nem zod-refine (a zod hiba blokkolná a mentést).
// A hívó (API route) lekérdezi az azonos mérési ponthoz és szolgáltatóhoz
// tartozó meglévő számlákat, és ezt a listát adja át — ez a modul maga nem
// tud az adatbázisról, így önmagában tesztelhető.

export interface ExistingInvoiceRef {
  id: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface DuplicateCandidate {
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
}

export function findDuplicateWarnings(
  candidate: DuplicateCandidate,
  existingForSameMeteringPointAndProvider: ExistingInvoiceRef[],
): string[] {
  const warnings: string[] = [];

  const sameNumber = existingForSameMeteringPointAndProvider.find(
    (invoice) => invoice.invoiceNumber === candidate.invoiceNumber,
  );
  if (sameNumber) {
    warnings.push(
      `Már létezik számla ugyanezzel a számlaszámmal ("${candidate.invoiceNumber}") ehhez a mérési ponthoz és szolgáltatóhoz.`,
    );
  }

  const overlapping = existingForSameMeteringPointAndProvider.filter(
    (invoice) => invoice.periodStart < candidate.periodEnd && candidate.periodStart < invoice.periodEnd,
  );
  if (overlapping.length > 0) {
    warnings.push(
      `A megadott számlázási időszak átfedésben van ${overlapping.length} másik, ehhez a mérési ponthoz és szolgáltatóhoz tartozó számlával.`,
    );
  }

  return warnings;
}
