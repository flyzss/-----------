import { glb, sleep } from "./glb.js";
import { PLANE } from "./plane.js";
import { PROMPT } from "./prompt.js";
import { BOOM } from "./boom.js";
import { DEBUFF_methysis, DEBUFF_dizziness } from "./buff.js";
export const foodList = [
    { hide: true },//0
    { text: "回复生命", money: 3000, singleStr: '回血', sort: 1 },//1
    { text: "玩家分数", money: 100000, hide: true, singleStr: '分' },//2
    { text: "攻击速度", money: 100000, singleStr: '攻速', hide: true },//3
    { text: "攻击伤害", money: 80000, singleStr: '伤害', hide: true },//9
    { text: "射程", money: 100000, singleStr: '射程', hide: true },//5
    { text: "移动速度", money: 100000, singleStr: '移速', hide: true },//6
    { text: "炸裂子弹", money: 10000, singleStr: '炸裂', sort: 2 },//7
    { text: "炸矿", money: 1, singleStr: '清矿', hide: true },//8
    { text: "空军支援", money: 100000, singleStr: '飞机', hide: true },//9
    { text: "暴击率", money: 80000, singleStr: '暴率', hide: true },//10
    { text: "暴击效果", money: 80000, singleStr: '爆伤', hide: true },//11
    { text: "追踪弹", money: 10000, singleStr: '追踪', sort: 3 },//12
    { text: "瞬移", money: 200000, singleStr: '瞬移', hide: true },//13
    { text: "吸血效率", money: 100000, singleStr: '吸血', hide: true },//14
    { text: "最大生命", money: 100000, singleStr: '体力', hide: true },//15
    { text: "宝箱盲盒", money: 100000, singleStr: '盲盒', sort: 4 },//16
    { text: "水晶护盾", money: 20000, singleStr: '保家', sort: 5 },//17
    { text: "导弹", money: 30000, singleStr: '导弹', sort: 6 },//18
    { text: "炸弹", money: 1, singleStr: '小心', hide: true },//19
    { text: "毒药", money: 1, singleStr: '中毒', hide: true },//20
    { text: "坦克零件", money: 100000, singleStr: '零件', hide: true },//21
    { text: "头晕目眩", money: 1, singleStr: '眩晕', hide: true },//22
    { text: "复活机会", money: 400000, singleStr: '复活', sort: 7, count: 10 },//23  count为该物品在食物池中的数量，默认为100，，该值等于0时食物不会出现
]
export const foodPool = [];//食物概率池
export const badFoodList=[13,19,20,22];

export class FOOD {
    constructor(obj) {
        //console.log(obj.act);
        this.type = glb.types.food;
        this.xy = obj.xy;
        this.id = obj.id || Math.random();
        this.width = obj.width || 50;
        this.height = obj.height || 50;
        this._size = { width: this.width, height: this.height };
        this.act = obj.act || FOOD.getRndFoodNum();
        this.who = obj.who;
        this.isDie = false;
        this.actstr = FOOD.list.map(item => item.singleStr);
        if (obj.act === 0) return;
        this.index = glb.pushToArr(glb.foodlist, this);
        this.timeout = 30;
        this.dieTimeout = 60;
        if ([19, 20, 22].includes(this.act)) {//炸弹毒药没有归属权，并且消失时间为20秒
            this.dieTimeout = 20;
            this.who = null;
        }
        this.handle = setInterval(() => {
            this.loop()
        }, 1000);
    }
    /**
     * 随机返回一个食物
     * @returns 
     */
    static getRndFoodNum() {
        if (foodPool.length == 0) {
            for (let i = 1; i < FOOD.list.length; i++) {
                for (let j = 0; j < (FOOD.list[i].count ?? 100); j++) {//每个食物默认放入池子100个。
                    foodPool.push(i);
                }
            }
        }
        return foodPool[Math.floor(Math.random() * foodPool.length)];
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
        if (obj.eatFoodCount === 3 && !obj.isPlayer) {
            obj.chenghao = '贪吃鬼' + obj.chenghao;
            obj.fontColor = 'purple';
        }
        let msg = 0;
        glb.playAudio("pick");
        if (this.act == 1) {
            let hp = 100000 //~~(obj.maxhp - obj.hp);
            obj.hp += hp;//obj.maxhp;
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
            (async () => {
                for (const wall of glb.walllist) {
                    if (wall && wall.belong === undefined) {
                        wall.die();//炸矿所得食物不属于任何人
                        new BOOM({ xy: { x: wall.xy.x, y: wall.xy.y }, width: wall.width, height: wall.height });
                        await sleep(10);
                    }
                }
            })()

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
                if (glb.foodlist[i] && glb.foodlist[i].act != 13) {
                    glb.foodlist[i].action(obj);
                    //new PROMPT({ xy: { ...glb.foodlist[i].xy }, msg: `${obj.chenghao}${obj.name}全屏瞬移吃食物` });
                }
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
            msg = `最大生命+25000,并回满血。`;
        }
        else if (this.act == 16) {
            let act = FOOD.getRndFoodNum();
            while ([13, 19, 20, 22].includes(act)) {//宝箱里没有负面效果
                act = FOOD.getRndFoodNum();
            }
            msg = `打开了宝箱,获得了${FOOD.list[act].text}`;
            setTimeout(() => {
                new FOOD({ xy: { x: obj.xy.x, y: obj.xy.y - 10 }, act, who: obj });
            }, 500);
        }
        else if (this.act == 17) {
            const belong = obj.belong === 1 ? 1 : 2;
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
            msg = `真倒霉，踩中炸弹,被炸掉大半血量!`;
            new BOOM({ xy: { ...this.xy }, width: obj.width, height: obj.height });
            let sh = ~~(obj.maxhp * 0.9);
            obj.changeHp(-sh);
            new PROMPT({ xy: { x: obj.xy.x, y: obj.xy.y - 10 }, msg: `被炸掉${sh}`, color: "red", size: 40 });
        }
        else if (this.act == 20) {
            msg = `真倒霉，吃了一口毒药，中毒了!`;
            new DEBUFF_methysis({ tank: obj })
        }
        else if (this.act == 21) {
            msg = `坦克零件，每分钟自动回血能力+1%`;
            obj.autoHuifu += 0.01;
        }
        else if (this.act == 22) {
            msg = `头晕目眩，分不清方向了`;
            new DEBUFF_dizziness({ tank: obj })
        }
        else if (this.act == 23) {
            msg = `原地复活机会+1`;
            obj.life += 1;
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
        if (this.index>-1) glb.foodlist[this.index] = 0;
        this.index=-1;
    }
}
