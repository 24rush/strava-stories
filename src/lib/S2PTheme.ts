export class S2PThemeObject {
    public label: string = "user";

    public top: number = 0;
    public left: number = 0;

    public angle: number = 0;

    public fill: string = "#fff";
    public stroke: string = "#fff";
    public strokeWidth: number = 1;

    public scaleX: number = 1;
    public scaleY: number = 1;  
}

export class S2PThemeText extends S2PThemeObject {    
    public value?: string = "";

    public fontSize: number = 30;
    public fontFamily: string = "Kanit";  
}

export class S2PThemePoly extends S2PThemeObject {    
}

export class S2PThemeSvg extends S2PThemeObject {
    public url: string = "";    
}

export class S2PThemeRect extends S2PThemeObject {
    public width: number = 0;
    public height: number = 0;       

    public rx: number = 0;
    public ry: number = 0;
}

export class S2PTheme {
    public name: string = "";
    public texts: S2PThemeText[] = [];
    public polys: S2PThemePoly[] = [];
    public svgs: S2PThemeSvg[] = [];

    public height_percentage: number = 1;

    constructor(name: string) {
        this.name = name;
    }
}