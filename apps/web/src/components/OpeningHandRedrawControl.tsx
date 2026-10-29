import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactElement } from "react";

interface OpeningHandRedrawControlProps {
  disabled: boolean;
  onRedraw(): void;
}

export function OpeningHandRedrawControl({ disabled, onRedraw }: OpeningHandRedrawControlProps): ReactElement {
  const [touchTooltipVisible, setTouchTooltipVisible] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);
  const suppressNextClick = useRef(false);

  const clearTimer = (timer: typeof longPressTimer) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const startLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" || disabled) return;
    clearTimer(longPressTimer);
    clearTimer(dismissTimer);
    clearTimer(suppressClickTimer);
    startPoint.current = { x: event.clientX, y: event.clientY };
    longPressTriggered.current = false;
    suppressNextClick.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      suppressNextClick.current = true;
      setTouchTooltipVisible(true);
    }, 500);
  };

  const moveLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    const start = startPoint.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
      clearTimer(longPressTimer);
      startPoint.current = null;
    }
  };

  const finishLongPress = () => {
    clearTimer(longPressTimer);
    startPoint.current = null;
    if (!longPressTriggered.current) return;
    clearTimer(dismissTimer);
    dismissTimer.current = setTimeout(() => {
      setTouchTooltipVisible(false);
      longPressTriggered.current = false;
      dismissTimer.current = null;
    }, 2000);
    clearTimer(suppressClickTimer);
    suppressClickTimer.current = setTimeout(() => {
      suppressNextClick.current = false;
      suppressClickTimer.current = null;
    }, 500);
  };

  const cancelLongPress = () => {
    clearTimer(longPressTimer);
    clearTimer(dismissTimer);
    clearTimer(suppressClickTimer);
    startPoint.current = null;
    longPressTriggered.current = false;
    suppressNextClick.current = false;
    setTouchTooltipVisible(false);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressNextClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick.current = false;
      return;
    }
    onRedraw();
  };

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (suppressClickTimer.current) clearTimeout(suppressClickTimer.current);
  }, []);

  return (
    <span className={`opening-hand-redraw-control${touchTooltipVisible ? " is-tooltip-visible" : ""}`}>
      <button
        className="opening-hand-redraw-button"
        type="button"
        aria-label="시작 손패 다시 뽑기"
        aria-describedby="opening-hand-redraw-tooltip"
        disabled={disabled}
        onClick={handleClick}
        onPointerDown={startLongPress}
        onPointerMove={moveLongPress}
        onPointerUp={finishLongPress}
        onPointerCancel={cancelLongPress}
      >
        <span aria-hidden="true">↻</span>
      </button>
      <span className="opening-hand-redraw-tooltip" id="opening-hand-redraw-tooltip" role="tooltip">손패를 1회 다시 뽑습니다</span>
    </span>
  );
}
