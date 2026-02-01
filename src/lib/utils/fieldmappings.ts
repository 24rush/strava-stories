import { LatLng } from "../geometry/LatLng";
import { Converters } from "./converters";

export enum FieldName {
    MovingTime = "Moving time (hh:mm:ss)",
    Distance = "Distance (m)",
    Elevation = "Elevation gain (m)",
    Calories = "Calories",

    Speed = "Speed",
    Pace = "Pace",

    AvgPower = "Avg. Power (W)",
    MaxPower = "Max. Power (W)",
    AvgHeartRate = "Avg. heartrate (bpm)",
    MaxHeartRate = "Max. heartrate (bpm)",

    AltitudeMax = "Altitude max (m)",
    AltitudeMin = "Altitude min (m)",

    TotalActiveDays = "Total active days",
    TotalDistance = "Total distance",
    TotalTime = "Total time",
    TotalElevation = "Total elevation",

    Name = "Name",
    Text = "User",
    None = ""
}

export enum FieldId {
    MovingTime = "movingTime",
    Distance = "distance",
    Speed = "speed",
    Pace = "pace",
    Elevation = "elevationGain",
    Calories = "calories",
    AltitudeMax = "altitude_max",
    AltitudeMin = "altitude_min",
    AvgPower = "avgpower",
    MaxPower = "maxpower",
    AvgHeartRate = "average_heartrate",
    MaxHeartRate = "max_heartrate",
    TotalActiveDays = "total_active_days",
    TotalDistance = "total_distance",
    TotalTime = "total_time",
    TotalElevation = "total_elevation",
    Name = "name",
    Text = "user",
    None = ""
}

export class DataSource {
    public data: StravaData = new StravaData();
    public fieldValuesStorage: FieldMappings = new FieldMappings();

    public loadFromRaw(raw: any) {
        this.data = StravaData.loadFromRaw(raw);
    }

    public loadFromRawNoApi(raw: any) {
        this.data = StravaData.loadFromRawNoApi(raw);
    }

    public getValue(fieldName: string): string | undefined {
        let storageValue = this.fieldValuesStorage.getValue(fieldName);
        if (!storageValue) {
            storageValue = this.getFieldValueFromOriginalData(fieldName);
        }

        if (storageValue && fieldName == FieldMappings.FieldNames[0]) {
            return Converters.secondsToHMS(parseInt(storageValue.toString()));
        }

        return storageValue ? storageValue.toString() : undefined;
    }

    public setValue(fieldName: string, value: string | undefined) {
        this.fieldValuesStorage.setValue(fieldName, parseInt(value ?? ""));

        if (!value || value === "") {
            let origDataValue = this.getFieldValueFromOriginalData(fieldName);
            if (origDataValue && !isNaN(origDataValue))
                value = origDataValue.toString();
            else
                value = undefined;
        }

        if (value && fieldName == FieldMappings.FieldNames[0]) {
            // Convert hh:mm:ss to seconds
            value = Converters.timeToSeconds(value.toString()).toString();
        }

        this.setFieldValueInData(fieldName, value);
    }

    public getValueForField(fieldId: string): string | number | undefined {
        switch (fieldId) {
            case FieldId.Distance:
                if (this.data.activityKind.sportType == "Swim")
                    return this.data.scalars.distance ? (this.data.scalars.distance) : 0;
                else {
                    let divider = this.data.scalars.distance > 999 ? 1000 : 1;
                    return this.data.scalars.distance ? (this.data.scalars.distance / divider).toFixed(0) : 0;
                }
            case FieldId.MovingTime:
                return this.data.scalars.movingTime ? Converters.secondsToHMS(this.data.scalars.movingTime, false) : 0;
            case FieldId.Elevation:
                return this.data.scalars.elevationGain
                    ? this.data.scalars.elevationGain.toFixed(0)
                    : 0;
            case FieldId.Pace:
                if (this.data.scalars.movingTime && this.data.scalars.distance) {
                    let pace = 0;

                    if (this.data.activityKind.sportType == "Swim") {
                        pace = this.data.scalars.movingTime / this.data.scalars.distance * 100;
                    }
                    else {
                        pace = this.data.scalars.movingTime / (this.data.scalars.distance / 1000);
                    }

                    return `${String(Math.floor(pace / 60)).padStart(2, '0')}:${String(Math.floor(pace % 60)).padStart(2, '0')}`;

                } else {
                    return 0;
                }
            case FieldId.Speed:
                return (this.data.scalars.movingTime && this.data.scalars.distance) ? ((this.data.scalars.distance / 1000) / (this.data.scalars.movingTime / 3600)).toFixed(1) : 0;
            case FieldId.AltitudeMax:
                return this.data.streams && this.data.streams.elevation.length > 0 ? Math.ceil(Math.max(...this.data.streams.elevation)) : 0;
            case FieldId.AltitudeMin:
                return this.data.streams  && this.data.streams.elevation.length > 0 ? Math.floor(Math.min(...this.data.streams.elevation)) : 0;
            case FieldId.Calories:
                return this.data.scalars.calories;
            case FieldId.AvgHeartRate:                
            case FieldId.MaxHeartRate:                
            case FieldId.AvgPower:
            case FieldId.MaxPower:
                return this.data.scalars[fieldId] ? Math.ceil(this.data.scalars[fieldId] ?? 0) : undefined;
            case FieldId.Name:
                return this.data.name;

            case FieldId.TotalActiveDays:
            case FieldId.TotalDistance:
            case FieldId.TotalTime:
            case FieldId.TotalElevation:
                return this.getValue(fieldId);
            default:
                return undefined;
        }
    }

    public getUnitForField(fieldName: string): string {
        switch (fieldName) {
            case FieldName.MovingTime:
            case FieldId.MovingTime:
                return this.data.scalars.movingTime ? Converters.secondsToHMS(this.data.scalars.movingTime) : '';
            case FieldName.Distance:
            case FieldId.Distance:
                if (this.data.activityKind.sportType == "Swim") return "m";
                else return (this.data.scalars.distance > 999) ? "km" : "m";
            case FieldId.Elevation:
                return "m";
            case FieldName.Pace:
            case FieldId.Pace:
                if (this.data.activityKind.sportType == "Swim")
                    return "/100m";
                else
                    return "/km";
            case FieldName.Calories:
            case FieldId.Calories:
                return "kcal";
            case FieldName.AvgPower:
            case FieldId.AvgPower:
            case FieldName.MaxPower:
            case FieldId.MaxPower:
                return "W";
            case FieldId.AvgHeartRate:
            case FieldId.MaxHeartRate:
            case FieldName.AvgHeartRate:
            case FieldName.MaxHeartRate:
                return "bpm";
            case FieldName.Speed:
            case FieldId.Speed:
                return "km/h";
            case FieldName.TotalActiveDays:
            case FieldId.TotalActiveDays:
                return "";
            case FieldName.TotalDistance:
            case FieldId.TotalDistance:
                return "km";
            case FieldName.TotalTime:
            case FieldId.TotalTime:
                return "hrs";
            case FieldName.TotalElevation:
            case FieldId.TotalElevation:
            case FieldId.AltitudeMax:
            case FieldId.AltitudeMin:
                return "m";
            default:
                return "";
        }
    }

    private getFieldValueFromOriginalData(fieldName: string): string | number | undefined {
        if (!this.data.origData) return undefined;

        let field = FieldMappings.fieldNameToId(fieldName);

        switch (field) {
            case FieldId.Distance:
            case FieldId.MovingTime:
            case FieldId.Elevation:
            case FieldId.Calories:
            case FieldId.AvgHeartRate:
            case FieldId.MaxHeartRate:
                return this.data.origData.scalars[field];
            case FieldId.Name:
                return this.data.name;
            default:
                return undefined;
        }
    }

    private setFieldValueInData(fieldName: string, value: string | undefined): boolean {
        let fieldId = FieldMappings.fieldNameToId(fieldName);

        switch (fieldId) {
            case FieldId.Distance:
            case FieldId.MovingTime:
            case FieldId.Elevation:
            case FieldId.Calories:
            case FieldId.AvgHeartRate:
            case FieldId.MaxHeartRate:
                this.data.scalars[fieldId] = value ? parseInt(value) : 0;
                return true;
            case FieldId.Name:
                this.data.name = value ?? "";
                return true;
            default:
                return false;
        }
    }
}

export class FieldMappings {
    private data: Record<string, string | number> = {}; // FieldName -> Value

    static GeneralHeader_val: string = "General";
    static PowerHeader_val: string = "Power";
    static AltitudeHeader_val: string = "Altitude";

    static Headers: string[] = [this.GeneralHeader_val, this.PowerHeader_val, this.AltitudeHeader_val];

    // These two arrays need to be kept in sync
    static FieldNames: FieldName[] = [
        FieldName.Name,
        FieldName.MovingTime,
        FieldName.Distance,
        FieldName.Elevation,
        FieldName.Calories,
        FieldName.AltitudeMax,
        FieldName.AltitudeMin,

        FieldName.Pace,
        FieldName.Speed,

        FieldName.AvgPower,
        FieldName.MaxPower,
        FieldName.AvgHeartRate,
        FieldName.MaxHeartRate,

        FieldName.TotalActiveDays,
        FieldName.TotalDistance,
        FieldName.TotalTime,
        FieldName.TotalElevation,

        FieldName.Text,
    ];

    static FieldIds: FieldId[] = [
        FieldId.Name,
        FieldId.MovingTime,
        FieldId.Distance,
        FieldId.Elevation,
        FieldId.Calories,
        FieldId.AltitudeMax,
        FieldId.AltitudeMin,

        FieldId.Pace,
        FieldId.Speed,

        FieldId.AvgPower,
        FieldId.MaxPower,
        FieldId.AvgHeartRate,
        FieldId.MaxHeartRate,

        FieldId.TotalActiveDays,
        FieldId.TotalDistance,
        FieldId.TotalTime,
        FieldId.TotalElevation,

        FieldId.Text
    ]

    static getFieldMapping(): Record<string, string[]> {
        return {
            [FieldMappings.GeneralHeader_val]: [
                FieldName.MovingTime,
                FieldName.Distance,
                FieldName.Elevation,
                FieldName.Calories,
                FieldName.AvgHeartRate,
                FieldName.MaxHeartRate],

            [FieldMappings.AltitudeHeader_val]: [
                FieldName.AltitudeMax,
                FieldName.AltitudeMin],

            [FieldMappings.PowerHeader_val]: [
                FieldName.AvgPower,
                FieldName.MaxPower],
        };
    }

    static stripHeaderFromFieldName(fieldName: string): string {
        FieldMappings.Headers.forEach((header: string) => {
            fieldName = fieldName.replace(header + " - ", "");
        });

        return fieldName;
    }

    public setValue(fieldName: string, value: number) {
        let stripHeader = FieldMappings.stripHeaderFromFieldName(fieldName);

        if (FieldMappings.FieldNames.findIndex(v => v === stripHeader) == -1)
            return;

        if (isNaN(value))
            delete this.data[stripHeader];
        else
            this.data[stripHeader] = value;
    }

    public getValue(fieldName: string): number | string | undefined {
        let stripHeader = FieldMappings.stripHeaderFromFieldName(fieldName);

        let data = this.data[stripHeader];

        if (!data)
            data = this.data[FieldMappings.fieldNameToId(fieldName)];

        if (!data)
            data = this.data[FieldMappings.fieldIdToName(fieldName)];

        return data;
    }

    static fieldNameToId(fieldName: string): string {
        let stripHeader = FieldMappings.stripHeaderFromFieldName(fieldName);

        let idx = FieldMappings.FieldNames.findIndex(v => v === stripHeader);

        if (idx == -1)
            return "";

        return FieldMappings.FieldIds[idx] ?? "";
    }

    static fieldIdToName(fieldId: string): FieldName {
        let idx = FieldMappings.FieldIds.findIndex(v => v === fieldId);

        if (idx == -1)
            return FieldName.Text;

        return FieldMappings.FieldNames[idx] ?? FieldName.Text;
    }
}

export type SplitData = {
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    average_grade_adjusted_speed: number;
    average_heartrate: number;
}

export class StravaData {
    origData: StravaData | undefined;

    activityKind: {
        sportType: string;
    };
    scalars: {
        distance: number,
        movingTime: number,
        elevationGain: number,
        calories: number | undefined,
        average_heartrate: number | undefined,
        max_heartrate: number | undefined,
        avgpower: number | undefined,
        maxpower: number | undefined
    }
    streams: {
        location: LatLng[],
        elevation: number[],
        heartrate: number[],
    }

    splits_metric: SplitData[]
    hasHeartRate: boolean;
    name: string;

    constructor() {
        this.activityKind = { sportType: "" };
        this.scalars = {
            distance: 0,
            movingTime: 0,
            elevationGain: 0,
            calories: undefined,
            average_heartrate: undefined,
            max_heartrate: undefined,
            avgpower: undefined,
            maxpower: undefined
        }
        this.streams = {
            location: [],
            elevation: [],
            heartrate: [],
        }
        this.hasHeartRate = false;
        this.name = "";
        this.splits_metric = [];

        this.origData = undefined;
    }

    static loadFromRawNoApi(data: any): StravaData {
        let newThis: StravaData = {
            activityKind: { sportType: data.activityKind.sportType },
            scalars: {
                distance: data.scalars.distance,
                movingTime: data.scalars.movingTime,
                elevationGain: data.scalars.elevationGain,
                calories: undefined,
                average_heartrate: undefined,
                max_heartrate: undefined,
                avgpower: undefined,
                maxpower: undefined
            },
            streams: {
                location: data.streams.location,
                elevation: data.streams.elevation,
                heartrate: []
            },
            hasHeartRate: false,
            name: data.name,
            splits_metric: [],
            origData: undefined
        }

        newThis.origData = structuredClone(newThis);

        return newThis;
    }

    static loadFromRaw(data: any): StravaData {
        let newThis: StravaData = {
            activityKind: { sportType: data.sport_type },
            scalars: {
                distance: data.distance,
                movingTime: data.moving_time,
                elevationGain: data.total_elevation_gain,
                calories: data.calories ?? data.kilojoules,
                max_heartrate: data.max_heartrate,
                average_heartrate: data.weighted_average_watts,
                maxpower: data.max_watts,
                avgpower: data.average_watts,
            },
            streams: {
                location: data.streams && 'latlng' in data.streams ? (data.streams.latlng.data as [[number, number]]).map(v => new LatLng(v[0], v[1])) : [],
                elevation: data.streams && 'altitude' in data.streams ? data.streams.altitude.data : [],
                heartrate: data.streams && 'heartrate' in data.streams ? data.streams.heartrate.data : []
            },
            hasHeartRate: data.has_heartrate,
            name: data.name,
            splits_metric: data.splits_metric ? data.splits_metric.map((s: any) => {
                return {
                    distance: s.distance,
                    elapsed_time: s.elapsed_time,
                    elevation_difference: s.elevation_difference,
                    moving_time: s.moving_time,
                    split: s.split,
                    average_speed: s.average_speed,
                    average_grade_adjusted_speed: s.average_grade_adjusted_speed,
                    average_heartrate: s.average_heartrate,
                }
            }) : [],
            origData: undefined
        }

        newThis.origData = structuredClone(newThis);

        return newThis;
    }
};
