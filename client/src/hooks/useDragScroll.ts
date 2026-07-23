import { useEffect, useRef, useState } from "react";

/**
 * 가로 스크롤 영역을 마우스 클릭+드래그로도 스와이프할 수 있게 해주고,
 * 좌우로 더 스크롤할 내용이 있는지(canScrollLeft/Right)도 알려준다.
 * 트랙패드 좌우 스와이프(wheel deltaX)도 직접 처리한다 - 모달(Radix Dialog) 안에서는
 * 스크롤 락 때문에 네이티브 휠 스크롤이 중첩된 가로 스크롤 영역까지 전달되지 않는 경우가 있어서다.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollByAmount = (amount: number) => {
    ref.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return {
    ref,
    canScrollLeft,
    canScrollRight,
    scrollLeft: () => scrollByAmount(-160),
    scrollRight: () => scrollByAmount(160),
  };
}
