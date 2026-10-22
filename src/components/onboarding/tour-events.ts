/** "Take the tour" from anywhere: the tour (in the app layout) listens for this. */
export const START_TOUR_EVENT = "kesi:start-tour";

export function startTour() {
  window.dispatchEvent(new Event(START_TOUR_EVENT));
}
