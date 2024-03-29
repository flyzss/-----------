import { glb,sleep } from "./glb.js";
import { PROMPT } from "./prompt.js";
import { FOOD } from "./food.js";
export class BUFF{
    constructor(obj){
        this.tank = obj.tank;
        this.type = 'buff';
        this.name='none';
        this.imageList = obj.imageList;
        this.index=glb.pushToArr(glb.buffList,this);
        this.isDie=false;
        this.whodid=obj.whodid||null;
        this.tank.buffList.add(this);
    }
    async play(){//播放动画
        let i=0;
        if(this.imageList){
            while(!this.isDie&&!this.tank.isDie){
                this.img=this.imageList[i];
                i=(i+1)%this.imageList.length;
                await sleep(100);
            }            
        }
        this.die();
    }
    getSame(){//返回同名BUFF
        let list=this.tank.buffList.values();
        for(let buff of list){
            if(buff.name===this.name&&buff!==this)return buff;
        }
        return undefined;
    }
    getXy(width= 60, height= 60){
        let xy=null;
        let isFind=false;
        for(let i=0;i<2000;i++) {//最多尝试2000次
            xy = { x: Math.round(Math.random() * glb.width), y: Math.round(Math.random() * glb.height) };
            if (glb.checkhit({ xy, width,height }) == false && glb.isin(xy.x, xy.y, width, height)) {
                isFind = true;
                break;
            }
        }
        
        return isFind?xy:null
    }
    drawme(){
        if(!this.img)return;
        let {x,y}=this.tank.xy;
        let {width,height}=this.tank;
        glb.context.drawImage(this.img, x, y, width, height);
    }
    die(){
        if(this.isDie)return;
        this.isDie=true;
        glb.buffList[this.index]=0;
        this.tank.buffList.delete(this);
    }
}
/**
 * 中毒BUFF
 */
export class DEBUFF_methysis extends BUFF{
    constructor(obj){
        super(obj);
        this.imageList=glb.methysisImg;
        this.type='debuff';
        this.name='中毒';
        this.pps=0.055;//每秒掉血百分比
        this.play();
        this.debuff();
    }
    async debuff(){
        const same=this.getSame();
        if(same){
            this.pps=same.pps+0.01;//中毒效果增加
            same.die();//如果有同名BUFF就把它干掉
        }
        const pps=this.pps;
        let count=20;//持续时间
        while(!this.isDie&&!this.tank.isDie&&count>0){
            if(!glb.pause){
                const hp=Math.floor(this.tank.maxhp*pps);
                this.tank.changeHp(-hp,this.whodid);
                new PROMPT({ xy: { x: this.tank.xy.x, y: this.tank.xy.y - 10 }, msg: `中毒-${hp}`, color: "red", size: 40 });
                count--;                
            }
            await sleep(1000);
        }
        this.die();
    }  
}
/**
 * 眩晕DEBUFF
 */
export class DEBUFF_dizziness extends BUFF{
    constructor(obj){
        super(obj);
        this.imageList=glb.dizzinessImg;
        this.type='debuff';
        this.name='眩晕';
        this.play();
        this.debuff();
    }
    async debuff(){
        let count=20;//持续时间
        while(!this.isDie&&!this.tank.isDie&&count>0){
            this.tank.dizziness=true;
            if(!glb.pause){
                count--;                
            }
            await sleep(1000);
        }
        this.tank.dizziness=false;
        this.die();
    }  
}
/**
 * 毒药制造者，每3秒钟随机位置生成一个毒药
 */
export class BUFF_poisonMake extends BUFF{
    constructor(obj){
        super(obj);
        this.type='buff';
        this.name='毒药制造';
        this.img=glb.foodImg[20];
        this.sleep=obj.sleep||900;//延迟时间
        this.poison();
    }
    drawme(){
        if(!this.img)return;
        let {x,y}=this.tank.xy;
        let {width}=this.tank;
        glb.context.drawImage(this.img, x+width, y+20, 15, 15);
    }
    async poison(){//每2秒钟随机位置生成一个毒药
        while(!this.isDie&&!this.tank.isDie){
            let xy=glb.pause||this.tank.preAnimationTime>0?null:this.getXy();
            if(xy){
                new PROMPT({ xy:{x:xy.x,y:xy.y}, msg: `${this.tank.chenghao+this.tank.name}制造了毒药`, color: "lightgreen", size: 30,life:100 });
                new FOOD({ xy, act: 20 });
            }
            await sleep(this.sleep);
        }
        this.die();
    }
}
/**
 * 炸弹制造者，每3秒钟随机位置生成一个炸弹
 */
export class BUFF_bombMake extends BUFF{
    constructor(obj){
        super(obj);
        this.type='buff';
        this.name='炸弹制造';
        this.img=glb.foodImg[19];
        this.sleep=obj.sleep||900;//延迟时间
        this.bomb();
    }
    drawme(){
        if(!this.img)return;
        let {x,y}=this.tank.xy;
        let {width}=this.tank;
        glb.context.drawImage(this.img, x+width+16, y+20, 15, 15);
    }
    async bomb(){//每2秒钟随机位置生成一个炸弹
        while(!this.isDie&&!this.tank.isDie){
            let xy=glb.pause||this.tank.preAnimationTime>0?null:this.getXy();
            if(xy){
                new PROMPT({ xy:{x:xy.x,y:xy.y}, msg: `${this.tank.chenghao+this.tank.name}制造了炸弹`, color: "lightgreen", size: 30,life:100 });
                new FOOD({ xy, act: 19 });
            }
            await sleep(this.sleep);
        }
        this.die();
    }
}
/**
 * 宝箱制造者，每3秒钟随机位置生成一个宝箱
 */
export class BUFF_baoxiangMake extends BUFF {
    constructor(obj) {
        super(obj);
        this.type = 'buff';
        this.name = '宝箱制造';
        this.img = glb.foodImg[16];
        this.sleep=obj.sleep||1000;//延迟时间
        this.baoxiang();
    }
    drawme() {
        if (!this.img) return;
        let { x, y } = this.tank.xy;
        let { width } = this.tank;
        glb.context.drawImage(this.img, x + width + 32, y + 20, 15, 15);
    }
    async baoxiang() { //每1秒钟随机位置生成一个宝箱
        while (!this.isDie && !this.tank.isDie) {
            let xy = glb.pause || this.tank.preAnimationTime > 0 ? null : this.getXy();
            if (xy) {
                new PROMPT({ xy: { x: xy.x, y: xy.y }, msg: `${this.tank.chenghao + this.tank.name}制造了宝箱`, color: "lightgreen", size: 30, life: 100 });
                new FOOD({ xy, act: 16 });
            }
            await sleep(this.sleep);
        }
        this.die();
    }
}
/**
 * 自动购买hp
 */
export class BUFF_autoBuyHp extends BUFF {
    constructor(obj) {
        super(obj);
        this.type = 'buff';
        this.name = '自动购买生命值';
        this.img = glb.foodImg[1];
        this.sleep=obj.sleep||2000;//延迟时间
        this.autoBuyHp()
    }
    drawme() {
        if (!this.img) return;
        let { x, y } = this.tank.xy;
        let { width } = this.tank;
        glb.context.drawImage(this.img, x + width, y + 35, 15, 15);
    }
    async autoBuyHp() { //每2秒钟检查血量并购买药
        while (!this.isDie && !this.tank.isDie) {
            this.tank.autoBuyHpFood();
            await sleep(this.sleep);
        }
        this.die();
    }
}