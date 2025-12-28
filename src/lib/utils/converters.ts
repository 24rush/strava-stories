export class Converters {
  static secondsToHM(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h == 0)
      return `${m.toString().padStart(2, "0")}m${s.toString().padStart(2, "0")}s`;

    return `${h}h${m.toString().padStart(2, "0")}m`;
  }

  static secondsToHMS(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h == 0)
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  static timeToSeconds(time: string): number {
    const parts = time.split(':').map(Number);
    let seconds = 0;

    for (let i = 0; i < parts.length; i++) {
      if (isNaN(parts[i] ?? NaN)) 
        continue;

      seconds += parts[i] * Math.pow(60, parts.length - 1 - i);
    }

    return seconds;
  }
}