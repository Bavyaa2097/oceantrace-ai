import L from 'leaflet';

export const enableMapInteractionOnFocus = (
  map: L.Map,
  container: HTMLElement
): (() => void) => {
  const setInteractionEnabled = (enabled: boolean) => {
    const controls = [
      map.dragging,
      map.touchZoom,
      map.doubleClickZoom,
      map.scrollWheelZoom,
      map.boxZoom,
      map.keyboard,
    ];

    controls.forEach((control) => {
      if (enabled) {
        control.enable();
      } else {
        control.disable();
      }
    });
  };

  const handleMapFocus = () => setInteractionEnabled(true);
  const handleOutsideFocus = (event: PointerEvent) => {
    if (!container.contains(event.target as Node)) {
      setInteractionEnabled(false);
    }
  };

  container.addEventListener('click', handleMapFocus);
  document.addEventListener('pointerdown', handleOutsideFocus);
  setInteractionEnabled(false);

  return () => {
    container.removeEventListener('click', handleMapFocus);
    document.removeEventListener('pointerdown', handleOutsideFocus);
  };
};
