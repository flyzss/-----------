import  { glb } from "./glb.js";
import { BOOM } from "./boom.js";
export class ZIDAN {
    constructor(arg) {
        this.sh = arg.sh;
        this.maxsh = arg.sh;
        this.xy = arg.xy;
        this.width = arg.width || 10;
        this.height = arg.height || 10;
        this.belong = arg.belong;
        this.exterior = arg.exterior;
        this.direction = arg.direction;
        this.moveSpeed = arg.moveSpeed || 10;
        this.type = glb.types.zidan;
        this.isDie = false;
        this.baojilv = arg.baojilv || 0.01;
        this.baojishang = arg.baojishang || 2;
        this.far = arg.far || 200;//射程
        this.who = arg.who;//谁射的子弹
        this.isPlane = arg.isPlane || false;//是否是飞机的子弹
        this.zhalie = arg.zhalie || 0;//炸裂子弹
        this.moveCount = 0;
        this.zhuizongdan = arg.zhuizongdan || 0;
        this.id = Math.round(Math.random() * 10000000);
        this.handle = setInterval(() => { this.loop() }, 10);
        this.index = glb.pushToArr(glb.zidanlist, this);
        if (this.zhuizongdan) this.findTarget();
    }
    findTarget() {//寻找目标自动追踪弹
        let jl = 9999999;
        let ret;
        let { x, y } = this.xy;
        for (const tank of glb.tanklist) {
            if (tank && tank.belong != this.belong&&tank.preAnimationTime<=0) {
                let tmp = Math.pow(Math.pow(tank.xy.x - x, 2) + Math.pow(tank.xy.y - y, 2), 0.5);
                if (tmp < jl) {
                    jl = tmp;
                    ret = tank;
                }
            }
        }
        for (const shuijing of glb.shuijinglist) {
            if (shuijing && shuijing.belong != this.belong) {
                let tmp = Math.pow(Math.pow(shuijing.xy.x - x, 2) + Math.pow(shuijing.xy.y - y, 2), 0.5);
                if (tmp < jl) {
                    jl = tmp;
                    ret = shuijing;
                }
            }
        }
        if (jl != 9999999) this.target = { obj: ret, dist: jl };
    }
    loop() {
        if (glb.pause) return;
        this.move();
    }
    move() {
        let direction = this.direction;
        let { x, y } = this.xy;
        if (this.target && this.target.obj.hp > 0 && this.target.dist <= this.far) {//如果有目标并且活着
            let f = Math.atan2(this.target.obj.xy.y - y, this.target.obj.xy.x - x);//计算方位角
            x += Math.round(Math.cos(f) * this.moveSpeed);
            y += Math.round(Math.sin(f) * this.moveSpeed);
        } else {
            if (direction == 0) x -= this.moveSpeed;
            else if (direction == 2) x += this.moveSpeed;
            else if (direction == 1) y -= this.moveSpeed;
            else if (direction == 3) y += this.moveSpeed;
        }
        //if (!glb.isin(x, y, this.width, this.height)&&this.type==glb.types.zidan) return this.die();//出屏幕
        this.moveCount += this.moveSpeed;
        if (this.zhalie && this.moveCount >= 100) {
            return this.die()//炸裂子弹
        }
        if (this.moveCount > Math.min(this.far,glb.width)) return this.die();//有效射程
        this.xy = { x, y };
        let hit = glb.checkhit(this,["tanklist", 'shuijinglist',"walllist"]);
        if (hit) hit.zhongdan(this);
    }
    drawme() {
        let { x, y } = this.xy;
        this.exterior = Math.floor(this.sh / 2000);
        glb.context.drawImage(glb.zidanImg[this.exterior] || glb.zidanImg[glb.zidanImg.length - 1], x, y, this.width, this.height);//把图片绘制在旋转的中心点，

    }
    boom(obj) {
        new BOOM({ xy: { x: obj.xy.x, y: obj.xy.y }, width: obj.width, height: obj.width });
    }
    zhongdan(obj) {
        if (this.belong != obj.belong) {
            let sh = this.sh;//子弹碰撞子弹伤害相抵，为零的消失
            this.sh -= obj.sh;
            obj.sh -= sh;
            if (this.sh <= 0) this.die();
            if (obj.sh <= 0) obj.die(obj);
        }

    }
    die() {
        if (this.isDie) return;
        this.isDie = true;
        //console.log(glb.cell[this.ab.a][this.ab.b]);
        if (glb.zidanlist.length > this.index) glb.zidanlist[this.index] = 0;
        clearTimeout(this.handle);
        if (this.zhalie) {
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.maxsh, xy: this.xy, belong: this.belong, exterior: 0, who: this.who, direction: 0, far: this.far, width: this.width, height: this.height, zhuizongdan: this.zhuizongdan });
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.maxsh, xy: this.xy, belong: this.belong, exterior: 0, who: this.who, direction: 1, far: this.far, width: this.width, height: this.height, zhuizongdan: this.zhuizongdan });
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.maxsh, xy: this.xy, belong: this.belong, exterior: 0, who: this.who, direction: 2, far: this.far, width: this.width, height: this.height, zhuizongdan: this.zhuizongdan });
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.maxsh, xy: this.xy, belong: this.belong, exterior: 0, who: this.who, direction: 3, far: this.far, width: this.width, height: this.height, zhuizongdan: this.zhuizongdan });
        }
    }
}
export class MISSILE extends ZIDAN {//导弹
    constructor(arg) {
        super(arg);
        this.imgList=glb.missileImg;
        this.imgIndex = 0;
        this.drawmeRunCount = 0;
    }
    drawme() {
        let angel = [0, 90, 180, 270][this.direction];
        let { x, y } = this.xy;
        let px = x + this.width / 2, py = y + this.height / 2;
        this.imgIndex=++this.imgIndex%this.imgList.length;
        this.drawmeRunCount++;
        glb.context.save();//保存状态
        glb.context.translate(px, py);//设置画布上的(0,0)位置，也就是旋转的中心点
        glb.context.rotate(angel * Math.PI / 180);
        glb.context.translate(-px, -py);//设置画布上的(0,0)位置，也就是旋转的中心点
        glb.context.drawImage(this.imgList[this.imgIndex], x, y, this.width, this.height);//把图片绘制在旋转的中心点，
        glb.context.restore();//恢复状态
    }
}