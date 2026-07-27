import { useCallback, useEffect, useState } from "react";

/**
 * 가로 스크롤 영역을 마우스 클릭+드래그로도 스와이프할 수 있게 해주고,
 * 좌우로 더 스크롤할 내용이 있는지(canScrollLeft/Right)도 알려준다.
 * 트랙패드 좌우 스와이프(wheel deltaX)와 터치 스와이프도 직접 처리한다 - 모달(Radix Dialog) 안에서는
 * 스크롤 락 때문에 네이티브 스크롤이 중첩된 가로 스크롤 영역까지 전달되지 않는 경우가 있어서다.
 *
 * ref는 useRef가 아니라 콜백 ref(state)로 관리한다. Radix Dialog는 닫혀 있는 동안 content를
 * DOM에서 아예 제거하기 때문에, 모달을 여닫는 컴포넌트가 처음 마운트될 때(닫힌 상태) el이
 * null이면 일반 useRef+useEffect(deps: [])로는 나중에 모달이 열려도 리스너가 영영 붙지 않는다.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const [el, setEl] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => setEl(node), []);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const updateScrollState = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    let isDown = false;
    let moved = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      moved = false;
      startX = e.pageX;
      startScrollLeft = el.scrollLeft;
    };
    const stopDragging = () => {
      isDown = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const walk = e.pageX - startX;
      if (Math.abs(walk) > 5) moved = true;
      el.scrollLeft = startScrollLeft - walk;
    };
    // 드래그 중 살짝 움직였으면, 손을 뗄 때 버튼 클릭이 발동되지 않게 막는다.
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    // 터치 스와이프: 모달(Radix Dialog) 안에서는 스크롤 락이 네이티브 터치 스크롤 전파를
    // 막는 경우가 있어, wheel과 마찬가지로 scrollLeft를 직접 조작해서 스와이프를 보장한다.
    let touchStartX = 0;
    let touchStartScrollLeft = 0;
    let touchMoved = false;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].pageX;
      touchStartScrollLeft = el.scrollLeft;
      touchMoved = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      const walk = e.touches[0].pageX - touchStartX;
      if (Math.abs(walk) > 5) touchMoved = true;
      el.scrollLeft = touchStartScrollLeft - walk;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchMoved) e.preventDefault();
    };

    // 트랙패드 좌우 스와이프는 deltaX로 들어온다. 세로 휠 스크롤(deltaY만 있는 경우)은
    // 페이지의 정상적인 세로 스크롤을 막지 않도록 건드리지 않는다.
    // 모달 안에서는 body 스크롤 락이 휠 이벤트를 가로채는 경우가 있어 네이티브 스크롤에만
    // 의존하지 않고 가로 제스처일 때는 여기서 scrollLeft를 직접 조작한다.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      el.scrollLeft += e.deltaX;
      e.preventDefault();
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("mousemove", onMouseMove);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("scroll", updateScrollState);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    updateScrollState();

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("scroll", updateScrollState);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      resizeObserver.disconnect();
    };
  }, [el]);

  const scrollByAmount = (amount: number) => {
    el?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return {
    ref,
    canScrollLeft,
    canScrollRight,
    scrollLeft: () => scrollByAmount(-160),
    scrollRight: () => scrollByAmount(160),
  };
}
