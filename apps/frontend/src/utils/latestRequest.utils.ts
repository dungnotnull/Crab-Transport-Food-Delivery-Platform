export class LatestRequestController {
  private currentController: AbortController | null = null;

  next(): AbortSignal {
    this.abort();
    this.currentController = new AbortController();
    return this.currentController.signal;
  }

  abort(): void {
    this.currentController?.abort();
    this.currentController = null;
  }
}
