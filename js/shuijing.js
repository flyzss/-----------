import  { glb } from "./glb.js";
import { PROMPT } from "./prompt.js";
import { FOOD } from "./food.js";
import {WALL} from "./wall.js"
export class SHUIJING {
    constructor(obj) {
        this.exterior = obj.exterior || 0;
        this.hp = obj.hp;
        this.img = glb.house[this.exterior];
        this.maxhp = obj.hp;
        this.xy = obj.xy;
        this.isPlayer = obj.isPlayer||false;
        this.id = obj.id || Math.random();
        this.width = obj.width || 120;
        this.height = obj.height || 120;
        this.type = glb.types.shuijing;
        this.food = obj.food || 1;
        this.belong = obj.belong;
        this.timeout = 0;
        this.audioCooding = 0;
        this.hudunTimeOut = 0;
        this.isDie = false;
        this.index = glb.pushToArr(glb.shuijinglist, this);
        this.makeClosure();
        this.loop();

    }
    drawme() {
        //glb.context.fillStyle = "red";
        let { x, y } = this.xy;
        //glb.context.fillRect(x, y, this.width - 1, this.height - 1);
        glb.context.drawImage(this.img, x, y, this.width, this.height);
        if (this.hudunTimeOut > 0) {
            glb.context.drawImage(glb.foodImg[17], x, y, this.width, this.height);
            glb.context.fillStyle = 'red';
            glb.context.font = '20px Arial';
            glb.context.fillText(this.hudunTimeOut, x + this.width / 2-this.hudunTimeOut.toString().length*10/2, y + this.height / 2);
        }
        if (this.hp > 0) {// 画血条
            const color=this.belong===1?"green":"red";
            glb.context.fillStyle = color;
            glb.context.fillRect(x, y + 5, this.hp / this.maxhp * this.width, 5);
            glb.context.strokeStyle = color;
            glb.context.strokeRect(x, y + 5, this.width, 5);
            glb.context.fillStyle = color;
            glb.context.font = '14px Arial';
            glb.context.fillText(Math.floor(this.hp), x, y);
        }
    }
    makeClosure(){//修建围墙
        const width=40,height=40;
        let {x,y}=this.xy;
        x-=width;y-=height;
        const hp=this.hp/20;
        while(x<this.xy.x+this.width){
            new WALL({xy:{x,y},width,height,belong:this.belong,hp,img:glb.wallimg1});
            x+=width;
        }
        while(y<this.xy.y+this.height){
            new WALL({xy:{x,y},width,height,belong:this.belong,hp,img:glb.wallimg1});
            y+=height;
        }
        while(x>this.xy.x-width){
            new WALL({xy:{x,y},width,height,belong:this.belong,hp,img:glb.wallimg1});
            x-=width;
        }
        while(y>this.xy.y-height){
            new WALL({xy:{x,y},width,height,belong:this.belong,hp,img:glb.wallimg1});
            y-=height;
        }
    }
    hudun() {//获得护盾
        new PROMPT({ xy: { ...this.xy }, msg: "水晶获得护盾，最大血量提升5倍", size: 30, color: "white", life: 100 });   
        if (this.hudunTimeOut > 0){
            this.hudunTimeOut = 60;
            return;
        }
        this.hudunTimeOut = 60;
        this.maxhp = this.maxhp * 5;
        this.hp = this.maxhp;
    }
    loop() {
        if (!glb.pause) {
            this.audioCooding--;
            this.hudunTimeOut--;
            if (this.hudunTimeOut == 0) {//1分钟后hudun失效
                this.maxhp = this.maxhp / 5;
                if (this.hp > this.maxhp) this.hp = this.maxhp;
                new PROMPT({ xy: { ...this.xy }, msg: "水晶护盾失效", size: 30, color: "white", life: 100 });
            }
            if (this.hp < this.maxhp) {
                this.hp += this.maxhp * 0.01;
                if (this.hp > this.maxhp) this.hp = this.maxhp;
            }
        }
        this.timeout = setTimeout(() => {
            this.loop();
        }, 1000);
    }
    zhongdan(obj) {
        if (this.isDie) return;
        //console.log(obj.who);
        if (this.hp <= 0) return this.die(obj.who);
        if (obj.belong== this.belong) return;
        //if (obj.belong != 1 && this.belong == 2) return;//疯狂的坦克不受伤害
        //if(obj.belong==1)console.log(this.hp);
        let hp = this.hp;
        let sh = ~~(obj.sh * 0.8 + Math.random() * (obj.sh * 0.2));
        let msg = `-${sh}`;
        let baoji = false;
        if (Math.random() <= obj.baojilv) {
            sh = ~~(obj.maxsh * obj.baojishang);
            msg = `暴击-${sh}`;
            baoji = true;
        }
        this.hp -= sh;
        if (this.audioCooding <= 0&&this.belong==1) {
            new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: "警告！水晶正在被攻击!", color: "white", size: 40 });
            glb.playAudio("attackShuijing");
            this.audioCooding = 20;
        }
        obj.who.xixiefun(sh);
        //obj.who.score += ~~(sh / 100);
        //if(obj.belong==1)console.log(this.hp);
        obj.sh -= hp;
        if (this.hp <= 0) {
            this.die(obj.who);
            obj.who.changeScore(3000);
        };
        if (obj.sh <= 0) obj.die();
        obj.boom(this);
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: msg, color: baoji ? "red" : "white", size: baoji ? 30 : 15 });
    }
    die(who) {
        if (this.isDie) return;
        this.isDie = true;
        glb.playAudio("die");
        glb.playAudio("glass");
        (async () => {//闪烁
            this.width *= 1.5;
            this.height *= 2;
            for (let i = 0; i < 4; i++) {
                this.img = glb.tankboomImg[i]
                await sleep(100);
            }
            if (glb.shuijinglist.length > this.index) glb.shuijinglist[this.index] = 0;
            this.index = -1;

        })();
        if (this.food) new FOOD({ xy: { x: this.xy.x, y: this.xy.y }, act: this.food, who });
        clearTimeout(this.timeout);
        //console.log(who);
    }
}
function sleep(timeout)  {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve() }, timeout);
    })
}