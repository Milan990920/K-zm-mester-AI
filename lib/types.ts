// A számlaszűrés (5.2/5.3 pont) és a dashboard (5.4 pont) ugyanazt a
// beágyazott ügyfél-alakzatot fogyasztja — innen importálja mindkettő.
export interface EnergyType {
  id: string;
  code: string;
  name: string;
}

export interface MeteringPoint {
  id: string;
  podCode: string;
  providerName: string | null;
  energyType: EnergyType;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  meteringPoints: MeteringPoint[];
}

export interface CustomerDetail {
  id: string;
  name: string;
  sites: Site[];
}
