export class Converters {
    static secondsToHM(seconds: number) : string{
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor((seconds % 3600) / 60 / 60);
    
        if (h == 0)
          return `${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
    
        return `${h}h ${m.toString().padStart(2, "0")}m`;
      }
}