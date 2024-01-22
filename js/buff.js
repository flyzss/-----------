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
        glb.buffList[this.index]=null;
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
        this.play();
        this.debuff();
    }
    async debuff(){
        const same=this.getSame();
        same&&same.die();//如果有同名BUFF就把它干掉
        const pps=0.055;//每秒掉血百分比
        let count=20;//持续时间
        while(!this.isDie&&!this.tank.isDie&&count>0){
            if(!glb.pause){
                this.tank.changeHp(-this.tank.maxhp*pps,this.whodid);
                new PROMPT({ xy: { x: this.tank.xy.x, y: this.tank.xy.y - 10 }, msg: `中毒-${this.tank.maxhp*pps}`, color: "red", size: 40 });
                count--;                
            }
            await sleep(1000);
        }
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
            await sleep(900);
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
            await sleep(900);
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
        this.baoxiang();
    }
    drawme() {
        if (!this.img) return;
        let { x, y } = this.tank.xy;
        let { width } = this.tank;
        glb.context.drawImage(this.img, x + width + 32, y + 20, 15, 15);
    }
    async baoxiang() { //每3秒钟随机位置生成一个宝箱
        while (!this.isDie && !this.tank.isDie) {
            let xy = glb.pause || this.tank.preAnimationTime > 0 ? null : this.getXy();
            if (xy) {
                new PROMPT({ xy: { x: xy.x, y: xy.y }, msg: `${this.tank.chenghao + this.tank.name}制造了宝箱`, color: "lightgreen", size: 30, life: 100 });
                new FOOD({ xy, act: 16 });
            }
            await sleep(1500);
        }
        this.die();
    }
}