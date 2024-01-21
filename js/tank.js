import  { glb } from "./glb.js";
import { ZIDAN,MISSILE,POISON } from "./zidan.js";
import { PROMPT } from "./prompt.js";
import { FOOD } from "./food.js";
import { TANKBOOM } from "./boom.js";
import {DEBUFF_methysis,BUFF_poisonMake,BUFF_bombMake} from "./buff.js";
export class TANK {
    constructor(arg) {//(生命,外观,立场,位置,面向,ID) 立场=0无敌 1我方 其他敌方,面向0=left 1=up 2=right 3=down
        this.hp = arg.hp;
        this.maxhp = arg.hp;
        this.exterior = arg.exterior??(Math.floor(Math.random()*(glb.tankImg.length-2))+2);//0和1为玩家形象
        //console.log(glb.tankImg.length,this.exterior);
        this.belong = arg.belong;
        this.xy = arg.xy||{ x: 0, y: 0 };
        this.fontColor = arg.fontColor || "#fff";
        this.width = arg.width || 46;
        this.height = arg.height || 46;
        this._size = { width: this.width, height: this.height };
        this.direction = arg.direction;
        this.shootTimeout = arg.shootTimeout || 0;
        this.shootSpeed = arg.shootSpeed || 1000;
        this.shootFar = arg.shootFar || 200;
        this.moveSpeed = arg.moveSpeed || 1;
        this.zhalie = arg.zhalie;
        this.zhuizongdan = arg.zhuizongdan;
        this.type = glb.types.tank;
        this.score = arg.score || 500;
        this.chenghao = arg.chenghao || "";
        this.name = arg.name || glb.getTankName();
        this.sh = arg.sh || 1000;//伤害
        this.stop = 0;
        this.isai = arg.isai;
        this.arg = arg;
        this.eatFoodCount = 0;//吃食物计数器
        this.isPlayer = arg.isPlayer || false;
        this.isAutoBuyHp=arg.isAutoBuyHp||false;//是否自动购买血包
        this.killCount = 0;//杀敌计数器，10个敌人奖励1发炮弹
        this.boomCount = arg.boomCount || 0;//导弹数量
        this.boomTimeOut = 0;
        this.isDie = false;
        this.xixie = arg.xixie || 0.01;
        this.tmp = {};
        this.baojilv = arg.baojilv || 0.01;
        this.baojishang = arg.baojishang || 2;
        this.img = glb.tankImg[this.exterior];
        this.id = Math.round(Math.random() * 10000000);
        this.keystate = {};
        this.autoShoot = arg.autoShoot || false;
        this.autoGetBoomCount = 0;
        this.buffList = new Set();
        this.poisonZidan=arg.poisonZidan||0;//毒子弹
        this.autoHuifu=0.1;//每分钟自动恢复血量的百分比默认20%
        this.repush();
        this.preAnimationTime = arg.preAnimationTime || 0;//前置动画时间
        if(this.preAnimationTime>0){
            this.stop=true;
            this.preAnimation();
            glb.pause||glb.playAudio("kehuan",true,false,0.5);
        }
        this.makeBuff(arg.buffNameList||[]);
    }
    makeBuff(buffNameList){
        const map={
            '中毒':DEBUFF_methysis,
            '毒药制造':BUFF_poisonMake,
            '炸弹制造':BUFF_bombMake
        }
        for(const buffName of buffNameList){
            const buff=map[buffName];
            if(buff){
                new buff({tank:this});
            }
        }
    }
    set moveSpeed(val) {
        this._moveSpeed = val;
        if (this._moveSpeed > 10) this._moveSpeed = 10;//移速最高10；
    }
    get moveSpeed() {
        return this._moveSpeed;
    }
    preAnimation(){
        if(!glb.pause){
            this.preAnimationImg=glb.skillImg2[(Number.MAX_SAFE_INTEGER- this.preAnimationTime)%glb.skillImg2.length];
            this.preAnimationTime--;            
        }
        if(this.preAnimationTime>0){
            setTimeout(()=>{this.preAnimation();},1000/10);
        }else{
            this.stop=false;
        }
    }
    repush() {
        this.width = this._size.width;
        this.height = this._size.height;
        this.img = glb.tankImg[this.exterior];
        this.stop = 0;
        this.isDie = false;
        this.index = glb.pushToArr(glb.tanklist, this);
        this.handle = setInterval(() => { this.loop() }, 20);
    }
    drawme() {
        if(this.preAnimationTime>0){//如果有前置动画
            glb.context.globalAlpha=0.5;
            glb.context.drawImage(this.img, this.xy.x, this.xy.y, this.width, this.height);
            glb.context.globalAlpha=1;
            this.preAnimationImg&&glb.context.drawImage(this.preAnimationImg, this.xy.x, this.xy.y, this.width, this.height);
            glb.context.fillStyle = 'white';
            let fsize = 10;
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(`正在召唤...`, this.xy.x+5, this.xy.y+20,);
            return;
        }
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
        glb.context.drawImage(this.img, x, y, this.width, this.height);//把图片绘制在旋转的中心点，
        glb.context.restore();//恢复状态

        //this.isPlayer&&glb.context.drawImage(glb.biankuangImg[0], x, y, this.width, this.height);
        if (this.boomCount > 0) {
            glb.context.drawImage(glb.biankuangImg[2], x+this.width, y-10, 20, 20);//画导弹图标
            glb.context.fillStyle = 'white';
            let fsize = 15;
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(`x${this.boomCount}`, x + this.width + 20, y+10);
        }
        if(y-35<0){
            y=y+(0-(y-35));
        }
        if (this.hp > 0) {// 画血条
            let color=this.belong===1?"green":"red";
            glb.context.fillStyle = color;
            glb.context.fillRect(x, y - 5, this.hp / this.maxhp * this.width, 5);
            glb.context.strokeStyle = color;
            glb.context.strokeRect(x, y - 5, this.width, 5);
        }
        if (this.name) {
            
            glb.context.fillStyle = this.fontColor;
            let fsize = 20;
            if(x+6+(this.chenghao+this.name).length*fsize>glb.width){
                x=glb.width-((this.chenghao+this.name).length*fsize+6);
            }
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(this.chenghao + this.name, x + 6, y - 15);
        }
    }
    xixiefun(val) {//吸血
        let x = val * this.xixie
        this.changeHp(x);
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: `吸血+${~~x}`, color: "green", size: 15 });
    }
    changeHp(val,whodid) {//改变血量
        this.hp += val;
        if (this.hp > this.maxhp) this.hp = this.maxhp;
        if (this.hp < 0) this.hp = 0;
        if(this.hp<=0){
            this.die(whodid);
        }
    }
    shoping(foodIndex) {//快速购买道具
        if(glb.pause)return;
        if(FOOD.list[foodIndex].money>this.score){
            new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: `无法购买道具${FOOD.list[foodIndex].text}，因为积分不足`, color: "red", size: 30 });
            return;
        }
        this.score -= FOOD.list[foodIndex].money;
        let food=new FOOD({ xy: { x: this.xy.x, y: this.xy.y }, act:foodIndex,who:this});
        food.action(this);
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg:`${this.name}快捷键购买了道具${FOOD.list[foodIndex].text}`, color: "green", size: 30 });
    }
    hasBuff(buffName){//判断自己是否拥有buff
        const list=this.buffList.values();
        for(let buff of list){
            if(buff.name===buffName){
                return buff;
            }
        }
        return undefined;
    }
    shoot() {
        if (this.stop) return;
        if ((new Date().getTime() - this.shootTimeout < this.shootSpeed)) return;
        this.shootTimeout = new Date().getTime();
        let { x, y } = this.xy;
        let width = this.tmp.zidanwidth || 15, height = this.tmp.zidanheight || 15;
        let zhuizongdan = this.zhuizongdan || this.tmp.zhuizongdan || 0;
        let zhalie = this.zhalie || this.tmp.zhalie || 0;
        glb.playAudio("zidan", true, false, 0.1);
        if(this.poisonZidan)
            new POISON({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.sh, xy: { x: x + this.width / 2 - width / 2, y: y + this.height / 2 - height / 2 }, belong: this.belong, exterior: 0, who: this, direction: this.direction, far: this.shootFar, width, height, zhalie, zhuizongdan });
        else 
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.sh, xy: { x: x + this.width / 2 - width / 2, y: y + this.height / 2 - height / 2 }, belong: this.belong, exterior: 0, who: this, direction: this.direction, far: this.shootFar, width, height, zhalie, zhuizongdan });
    }
    shoot1() {//导弹
        if (this.stop) return;
        if ((new Date().getTime() - this.boomTimeOut < 1000)) return;
        this.boomTimeOut = new Date().getTime();
        if (this.boomCount > 0) {
            glb.playAudio("missile");
            let width = 120, height = 120;
            new MISSILE({
                baojilv: this.baojilv,
                moveSpeed: 8,
                width, height,
                baojishang: this.baojishang, sh: 12000 + this.sh * 5,
                zhuizongdan: 0,
                xy: { x: this.xy.x + this.width / 2- width / 2 , y: this.xy.y + this.height / 2- height / 2 }, belong: this.belong, exterior: 0,
                who: this, direction: this.direction, far: this.shootFar * 5,
            });
            this.boomCount--;
        }

    }
    loop() {
        if (glb.pause||this.stop) return;
        if (this.killCount >= 10) {//杀敌10个奖励1发炮弹
            this.boomCount++;
            this.killCount = 0;
        }
        this.autoGetBoomCount++;
        if (this.autoGetBoomCount >= 50 * 40) {//每40秒奖励1发炮弹
            this.boomCount++;
            this.autoGetBoomCount = 0;
        }
        this.changeHp(Math.floor(this.maxhp * this.autoHuifu / 60 / 50));//自动恢复血量
        if (this.autoShoot) this.shoot();
        this.autoBuyHpFood();
        if (this.isai){ 
            this.ai();     
        }
        if (this.keystate["Numpad0"] || this.keystate["Space"] ) this.shoot1();
        if (this.keystate["ArrowLeft"] || this.keystate["KeyA"]) this.move(0);
        else if (this.keystate["ArrowUp"] || this.keystate["KeyW"]) this.move(1);
        else if (this.keystate["ArrowRight"] || this.keystate["KeyD"]) this.move(2);
        else if (this.keystate["ArrowDown"] || this.keystate["KeyS"]) this.move(3);
    }
    _dir(x,y,direction,moveSpeed){
        if (direction == 0) x -= moveSpeed;
        else if (direction == 2) x += moveSpeed;
        else if (direction == 1) y -= moveSpeed;
        else if (direction == 3) y += moveSpeed;
        return {x,y}
    }
    autoBuyHpFood(){//自动购买加血道具
        if(!this.isAutoBuyHp)return;
        if(this.hp<=this.maxhp/4&&this.score>=FOOD.list[1].money){//如果血量低于1/4，并且积分大于10000，就购买一个加生命的道具
            new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: "购买加生命道具", color: "green", size: 30 });
            this.score -= FOOD.list[1].money;
            let food=new FOOD({ xy: { x: this.xy.x, y: this.xy.y }, act:1,who:this});
            food.action(this);
        }
    }
    ai() {
        //if (Math.floor(Math.random() * 800) == 0) this.shoot1();//敌人有千分之一的概率发炮
        let hit=false;
        let direction=this.direction;
        for(let i=0;i<4;i++){//四个方向搜索
            let far=0;
            direction=(i+direction)%4;
            while(far<this.shootFar-60){//向前搜索直到碰撞或到达射程
                far+=40;
                let xy=this._dir(this.xy.x+this.width/2,this.xy.y+this.height/2,direction,far);
                hit=glb.checkhit({
                    xy,
                    id:this.id,
                    width: 5,
                    height: 5
                });
                if(hit!==false) break;
            }
            if(hit!==false) break;
        }
        this.ignoringTargets=this.ignoringTargets||new Set();//忽视目标

        if(hit!==false&&!this.ignoringTargets.has(hit.id)){//在射程内碰撞,并且不是忽视目标

            if(hit.type===glb.types.tank&&hit.belong!==this.belong&&hit.preAnimationTime<=0){//如果碰撞到敌方坦克并且没有动画
                if(this.direction!==direction){
                    this.move(direction)
                }
                //console.log(`${this.name}敌方坦克碰撞${hit.name}`);
                this.shoot();
                this.shoot1();//导弹
                return;
            }
            if(hit.type===glb.types.shuijing&&hit.isPlayer!==this.isPlayer&&hit.belong!==this.belong){//如果碰撞到水晶
                if(this.direction!==direction){
                    this.move(direction)
                }
                this.shoot();
                this.shoot1();//导弹
                return;
            }
            if(hit.type===glb.types.wall&&hit.belong!==this.belong){//如果碰撞到墙
                if(this.direction!==direction){
                    this.move(direction)
                }
                this.shoot();
                this.shootWallTryCount=this.shootWallTryCount||0;
                this.shootWallTryCount++;
                if(this.targetWallId!==hit.id) {
                    this.shootWallTryCount=0;
                    this.targetWallId=hit.id;//记录目标
                }
                if(this.shootWallTryCount>100){
                    this.shootWallTryCount=0;
                    this.ignoringTargets.add(hit.id);//忽视目标
                    setTimeout(()=>{this.ignoringTargets.delete(hit.id);},3000);//3秒后移除忽视目标
                }
                return;
            }
            if(hit.type===glb.types.food&&(!hit.who||hit.who.id==this.id)){//如果碰撞到食物
                //console.log(`${this.name}碰撞食物${hit.act}`);
                if (!this.move(direction)){//如果不能移动
                    this.ignoringTargets.add(hit.id);//忽视目标
                    setTimeout(()=>{this.ignoringTargets.delete(hit.id);},1000);//1秒后移除忽视目标
                    this.direction = Math.floor(Math.random() * 4);//随机换向
                }
                this.shoot();
                return;
            }
        }
        if (!this.move(this.direction)) this.direction = Math.floor(Math.random() * 4);//碰撞后随机换向
        if (Math.floor(Math.random() * 100) == 0) this.direction = Math.floor(Math.random() * 4);//随机换向
        this.shoot();
    }
    move(direction) {
        if (this.stop) return;
        if (direction != this.direction) { this.direction = direction; return true; };
        let { x, y } = this._dir(this.xy.x, this.xy.y, direction,this.moveSpeed);
        if (!glb.isin(x, y, this.width, this.height)) return false;//边界检查
        let oldxy = this.xy;
        this.xy = { x, y };
        let hit = glb.checkhit(this, ["tanklist", "walllist", 'shuijinglist','foodlist']);//碰撞检查
        if (!hit) return true;
        if (hit.type == glb.types.tank || hit.type == glb.types.wall||hit.type == glb.types.shuijing) {//如果碰撞到墙或者坦克
            this.xy = oldxy;
            return false;
        }
        if (hit.type == glb.types.food&&hit.who&&hit.who!==this){
            this.xy = oldxy;
            return false;//不是自己的食物不能踩上去
        }
        if (hit.type == glb.types.food&&(!hit.who||hit.who==this)) hit.action(this);//如果碰撞到食物
        this.direction = direction;
        return true;
    }
    zhongdan(zidan) {//中弹
        if (this.isDie||this.preAnimationTime>0) return;//死亡或者前置动画
        if (zidan.belong != this.belong && !this.stop) {
            if(zidan.isPoison){//毒子弹
                new DEBUFF_methysis({tank:this,whodid:zidan.who})
            }
            let hp = this.hp;
            let baoji = false;
            let sh = ~~(zidan.sh * 0.8 + Math.random() * (zidan.sh * 0.2));
            let msg = `-${sh}`;
            if (Math.random() <= zidan.baojilv) {
                sh = ~~(zidan.maxsh * zidan.baojishang);
                msg = `暴击-${sh}`;
                baoji = true;
            }
            this.changeHp(-sh,zidan.who);
            zidan.sh -= hp;
            zidan.who.xixiefun(sh);
            if (zidan.sh <= 0) zidan.die();
            zidan.boom(this);
            new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: msg, color: "red", size: baoji ? 40 : 20 });
        }
    }
    // zhongdu(zidan){//中毒
    //     if(this.isDie) return;
    //     if(this.zhongduTimer)clearInterval(this.zhongduTimer);
    //     this.zhongduCount=20;
    //     let how=0.05;
    //     this.zhongduTimer = setInterval(()=>{
    //         this.changeHp(-this.maxhp*how);//每秒减少5%
    //         new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: `中毒-${this.maxhp*how}`, color: "red", size: 40 });
    //         this.zhongduCount--;
    //         if(this.zhongduCount<=0){
    //             clearInterval(this.zhongduTimer);
    //         }
    //         if (this.hp <= 0) {
    //             this.die(zidan?.who);
    //             zidan?.who?.changeScore(this.score > 10000 ? 10000 : this.score);
    //             zidan?.who?.changeKillCount(1);
    //         }
    //     },1000)
    // }
    changeScore(v) {//增加积分
        this.score += v;
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: `积分${v}`, color: "yellow", size: 30 });
    }
    changeKillCount(v) {//修改杀敌数
        this.killCount += v;
    }
    die(who) {
        if (this.isDie) return;//已经死了
        this.isDie = true;
        if (this.handle) clearTimeout(this.handle);
        if(this.zhongduTimer)clearInterval(this.zhongduTimer);
        this.zhongduCount=0;
        this.stop = 1;
        glb.tanklist[this.index] = 0;
        this.index = -1;
        let jl = this.score >= 3000 ? Math.floor(Math.random() * (FOOD.list.length-1)) : Math.floor(Math.random() * 200);//积分大于3000必须有食物
        let food = FOOD.list.map((v, i) => i)[jl + 1] || 0;//有几率产生食物
        if (food) new FOOD({ xy: { x: this.xy.x, y: this.xy.y }, act: food, who });
        new TANKBOOM({ xy: { x: this.xy.x, y: this.xy.y }});
        who?.changeScore(this.score > 10000 ? 10000 : this.score);
        who?.changeKillCount(1);
    }
}
