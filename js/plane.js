import  { glb } from "./glb.js";
import { ZIDAN} from "./zidan.js";
export class PLANE {//飞机
    constructor(arg) {//(生命,外观,立场,位置,面向,ID) 立场=0无敌 1我方 其他敌方,面向0=left 1=up 2=right 3=down
        this.hp = arg.hp;
        this.maxhp = arg.hp;
        this.exterior = arg.exterior || 0;
        this.belong = arg.belong;
        this.who = arg.who;
        this.xy = arg.xy;
        this.width = arg.width || 46;
        this.height = arg.height || 46;
        this.direction = arg.direction;
        this.shootTimeout = arg.shootTimeout || 0;
        this.shootSpeed = arg.shootSpeed || 100;
        this.shootFar = arg.shootFar || 1000;
        this.moveSpeed = arg.moveSpeed || 5;
        this.type = glb.types.plane;
        this.score = 0;
        this.sh = arg.sh || 1000;//伤害
        this.stop = 0;
        this.isai = arg.isai;
        this.arg = arg;
        this.tmp = {};
        this.id = Math.round(Math.random() * 10000000);
        this.keystate = {};
        this.index = glb.pushToArr(glb.tanklist, this);
        this.handle = setInterval(() => { this.loop() }, 20);
        this.audio = glb.playAudio("plane");
    }
    drawme() {
        let direction = this.direction;
        let angel = 0;
        if (direction == 0) { angel = -90 }
        else if (direction == 2) { angel = 90 }
        else if (direction == 1) { angel = 0 }
        else if (direction == 3) { angel = 180 }
        let { x, y } = this.xy;
        let px = x + this.width / 2, py = y + this.height / 2;
        glb.context.save();//保存状态
        glb.context.translate(px, py);//设置画布上的(0,0)位置，也就是旋转的中心点
        glb.context.rotate(angel * Math.PI / 180);
        glb.context.translate(-px, -py);//设置画布上的(0,0)位置，也就是旋转的中心点
        glb.context.drawImage(glb.planeImg[this.exterior], x, y, this.width, this.height);//把图片绘制在旋转的中心点，
        glb.context.restore();//恢复状态
        if (this.hp > 0) {// 画血条
            glb.context.fillStyle = "green";
            glb.context.fillRect(x, y - 5, this.hp / this.maxhp * this.width, 5);
            glb.context.strokeStyle = "green";
            glb.context.strokeRect(x, y - 5, this.width, 5);
        }
        if (this.who && this.who.name) {
            glb.context.fillStyle = 'white';
            let fsize = this.width / 5;
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(this.who.name + '的飞机', x + 6, y - 10);
        }
    }
    xixiefun() {

    }
    shoot() {
        if (this.stop) return;
        if ((new Date().getTime() - this.shootTimeout < this.shootSpeed)) return;
        this.shootTimeout = new Date().getTime();
        let { x, y } = this.xy;
        let width = this.tmp.zidanwidth || 15, height = this.tmp.zidanheight || 15;
        for (let i = 0; i < 4; i++)
            new ZIDAN({ sh: this.sh, isPlane: true, xy: { x: x + this.width / 2 - width / 2, y: y + this.height / 2 - height / 2 }, belong: this.belong, exterior: 0, who: this.who, direction: i, far: this.shootFar, width, height, zhalie: this.tmp.zhalie || 0 });
    }
    loop() {
        if (glb.pause) return;
        this.shoot();
        this.move(this.direction);
    }
    move(direction) {
        if (this.stop) return;
        if (direction != this.direction) { this.direction = direction; return true; };
        let { x, y } = this.xy;
        if (direction == 0) x -= this.moveSpeed;
        else if (direction == 2) x += this.moveSpeed;
        else if (direction == 1) y -= this.moveSpeed;
        else if (direction == 3) y += this.moveSpeed;
        else return false;
        if (!glb.isin(x, y, 1, 1)) return this.die();
        this.xy = { x, y };
        return true;
    }
    zhongdan(obj) {

    }
    die() {
        if (this.handle) clearTimeout(this.handle);
        if (glb.tanklist.length > this.index) glb.tanklist[this.index] = 0;
        this.stop = 1;
    }
}