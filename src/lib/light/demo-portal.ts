/** Demo-only trip codes for the seeded program. Reset them in Admin. */
export const DEMO_VIP_CODE = "VIP7K2";
export const DEMO_MANAGER_CODE = "MGR4Q8";
export const DEMO_GUEST_PASSES = [
  { first: "Colleen", last: "Sands", code: "482913", group: "VIP" },
  { first: "Daniel", last: "Fox", code: "619204", group: "Managers" },
] as const;
