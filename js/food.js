import  { glb } from "./glb.js";
import { PLANE } from "./plane.js";
import { PROMPT } from "./prompt.js";
import { BOOM } from "./boom.js";
export const foodList=[
    {},//0
    { text: "回复生命", money: 20000, singleStr: '回血' },//1
    { text: "玩家分数", money: 100000, hide: true, singleStr: '分' },//2
    { text: "攻击速度", money: 100000, singleStr: '攻速', hide: true },//3
    { text: "攻击伤害", money: 80000, singleStr: '伤害', hide: true },//9
    { text: "射程", money: 100000, singleStr: '射程', hide: true },//5
    { text: "移动速度", money: 100000, singleStr: '移速', hide: true },//6
    { text: "炸裂子弹", money: 10000, singleStr: '炸裂' },//7
    { text: "炸矿", money: 4000, singleStr: '清矿', hide: true },//8
    { text: "空军支援", money: 100000, singleStr: '飞机', hide: true },//9
    { text: "暴击率", money: 80000, singleStr: '暴率', hide: true },//10
    { text: "暴击效果", money: 80000, singleStr: '爆伤', hide: true },//11
    { text: "追踪弹", money: 10000, singleStr: '追踪' },//12
    { text: "瞬移", money: 200000, singleStr: '瞬移', hide: true },//13
    { text: "吸血效率", money: 100000, singleStr: '吸血', hide: true },//14
    { text: "最大生命", money: 100000, singleStr: '体力', hide: true },//15
    { text: "宝箱盲盒", money: 100000, singleStr: '盲盒' },//16
    { text: "水晶护盾", money: 20000, singleStr: '保家' },//17
    { text: "导弹", money: 20000, singleStr: '导弹' , hide: true},//18
    { text: "炸弹", money: 1, singleStr: '小心', hide: true },//19
    { text: "毒药", money: 1, singleStr: '中毒', hide: true },//20
    { text: "坦克零件", money: 100000, singleStr: '零件', hide: true },//21
]
export class FOOD {
    constructor(obj) {
        //console.log(obj.act);
        this.type = glb.types.food;
        this.xy = obj.xy;
        this.id = obj.id || Math.random();
        this.width = obj.width || 50;
        this.height = obj.height || 50;
        this._size = { width: this.width, height: this.height };
        this.act = obj.act;
        this.who = obj.who;
        this.isDie = false;
        this.actstr = FOOD.list.map(item => item.singleStr);
        if (obj.act === 0) return;
        this.index = glb.pushToArr(glb.foodlist, this);
        this.timeout = 30;
        this.dieTimeout = 60;
        if(this.act===19||this.act===20){//炸弹毒药没有归属权，并且消失时间为20秒
            this.dieTimeout = 20;
            this.who = null;
        }
        this.handle = setInterval(() => {
            this.loop()
        }, 1000);
    }
    loop() {
        if (glb.pause) return;
        this.timeout--;
        this.dieTimeout--;
        if (this.who && this.who.isDie) {
            this.who = null;//权力者死亡，归属权清空
            this.dieTimeout = 60;//60后消失
        }
        if (this.timeout <= 0 && this.who != null) {
            this.who = null;//30后归属权清空
            this.dieTimeout = 60;//60后消失
        }
        if (this.dieTimeout <= 0) {//60后消失
            this.die();
        }
    }
    static list = foodList;
    static getDataByid(id) {
        return FOOD.list[id];
    }
    drawme() {
        if (this.dieTimeout < 30) {
            let { width, height } = this._size;
            [this.width, this.height] = [this.dieTimeout % 2 === 0 ? width : width * 1.1, this.dieTimeout % 2 === 0 ? height : height * 1.1];
        }
        let { x, y } = this.xy;
        glb.context.drawImage(glb.foodImg[this.act], x, y, this.width, this.height);
        glb.context.fillStyle = 'red';
        let fsize = this.width / 2.5;
        glb.context.font = fsize + 'px Arial';
        glb.context.fillText(this.actstr[this.act], x + fsize / 6, y + fsize);
        if (this.who && this.who.name) {
            glb.context.fillStyle = 'white';
            let fsize = this.width / 4;
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(this.timeout + '秒内属于' + this.who.name, x, y - 5);
        } else {
            glb.context.fillStyle = 'red';
            let fsize = this.width / 4;
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(this.dieTimeout + '秒后消失', x, y - 5);
        }
    }
    action(obj) {
        if (this.isDie) return;
        if (this.who && this.who.id !== obj.id) return;//有归属权的只能给自己使用
        obj.changeScore(1000);//不管吃到什么食物必给1000分
        obj.eatFoodCount++;
        if(obj.eatFoodCount===3&&!obj.isPlayer){
            obj.chenghao='贪吃鬼'+obj.chenghao;
            obj.fontColor='purple';
        }
        let msg = 0;
        glb.playAudio("pick");
        if (this.act == 1) {
            let hp = ~~(obj.maxhp - obj.hp);
            obj.hp = obj.maxhp;
            msg = `生命值+${hp}`
        }
        else if (this.act == 2) {
            obj.score += 80000;
            msg = `分数+80000`;
        }
        else if (this.act == 3) {
            obj.shootSpeed -= 10;
            msg = `射速+10`;
        }
        else if (this.act == 4) {
            obj.sh += 200;
            msg = `攻击力+200`;
        }
        else if (this.act == 5) {
            obj.shootFar += 10;
            msg = `射程+10`;
        }
        else if (this.act == 6) {
            obj.moveSpeed += 0.1;
            msg = `移动速度+10`;
        }
        else if (this.act == 7) {
            obj.tmp.zhalie = 1;
            msg = `使用炸裂弹`;
        }
        else if (this.act == 8) {//清空所有墙
            for (let i = 0; i < glb.walllist.length; i++)
                if (glb.walllist[i]) glb.walllist[i].die();//炸矿所得食物不属于任何人
            msg = `炸毁所有矿`;
        }
        else if (this.act == 9) {//空中支援
            new PLANE({ xy: { x: 0, y: glb.height / 2 - 150 / 2 }, direction: 2, sh: obj.sh, belong: obj.belong, exterior: obj.belong == 1 ? 1 : 2, width: 150, height: 150, who: obj });
            msg = `呼叫飞机支援`;
        }
        else if (this.act == 10) {
            obj.baojilv += 0.01;
            msg = `暴击率+1%`;
        }
        else if (this.act == 11) {
            obj.baojishang += 0.05;
            msg = `暴击效果+5%`;
        }
        else if (this.act == 12) {
            obj.tmp.zhuizongdan = 1;
            msg = `使用追踪弹`;
        }
        else if (this.act == 13) {
            //if(glb.shunyiing)return;
            //obj.shunyidaofood();
            for (let i = 0; i < glb.foodlist.length; i++) {
                if (glb.foodlist[i] && glb.foodlist[i].act != 13) glb.foodlist[i].action(obj);
            }
            msg = `全屏瞬移吃食物`;
        }
        else if (this.act == 14) {
            obj.xixie += 0.01;
            msg = `吸血+1%`;
        }
        else if (this.act == 15) {
            obj.maxhp += 25000;
            obj.hp = obj.maxhp;
            msg = `最大生命+25000`;
        }
        else if (this.act == 16) {
            let act = ~~(Math.random() * FOOD.list.length - 1) + 1;
            msg = `打开了宝箱,获得了${FOOD.list[act].text}`;
            setTimeout(() => {
                new FOOD({ xy: { x: obj.xy.x, y: obj.xy.y - 10 }, act, who: obj });
            }, 500);
        }
        else if (this.act == 17) {
            const belong = obj.belong===1 ? 1 : 2;
            msg = `水晶护盾，${belong === 1 ? "我方" : "敌方"}水晶血量大幅度提升`;
            for (const shuijing of glb.shuijinglist) {
                if (shuijing && shuijing.belong == belong) {
                    shuijing.hudun();
                }
            }
        }
        else if (this.act == 18) {
            msg = `导弹数+3枚`;
            obj.boomCount += 3;
        }
        else if (this.act == 19) {
            msg = `真倒霉，踩中炸弹,被炸掉一半血量!`;
            new BOOM({ xy: { x: obj.xy.x, y: obj.xy.y },width:obj.width,height:obj.height });
            let sh=~~(obj.hp/2);
            obj.changeHp(-sh);
            new PROMPT({ xy: { x: obj.xy.x, y: obj.xy.y - 10 }, msg: `被炸掉${sh}`, color: "red", size: 40 });
        }
        else if (this.act == 20) {
            msg = `真倒霉，吃了一口毒药，中毒了!`;
            obj.zhongdu();
        }
        else if (this.act == 21) {
            msg = `坦克零件，每分钟自动回血能力+1%`;
            obj.autoHuifu += 0.01;
        }
        if (msg) new PROMPT({ xy: { x: obj.xy.x, y: obj.xy.y - 10 }, msg: obj.name + '获得' + msg, color: "orange", size: 30, life: 100 });
        this.die();
    }
    zhongdan(obj) {
        //obj.jump(this.ab.a,this.ab.b);
        //obj.die();
    }
    die() {
        if (this.isDie) return;
        this.isDie = true;
        clearTimeout(this.handle);
        if (glb.foodlist.length > this.index) glb.foodlist[this.index] = 0;
    }
}
