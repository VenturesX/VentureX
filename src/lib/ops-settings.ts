import { db } from "@/lib/db";
import {
  SETTINGS_KEYS,
  parseDriveTable,
  parseFleet,
  parseQuickAnswers,
  parseRateCard,
  parseTiming,
  resolveHours,
  resolvePhone,
  phoneToTel,
  formatOfficeHours,
  isLiveLineOpen,
  type DrivePair,
  type FleetVehicle,
  type OfficeHours,
  type QuickAnswer,
  type RateCardRow,
  type TimingSettings,
} from "@/lib/guidance";

export type LoadedGuidance = {
  fleet: FleetVehicle[];
  driveTable: DrivePair[];
  timing: TimingSettings;
  expertPhone: string;
  expertTel: string;
  officeHours: OfficeHours | null;
  hoursLabel: string;
  lineOpen: boolean | null;
  defaultDirectLine: string;
  defaultDirectTel: string;
  rates: RateCardRow[];
  quickAnswers: QuickAnswer[];
  coachUsable: number;
};

export async function loadGuidance(): Promise<LoadedGuidance> {
  const rows = await db.appSetting.findMany({
    where: { key: { in: Object.values(SETTINGS_KEYS) } },
  });
  const value = (key: string) => rows.find((row) => row.key === key)?.value;
  const expertPhone = resolvePhone(value(SETTINGS_KEYS.expertPhone));
  const officeHours = resolveHours(value(SETTINGS_KEYS.officeHours));
  const defaultDirectLine = resolvePhone(value(SETTINGS_KEYS.defaultDirectLine));
  const fleet = parseFleet(value(SETTINGS_KEYS.fleet));
  return {
    fleet,
    driveTable: parseDriveTable(value(SETTINGS_KEYS.driveTable)),
    timing: parseTiming(value(SETTINGS_KEYS.loopTiming)),
    expertPhone,
    expertTel: expertPhone ? phoneToTel(expertPhone) : "",
    officeHours,
    hoursLabel: officeHours ? formatOfficeHours(officeHours) : "",
    lineOpen: isLiveLineOpen(officeHours),
    defaultDirectLine,
    defaultDirectTel: defaultDirectLine ? phoneToTel(defaultDirectLine) : "",
    rates: parseRateCard(value(SETTINGS_KEYS.rateCard)),
    quickAnswers: parseQuickAnswers(value(SETTINGS_KEYS.quickAnswers)),
    coachUsable: fleet.find((row) => row.id === "COACH")?.usable ?? 50,
  };
}

export async function directLineForEvent(eventPhone: string | null | undefined) {
  if (eventPhone?.trim()) return { phone: resolvePhone(eventPhone), tel: phoneToTel(eventPhone) };
  const guidance = await loadGuidance();
  return { phone: guidance.defaultDirectLine, tel: guidance.defaultDirectTel };
}
