export class Converters {
  static secondsToHMS(seconds: number, addUnit: boolean = true): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    let mSep = addUnit ? 'm' : ':';
    let sSep = addUnit ? 's' : '';
    let hSep = addUnit ? 'h' : ':';

    if (h == 0)
      return `${m.toString().padStart(2, "0")}${mSep}${s.toString().padStart(2, "0")}${sSep}`;

    return `${h}${hSep}${m.toString().padStart(2, "0")}${mSep}${s.toString().padStart(2, "0")}${sSep}`;
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