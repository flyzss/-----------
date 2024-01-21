import  { glb } from "./glb.js";
import { PROMPT } from "./prompt.js";
import { FOOD } from "./food.js";
export class WALL {
    constructor(obj) {
        this.exterior = obj.exterior;
        this.hp = obj.hp;
        this.xy = obj.xy;
        this.id = obj.id || Math.random();
        this.width = obj.width || 40;
        this.height = obj.height || 40;
        this.type = glb.types.wall;
        this.food = obj.food;
        this.belong = obj.belong;
        this.isDie = false;
        this.img=obj.img;
        this.index = glb.pushToArr(glb.walllist, this);


    }
    drawme() {
        if(this.img){
            glb.context.drawImage(this.img, this.xy.x, this.xy.y, this.width, this.height);
            return;
        }
        const rgb = [
            "#1c1c1c",
            "#383838",
            "#555555",
            "#717171",
            "#8d8d8d",
            "#aaaaaa",
            "#c6c6c6",
            "#e2e2e2",
        ]
        glb.context.fillStyle = rgb[Math.round(this.hp / 1000)] || "#1c1c1c";
        let { x, y } = this.xy;
        glb.context.fillRect(x, y, this.width - 1, this.height - 1);
    }
    zhongdan(zidan) {
        //console.log(zidan.who);
        if(this.belong==zidan.who.belong)return;
        if (this.isDie) return;
        if (this.hp <= 0) return this.die(zidan.isPlane ? null : zidan.who);//飞机的子弹爆出的食物没有归属权
        //if(zidan.belong==1)console.log(this.hp);
        let hp = this.hp;
        let sh = ~~(zidan.sh * 0.8 + Math.random() * (zidan.sh * 0.2));
        let msg = `-${sh}`;
        if (Math.random() <= zidan.baojilv) {
            sh = ~~(zidan.maxsh * zidan.baojishang);
            msg = `暴击-${sh}`;
        }
        this.hp -= sh;
        //if(zidan.belong==1)console.log(this.hp);
        zidan.sh -= hp;
        if (this.hp <= 0) {
            this.die(zidan.isPlane ? undefined : zidan.who);//飞机的子弹爆出的食物没有归属权
        };
        if (zidan.sh <= 0) zidan.die();
        zidan.boom(this);
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: msg, color: "white", size: 15 });
    }
    die(who) {
        if (this.isDie) return;
        this.isDie = true;
        if (glb.walllist.length > this.index) glb.walllist[this.index] = 0;
        if (this.food) new FOOD({ xy: { x: this.xy.x, y: this.xy.y }, act: this.food, who });
        if(who){
            who.changeScore(50);
            who.killCount+=0.334;//杀敌计数器,每个方块=0.3个敌人            
        }

        //console.log(who);
    }
}