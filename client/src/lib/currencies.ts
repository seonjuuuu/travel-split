// 여행 통화 목록

export interface Currency {
  code: string;
  symbol: string;
  country: string; // 국가명 - 검색용 표시 라벨
}

// 국내여행 - 원화만 쓰는 경우
export const DOMESTIC_CURRENCY: Currency = { code: "KRW", symbol: "₩", country: "국내여행" };

// 국가 기준 통화 목록 - 여행 만들기/설정에서 검색해서 고르는 용도 (같은 통화를 여러 나라가 공유하는 경우도 있음, 예: 유로)
export const COUNTRY_CURRENCIES: Currency[] = [
  { code: "JPY", symbol: "¥", country: "일본" },
  { code: "USD", symbol: "$", country: "미국" },
  { code: "USD", symbol: "$", country: "괌·사이판" },
  { code: "EUR", symbol: "€", country: "프랑스" },
  { code: "EUR", symbol: "€", country: "독일" },
  { code: "EUR", symbol: "€", country: "이탈리아" },
  { code: "EUR", symbol: "€", country: "스페인" },
  { code: "EUR", symbol: "€", country: "네덜란드" },
  { code: "EUR", symbol: "€", country: "포르투갈" },
  { code: "EUR", symbol: "€", country: "그리스" },
  { code: "EUR", symbol: "€", country: "크로아티아" },
  { code: "EUR", symbol: "€", country: "오스트리아" },
  { code: "GBP", symbol: "£", country: "영국" },
  { code: "CHF", symbol: "CHF", country: "스위스" },
  { code: "SEK", symbol: "kr", country: "스웨덴" },
  { code: "NOK", symbol: "kr", country: "노르웨이" },
  { code: "DKK", symbol: "kr", country: "덴마크" },
  { code: "ISK", symbol: "kr", country: "아이슬란드" },
  { code: "PLN", symbol: "zł", country: "폴란드" },
  { code: "CZK", symbol: "Kč", country: "체코" },
  { code: "HUF", symbol: "Ft", country: "헝가리" },
  { code: "TRY", symbol: "₺", country: "튀르키예" },
  { code: "RUB", symbol: "₽", country: "러시아" },
  { code: "GEL", symbol: "₾", country: "조지아" },
  { code: "CNY", symbol: "¥", country: "중국" },
  { code: "TWD", symbol: "NT$", country: "대만" },
  { code: "HKD", symbol: "HK$", country: "홍콩" },
  { code: "MOP", symbol: "MOP$", country: "마카오" },
  { code: "THB", symbol: "฿", country: "태국" },
  { code: "VND", symbol: "₫", country: "베트남" },
  { code: "PHP", symbol: "₱", country: "필리핀" },
  { code: "SGD", symbol: "S$", country: "싱가포르" },
  { code: "MYR", symbol: "RM", country: "말레이시아" },
  { code: "IDR", symbol: "Rp", country: "인도네시아" },
  { code: "KHR", symbol: "៛", country: "캄보디아" },
  { code: "LAK", symbol: "₭", country: "라오스" },
  { code: "MMK", symbol: "K", country: "미얀마" },
  { code: "INR", symbol: "₹", country: "인도" },
  { code: "NPR", symbol: "Rs", country: "네팔" },
  { code: "LKR", symbol: "Rs", country: "스리랑카" },
  { code: "MVR", symbol: "Rf", country: "몰디브" },
  { code: "MNT", symbol: "₮", country: "몽골" },
  { code: "AUD", symbol: "A$", country: "호주" },
  { code: "NZD", symbol: "NZ$", country: "뉴질랜드" },
  { code: "FJD", symbol: "FJ$", country: "피지" },
  { code: "CAD", symbol: "C$", country: "캐나다" },
  { code: "MXN", symbol: "MX$", country: "멕시코" },
  { code: "BRL", symbol: "R$", country: "브라질" },
  { code: "ARS", symbol: "AR$", country: "아르헨티나" },
  { code: "CLP", symbol: "CL$", country: "칠레" },
  { code: "PEN", symbol: "S/", country: "페루" },
  { code: "COP", symbol: "CO$", country: "콜롬비아" },
  { code: "AED", symbol: "AED", country: "아랍에미리트" },
  { code: "QAR", symbol: "QR", country: "카타르" },
  { code: "SAR", symbol: "SR", country: "사우디아라비아" },
  { code: "ILS", symbol: "₪", country: "이스라엘" },
  { code: "JOD", symbol: "JD", country: "요르단" },
  { code: "EGP", symbol: "E£", country: "이집트" },
  { code: "MAD", symbol: "MAD", country: "모로코" },
  { code: "ZAR", symbol: "R", country: "남아프리카공화국" },
  { code: "KES", symbol: "KSh", country: "케냐" },
];

// 지출 추가 모달의 빠른 통화 칩 - 자주 쓰는 통화 위주 부분집합 (COUNTRY_CURRENCIES에서 발췌)
const QUICK_CODES = [
  "JPY", "USD", "EUR", "CNY", "TWD", "THB", "VND", "PHP", "SGD", "HKD", "GBP", "AUD",
];
export const CURRENCIES: Currency[] = QUICK_CODES.map(
  (code) => COUNTRY_CURRENCIES.find((c) => c.code === code)!
);

// 여행 만들기/설정 - 국가 검색으로 고르는 전체 목록 (국내여행 옵션 포함)
export const TRIP_CURRENCY_OPTIONS: Currency[] = [DOMESTIC_CURRENCY, ...COUNTRY_CURRENCIES];

// 지출 추가 모달 - 빠른 칩 선택용 (원화 예외 선택 포함)
export const EXPENSE_CURRENCY_OPTIONS: Currency[] = [DOMESTIC_CURRENCY, ...CURRENCIES];

export function getCurrencySymbol(code?: string | null): string {
  if (!code || code === "KRW") return "₩";
  return COUNTRY_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function isKnownCurrency(code: string): boolean {
  return code === "KRW" || COUNTRY_CURRENCIES.some((c) => c.code === code);
}
