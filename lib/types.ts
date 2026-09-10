// A számlaszűrés és a dashboard ugyanazt a beágyazott ügyfél-alakzatot
// fogyasztja — innen importálja mindkettő.
export interface EnergyType {
  id: string;
  code: string;
  name: string;
}

export interface MeasurementPoint {
  id: string;
  podCode: string;
  providerName: string | null;
  measurementType: "TIME_SERIES" | "PROFILE";
  status: "ACTIVE" | "INACTIVE";
  energyType: EnergyType;
}

export interface ConsumptionSite {
  id: string;
  name: string;
  address: string | null;
  category: "BUILDING" | "ACTIVITY" | "TRANSPORT";
  measurementPoints: MeasurementPoint[];
}

export interface CustomerDetail {
  id: string;
  name: string;
  consumptionSites: ConsumptionSite[];
}
