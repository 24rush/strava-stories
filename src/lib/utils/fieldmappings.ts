import type { LatLng } from "../geometry/LatLng";

export class FieldMappings {
    private data: Record<string, string | number> = {}; // FieldName -> Value

    static HeaderValue = "Field";

    static FieldNames = [
        "Moving time (hh:mm:ss)", "Distance (m)", "Calories", "Avg. Power (W)", "Max Power (W)"
    ];

    static FieldIds = [
        "time", "distance", "calories", "avgpower", "maxpower"
    ]

    static getFieldMapping(): Record<string, string[]> {
        return { Field: this.FieldNames };
    }

    public setValue(fieldName: string, value: number) {
        let stripHeader = fieldName.replace(FieldMappings.HeaderValue + ": ", "");

        if (FieldMappings.FieldNames.findIndex(v => v === stripHeader) == -1)
            return;

        this.data[stripHeader] = value;
    }

    public getValue(fieldName: string): number | string | undefined {
        let stripHeader = fieldName.replace(FieldMappings.HeaderValue + ": ", "");
        return this.data[stripHeader];
    }

    static fieldNameToId(fieldName: string): string {
        let stripHeader = fieldName.replace(FieldMappings.HeaderValue + ": ", "");

        let idx = FieldMappings.FieldNames.findIndex(v => v === stripHeader);

        if (idx == -1)
            return "";

        return FieldMappings.FieldIds[idx] ?? "";
    }
}

export class StravaData {
    activityKind: {
        sportType: string;
    };
    scalars: {
        distance: number,
        movingTime: number,
        elevationGain: number,

        calories: number | undefined,
        avgpower: number | undefined,
        maxpower: number | undefined,
    }
    streams: {
        location: LatLng[],
        elevation: number[]
    }

    constructor() {
        this.activityKind = { sportType: "" };
        this.scalars = {
            distance: 0,
            movingTime: 0,
            elevationGain: 0,

            calories: undefined,
            avgpower: undefined,
            maxpower: undefined,
        }
        this.streams = {
            location: [],
            elevation: []
        }
    }

    static loadFromRaw(data: any): StravaData {
        return {
            activityKind: { sportType: data.activityKind.sportType },
            scalars: {
                distance: data.scalars.distance,
                movingTime: data.scalars.movingTime,
                elevationGain: data.scalars.elevationGain,

                calories: undefined,
                avgpower: undefined,
                maxpower: undefined
            },
            streams: {
                location: data.streams.location,
                elevation: data.streams.elevation
            }
        }
    }
};
