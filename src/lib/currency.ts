/**
 * Currency helpers for the extra-claim fee. The app supports a fixed 1-unit
 * price in the user's local currency: EUR, USD, or GBP. The price is always
 * 100 cents / 1 unit of whichever currency is detected.
 */

export type SupportedCurrency = "EUR" | "USD" | "GBP";

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["EUR", "USD", "GBP"];

export const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  { lookupKey: string; feeCents: number; stripeCode: string }
> = {
  EUR: { lookupKey: "extra_claim_eur", feeCents: 100, stripeCode: "eur" },
  USD: { lookupKey: "extra_claim_usd", feeCents: 100, stripeCode: "usd" },
  GBP: { lookupKey: "extra_claim_gbp", feeCents: 100, stripeCode: "gbp" },
};

const DEFAULT_CURRENCY: SupportedCurrency = "EUR";

export function detectCurrency(): SupportedCurrency {
  if (typeof navigator === "undefined") return DEFAULT_CURRENCY;
  const lang = navigator.language?.toLowerCase() ?? "";

  if (lang.startsWith("en-gb")) return "GBP";
  if (lang.startsWith("en-us") || lang.startsWith("en-ca") || lang.startsWith("en-au") || lang.startsWith("en-nz")) {
    return "USD";
  }

  return DEFAULT_CURRENCY;
}

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(value as SupportedCurrency);
}

export function getCurrencyConfig(currency: SupportedCurrency) {
  return CURRENCY_CONFIG[currency];
}

export function formatMoney(amountCents: number, currency: SupportedCurrency): string {
  try {
    return new Intl.NumberFormat(navigator.language ?? "en", {
      style: "currency",
      currency,
    }).format(amountCents / 100);
  } catch {
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  }
}

export const EXTRA_CLAIM_FEE_CENTS = 100;
