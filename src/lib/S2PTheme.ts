export class S2PThemeObject {
    public id: string = "";
    public label: string = "user";

    public top: number = 0;
    public left: number = 0;

    public width: number = 0;
    public height: number = 0;    
    
    public angle: number = 0;

    public fill: (string|null)[] = ["#fff", "#fff"];
    public stroke: (string|null)[] = ["#fff", "#fff"];
    public strokeWidth: number = 1;

    public scaleX: number = 1;
    public scaleY: number = 1;  
}

export class S2PThemeText extends S2PThemeObject {    
    public value: string | undefined = "";

    public fontSize: number = 30;
    public fontFamily: string = "Kanit"; 
    public fontWeight: string | number = 400; 
    public fontStyle: string = "normal";

    public charSpacing: number = 0;
}

export class S2PThemePoly extends S2PThemeObject {    
}

export class S2PThemeSplits extends S2PThemeObject {   
    public barHeight: number = 15;
    public barGap: number = 5; 

    public rx: number = 0;
    public ry: number = 0;

    public fontFamily: string = "Kanit"; 
    public fontStyle: string = "normal";
    public fontWeight: string | number = 400; 

    public textColor: (string|null)[] = ["#fff", "#fff"];
}

export class S2PThemeSvg extends S2PThemeObject {
    public url: string = "";    
}

export class S2PThemeRect extends S2PThemeObject {
    public rx: number = 0;
    public ry: number = 0;
}

export class S2PTheme {
    public name: string = "";
    public ignore: boolean = false;
    public texts: S2PThemeText[] = [];
    public polys: S2PThemePoly[] = [];
    public rects: S2PThemeRect[] = [];
    public svgs: S2PThemeSvg[] = [];
    public splits: S2PThemeSplits[] = [];

    public height_percentage: number = 1;
    public devicePixelRatio: number = 1;

    constructor(name: string) {
        this.name = name;
    }
}