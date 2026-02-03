import { ClimbData, type StravaData } from "../utils/fieldmappings";

function classifyClimb(length: number, elev: number): ClimbData["category"] {
    const score = elev * (length / 1000);
    if (score > 8000) return "HC";
    if (score > 4000) return "1";
    if (score > 2000) return "2";
    if (score > 1000) return "3";
    if (score > 500) return "4";
    return "-";
}

export function detectClimbs(
    strava_data: StravaData,

): ClimbData[] {
    let time = strava_data.streams.time;
    let distance = strava_data.streams.distance;
    let altitude = strava_data.streams.elevation;
    let watts = strava_data.streams.watts;

    if (!distance || !distance.length || !altitude || !altitude.length)
        return [];

    const MIN_GRADIENT = 4;    // %
    const MIN_LENGTH = 500;    // m
    const DIP_TOLERANCE = -3.5;  // %
    const DIP_TOLERANCE_M = 400;

    type Acc = {
        start: number;
        end: number;
        length: number;
        elev: number;
    };

    const climbs: ClimbData[] = [];
    let cur: Acc | null = null;

    for (let i = 1; i < altitude.length; i++) {
        const d = distance[i] - distance[i - 1];
        if (d <= 0) continue;

        const h = altitude[i] - altitude[i - 1];
        const g = (h / d) * 100;

        const uphill =
            g >= MIN_GRADIENT || (cur && g >= DIP_TOLERANCE);

        if (uphill) {
            if (!cur) {
                cur = { start: i - 1, end: i, length: 0, elev: 0 };
            }
            cur.end = i;
            cur.length += d;
            if (h > 0) cur.elev += h;
        } else if (cur) {
            if (cur.length >= MIN_LENGTH) {
                const avg = (cur.elev / cur.length) * 100;
                if (avg >= MIN_GRADIENT)
                    climbs.push({
                        ...new ClimbData(),
                        startIndex: cur.start,
                        endIndex: cur.end,
                        length: cur.length,
                        elevation_difference: cur.elev,
                        average_gradient: avg,
                        average_power: watts.length ? avgPowerTimeWeighted(watts, time, cur.start, cur.end) : 0,
                        category: classifyClimb(cur.length, cur.elev),
                    });
            }
            cur = null;
        }
    }

    if (cur && cur.length >= MIN_LENGTH) {
        const avg = (cur.elev / cur.length) * 100;
        if (avg >= MIN_GRADIENT)
            climbs.push({
                ...new ClimbData(),
                startIndex: cur.start,
                endIndex: cur.end,
                length: cur.length,
                elevation_difference: cur.elev,
                average_gradient: avg,
                average_power: watts.length ? avgPowerTimeWeighted(watts, time, cur.start, cur.end) : 0,
                category: classifyClimb(cur.length, cur.elev),
            });
    }

    return climbs;
}

function avgPowerTimeWeighted(
    power: number[],
    time: number[],
    i0: number,
    i1: number
): number {
    let sum = 0;
    let duration = 0;

    for (let i = i0 + 1; i <= i1; i++) {
        const dt = time[i] - time[i - 1];
        if (dt > 0 && power[i] > 0) {
            sum += power[i] * dt;
            duration += dt;
        }
    }

    return duration > 0 ? sum / duration : 0;
}