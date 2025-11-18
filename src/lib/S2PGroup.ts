import type { Group } from "fabric";
import { S2PCanvasItem } from "./S2PCanvasItem";

export class S2PGroup extends S2PCanvasItem {
    private group_: Group;
    
    constructor(group: Group) {
        super();
        
        this.group_ = group;
    }

    get group(): Group { return this.group_; }
}