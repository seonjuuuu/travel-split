/**
 * 외화 → 원화(KRW) 환율 변환.
 * open.er-api.com은 키 없이 쓸 수 있는 무료 공개 API이며 하루 1회만 갱신되므로,
 * 매 지출 저장마다 호출하지 않도록 인메모리에 통화별로 캐싱한다.
 */

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12시간

interface CacheEntry {
  rate: number;
  fetchedAt: number;
}

const rateCache = new Map<string, CacheEntry>();

async function fetchRateFromApi(currencyCode: string): Promise<number> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${currencyCode}`);
  if (!res.ok) {
    throw new Error(`환율 API 응답 오류: ${res.status}`);
  }
  const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
  const rate = data.rates?.KRW;
  if (data.result !== "success" || typeof rate !== "number") {
    throw new Error(`환율 API 응답에 KRW 환율이 없습니다 (currency=${currencyCode})`);
  }
  return rate;
}

/** currencyCode 1단위 = 몇 원(KRW)인지 반환 */
export async function getExchangeRateToKrw(currencyCode: string): Promise<number> {
  if (currencyCode === "KRW") return 1;

  const cached = rateCache.get(currencyCode);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const rate = await fetchRateFromApi(currencyCode);
    rateCache.set(currencyCode, { rate, fetchedAt: Date.now() });
    return rate;
  } catch (err) {
    if (cached) {
      console.warn(
        `[fx] ${currencyCode} 환율 갱신 실패, 캐시된 값(${cached.rate})으로 폴백:`,
        err
      );
      return cached.rate;
    }
    throw err;
  }
}

export interface ConvertedAmount {
  amount: number; // 원화 환산 금액 (반올림)
  originalAmount: number; // 사용자가 입력한 원래 통화 금액
  exchangeRate: number; // 적용된 환율 (KRW면 1)
}

export function convertToKrw(
  amount: number,
  currency: string,
  rate: number
): ConvertedAmount {
  return {
    amount: currency === "KRW" ? Math.round(amount) : Math.round(amount * rate),
    originalAmount: amount,
    exchangeRate: rate,
  };
}
