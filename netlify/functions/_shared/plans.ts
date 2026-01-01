export type Plan = "free" | "plus" | "pro";

export function getMonthlyLimit(plan: Plan): number {
  switch (plan) {
    case "free":
      return 50;
    case "plus":
      return 400;
    case "pro":
      return 2000;
    default:
      return 50;
  }
}
