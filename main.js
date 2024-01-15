"use strict"
let glb = {
    list: ["foodlist", "walllist", "tanklist", "zidanlist", "boomlist",'shuijinglist'],
    tanklist: [],
    zidanlist: [],
    walllist: [],
    shuijinglist:[],
    foodlist: [],
    boomlist: [],
    promptlist: [],
    pause: 0,
    pass: 0,
    width: 1200,
    height: 800,
    context: document.getElementById("can").getContext("2d"),
    tankImg: [],
    boomImg: [],
    tankboomImg: [],
    planeImg: [],
    zidanImg: [],
    foodImg: [],
    house: [],
    types: { tank: 0, zidan: 1, wall: 2, food: 3, plane: 4 },
    zidancolors: ["LightGray", "white", "blue", "yellow", "lime", "Purple", "Crimson"],
    isin: function (x, y, width, height) {
        return !(x < 0 || y < 0 || x > this.width - width || y > this.height - height);
    },
    makeTankimg: function () {
        for (let i = 0; i < 7; i++) {
            this.tankImg[i] = new Image();
            this.tankImg[i].src = `image/tank/${i}.png`
        }
        for (let i = 0; i < 3; i++) {
            this.planeImg[i] = new Image();
            this.planeImg[i].src = `image/plane/${i}.png`
        }
        for (let i = 0; i < 13; i++) {
            this.zidanImg[i] = new Image();
            this.zidanImg[i].src = `image/zidan/${i}.png`
        }
        for (let i = 0; i < FOOD.list.length; i++) {
            this.foodImg[i] = new Image();
            this.foodImg[i].src = `image/food/${i}.png`
        }
        for (let i = 0; i < 2; i++) {
            this.house[i] = new Image();
            this.house[i].src = `image/house/${i}.png`
        }
    },
    makeBoomimg: function () {
        for (let i = 0; i < 6; i++) {
            this.boomImg[i] = new Image();
            this.boomImg[i].src = `image/boom/${i}.png`
        }
        for (let i = 0; i < 4; i++) {
            this.tankboomImg[i] = new Image();
            this.tankboomImg[i].src = `image/tankboom/${i}.png`
        }
    },
    _checkhit: function (a, b) {//矩形碰撞检查
        if (a.x > b.x + b.width) return false;
        else if (b.x > a.x + a.width) return false;
        else if (a.y > b.y + b.height) return false;
        else if (b.y > a.y + a.height) return false;
        //console.log(a,b);
        return true;
    },
    checkhit: function (obj) {
        let list = ["foodlist", "walllist", "tanklist", 'shuijinglist'];
        for (let j = 0; j < list.length; j++) {
            let arr = glb[list[j]];
            for (let i = 0, l = arr.length; i < l; i++) {
                if (arr[i] && arr[i].id != obj.id) {
                    if (glb._checkhit({ x: arr[i].xy.x, y: arr[i].xy.y, width: arr[i].width, height: arr[i].height }, { x: obj.xy.x, y: obj.xy.y, width: obj.width, height: obj.height })) {
                        return arr[i];
                    }
                };
            }
        };
        return false;
    },
    tankNameList: ["猎鹰", "黑豹", "灰熊", "猛虎", "雄狮", "影狼", "银狐", "狂鲨", "金蝎", "火鸟", "冰龙"],
    getTankName: function () {
        let n = Math.floor(Math.random() * this.tankNameList.length);
        return this.tankNameList[n];
    },
    gamePause: function () {
        glb.pause = 1;
        new PROMPT({ xy: { x: glb.width / 2 - 200, y: glb.height / 2 }, msg: `暂停中`, color: "orange", size: 120, life: 100 })
    },
    gameStart: function () {
        glb.pause =0;
        new PROMPT({ xy: { x: glb.width / 2 - 200, y: glb.height / 2 }, msg: `继续`, color: "orange", size: 120, life: 100 })
    },
    audioPool:{
        boom:[],
        plane:[],
        zidan:[],
        pick:[],
        go:[],
        missile:[],
        die:[]
    },
    playAudio(name){
        for(let i=0;i<glb.audioPool[name].length;i++){//从Audio池中找播放完成的音频重复利用
            if(glb.audioPool[name][i].paused){
                glb.audioPool[name][i].currentTime=0;
                glb.audioPool[name][i].play();
                return glb.audioPool[name][i];
            }
        }
        glb.audioPool[name].push(new Audio(`audio/${name}.mp3`));
        glb.audioPool[name][glb.audioPool[name].length-1].play();
        if(name=='boom'){
            glb.audioPool[name][glb.audioPool[name].length-1].volume=0.4;
        }
        if(name=='zidan'){
            glb.audioPool[name][glb.audioPool[name].length-1].volume=0.1;
        }
        return glb.audioPool[name][glb.audioPool[name].length-1];
    }
}
let sleep = (timeout) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve() }, timeout);
    })
}
class PROMPT {//减血提示
    constructor(arg) {
        this.xy = arg.xy;
        this.msg = arg.msg;
        this.color = arg.color;
        this.size = arg.size;
        this.life=arg.life||50;
        this.moveCount = 0;
        this.onDie=arg.onDie||function(){};
        this.handle = setInterval(() => { this.loop() }, 50);
        this.index = glb.promptlist.push(this) - 1;
    }
    loop() {
        this.moveCount += 3;
        this.xy.y -= 3;
        if (this.moveCount >= this.life) this.die();
    }
    drawme() {
        //透明度
        glb.context.globalAlpha = 1 - this.moveCount / this.life;
        glb.context.fillStyle = this.color;
        glb.context.font = this.size + 'px Arial';
        glb.context.fillText(this.msg, this.xy.x, this.xy.y);
        glb.context.globalAlpha = 1;
    }
    die() {
        if (this.handle) clearTimeout(this.handle);
        if (glb.promptlist.length > this.index) glb.promptlist[this.index] = 0;
        this.onDie();
    }
}
class WALL {
    constructor(obj) {
        this.exterior = obj.exterior;
        this.hp = obj.hp;
        this.xy = obj.xy;
        this.id=obj.id||Math.random();
        this.width = obj.width || 40;
        this.height = obj.height || 40;
        this.type = glb.types.wall;
        this.food = obj.food;
        this.index = glb.walllist.push(this) - 1;


    }
    drawme() {
        const rgb=[
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
        if (this.hp <= 0) return this.die(zidan.isPlane?null:zidan.who);//飞机的子弹爆出的食物没有归属权
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
            this.die(zidan.isPlane?null:zidan.who);//飞机的子弹爆出的食物没有归属权
            zidan.who.changeScore(50);
            zidan.who.killCount++;
        };
        if (zidan.sh <= 0) zidan.die();
        zidan.boom(this);
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: msg, color: "white", size: 15 });
    }
    die(who) {
        if (glb.walllist.length > this.index) glb.walllist[this.index] = 0;
        if (this.food) new FOOD({ xy: { x: this.xy.x, y: this.xy.y }, act: this.food, who });
        //console.log(who);
    }
}
class BOOM {
    constructor(obj) {
        this.width = obj.width * 1.2 || 40;
        this.height = obj.height * 1.2 || 40;
        this.exterior = obj.exterior || 0;
        this.xy = obj.xy;
        this.id=obj.id||Math.random();
        this.index = glb.boomlist.push(this) - 1;
        this.img = glb.boomImg[2];
        this.play();
    }
    play() {
        glb.playAudio("boom");
        (async () => {
            for (let i = 0; i < glb.boomImg.length; i++) {
                this.img = glb.boomImg[i];
                await sleep(100);
            }
            this.die();
        })();
    }
    drawme() {
        let { x, y } = this.xy; 0
        glb.context.drawImage(this.img, x, y, this.width, this.height);
    }
    zhongdan(obj) {

    }
    die() {
        if (glb.boomlist.length > this.index) glb.boomlist[this.index] = 0;
    }
}
class FOOD {
    constructor(obj) {
        console.log(obj.act);
        this.type = glb.types.food;
        this.xy = obj.xy;
        this.id=obj.id||Math.random();
        this.width = obj.width || 40;
        this.height = obj.height || 40;
        this._size = { width: this.width, height: this.height };
        this.act = obj.act;
        this.who = obj.who;
        this.actstr = FOOD.list.map(item => item.singleStr);
        if(obj.act===0)return;
        this.index = glb.foodlist.push(this) - 1;
        this.timeout=30;
        this.dieTimeout=60;
        this.handle = setInterval(() => {
            this.loop()
        },1000);
    }
    loop(){
        if(glb.pause)return;
        this.timeout--;
        this.dieTimeout--;
        if(this.timeout<=0&&this.who!=null){
            this.who=null;//30后归属权清空
            this.dieTimeout=60;//60后消失
        }
        if(this.dieTimeout<=0){//60后消失
            this.die();
        }
    }
    static list=[
        {},//0
        { text: "回复生命", money: 10000 ,singleStr:'命'},//1
        { text: "玩家分数", money: 100000, hide: true,singleStr:'分' },//2
        { text: "攻击速度", money: 100000,singleStr:'速' },//3
        { text: "攻击伤害", money: 80000 ,singleStr:'伤'},//9
        { text: "射程", money: 100000 ,singleStr:'远'},//5
        { text: "移动速度", money: 100000 ,singleStr:'快'},//6
        { text: "炸裂子弹", money: 4000 ,singleStr:'裂'},//7
        { text: "炸矿", money: 4000 ,singleStr:'清'},//8
        { text: "空军支援", money: 80000, singleStr:'援' },//9
        { text: "暴击率", money: 80000 ,singleStr:'暴'},//10
        { text: "暴击效果", money: 80000 ,singleStr:'效'},//11
        { text: "追踪弹", money: 4000 ,singleStr:'追'},//12
        { text: "瞬移", money: 200000 ,singleStr:'瞬'},//13
        { text: "吸血效率", money: 100000 ,singleStr:'吸'},//14
        { text: "最大生命", money: 100000 ,singleStr:'力'},//15
    ]
    static getDataByid(id) {
        return FOOD.list[id];
    }
    drawme() {
        if(this.dieTimeout<30){
            let {width,height}=this._size;
            [this.width, this.height] = [this.dieTimeout%2===0 ? width : width *1.1, this.dieTimeout%2===0 ? height : height*1.1];
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
        }else{
            glb.context.fillStyle = 'red';
            let fsize = this.width / 4;
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(this.dieTimeout + '秒后消失', x, y - 5);
        }
    }
    action(obj) {
        if(this.who?.isPlayer&&!this.who?.isDie&&this.who?.id!==obj.id)return;//玩家不能拾取队友的东西;敌人的任意拾取
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
            obj.shootSpeed -= 20;
            msg = `射速+20`;
        }
        else if (this.act == 4) {
            obj.sh += 200;
            msg = `攻击力+200`;
        }
        else if (this.act == 5) {
            obj.shootFar += 20;
            msg = `射程+20`;
        }
        else if (this.act == 6) {
            obj.moveSpeed += 0.2;
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
            obj.maxhp += 50000;
            obj.hp = obj.maxhp;
            msg = `最大生命+50000`;
        }
        if (msg) new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: msg, color: "lime", size: 30 });
        this.die();
    }
    zhongdan(obj) {
        //obj.jump(this.ab.a,this.ab.b);
        //obj.die();
    }
    die() {
        clearTimeout(this.handle);
        if (glb.foodlist.length > this.index) glb.foodlist[this.index] = 0;
    }
}
class ZIDAN {
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
        this.baojilv = arg.baojilv || 0.01;
        this.baojishang = arg.baojishang || 2;
        this.far = arg.far || 200;//射程
        this.who = arg.who;//谁射的子弹
        this.isPlane = arg.isPlane||false;//是否是飞机的子弹
        this.zhalie = arg.zhalie || 0;//炸裂子弹
        this.moveCount = 0;
        this.zhuizongdan = arg.zhuizongdan || 0;
        this.id = Math.round(Math.random() * 10000000);
        this.handle = setInterval(() => { this.loop() }, 10);
        this.index = glb.zidanlist.push(this) - 1;
        if (this.zhuizongdan) this.findTarget();
    }
    findTarget() {//寻找目标自动追踪弹
        let jl = 9999999;
        let ret;
        let { x, y } = this.xy;
        for (const tank of glb.tanklist) {
            if (tank && tank.belong != this.belong) {
                let tmp = Math.pow(Math.pow(tank.xy.x - x, 2) + Math.pow(tank.xy.y - y, 2), 0.5);
                if (tmp < jl) {
                    jl = tmp;
                    ret = tank;
                }
            }
        }
        for(const shuijing of glb.shuijinglist){
            if(shuijing && shuijing.belong != this.belong){
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
        if (!glb.isin(x, y, this.width, this.height)) return this.die();//出屏幕
        this.moveCount += this.moveSpeed;
        if (this.zhalie && this.moveCount >= 100) {
            return this.die()//炸裂子弹
        }
        if (this.moveCount > this.far) return this.die();//有效射程
        this.xy = { x, y };
        let hit = glb.checkhit(this);
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
        //console.log(glb.cell[this.ab.a][this.ab.b]);
        if (glb.zidanlist.length > this.index) glb.zidanlist[this.index] = 0;
        clearTimeout(this.handle);
        if(this.zhalie){
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.maxsh, xy: this.xy, belong: this.belong, exterior: 0, who: this.who, direction: 0, far: this.far, width: this.width, height: this.height, zhuizongdan: this.zhuizongdan });
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.maxsh, xy: this.xy, belong: this.belong, exterior: 0, who: this.who, direction: 1, far: this.far, width: this.width, height: this.height, zhuizongdan: this.zhuizongdan });
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.maxsh, xy: this.xy, belong: this.belong, exterior: 0, who: this.who, direction: 2, far: this.far, width: this.width, height: this.height, zhuizongdan: this.zhuizongdan });
            new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.maxsh, xy: this.xy, belong: this.belong, exterior: 0, who: this.who, direction: 3, far: this.far, width: this.width, height: this.height, zhuizongdan: this.zhuizongdan });
        }
    }
}
class PLANE {//飞机
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
        this.index = glb.tanklist.push(this) - 1;
        this.handle = setInterval(() => { this.loop() }, 20);
        this.audio=glb.playAudio("plane");
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
            new ZIDAN({ sh: this.sh,isPlane:true, xy: { x: x + this.width / 2 - width / 2, y: y + this.height / 2 - height / 2 }, belong: this.belong, exterior: 0, who: this.who, direction: i, far: this.shootFar, width, height, zhalie: this.tmp.zhalie || 0 });
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
class SHUIJING {
    constructor(obj) {
        this.exterior = obj.exterior || 0;
        this.hp = obj.hp;
        this.img=glb.house[this.exterior];
        this.maxhp = obj.hp;
        this.xy = obj.xy;
        this.id=obj.id||Math.random();
        this.width = obj.width || 80;
        this.height = obj.height || 80;
        this.type = glb.types.wall;
        this.food = obj.food||1;
        this.belong = obj.belong;
        this.timeout = 0;
        this.isDie=false;
        this.index = glb.shuijinglist.push(this) - 1;
        this.loop();

    }
    drawme() {
        //glb.context.fillStyle = "red";
        let { x, y } = this.xy;
        //glb.context.fillRect(x, y, this.width - 1, this.height - 1);
        glb.context.drawImage(this.img, x, y, this.width, this.height);
        if (this.hp > 0) {// 画血条
            glb.context.fillStyle = "green";
            glb.context.fillRect(x, y + 5, this.hp / this.maxhp * this.width, 5);
            glb.context.strokeStyle = "green";
            glb.context.strokeRect(x, y + 5, this.width, 5);
        }
    }
    loop() {
        if (this.hp < this.maxhp) {
            this.hp += this.maxhp * 0.01;
            if (this.hp > this.maxhp) this.hp = this.maxhp;
        }
        this.timeout = setTimeout(() => {
            this.loop();
        }, 1000);
    }
    zhongdan(obj) {
        //console.log(obj.who);
        if (this.hp <= 0) return this.die(obj.who);
        if (obj.belong == 1 && this.belong == 1) return;
        if (obj.belong != 1 && this.belong == 2) return;
        //if(obj.belong==1)console.log(this.hp);
        let hp = this.hp;
        let sh = ~~(obj.sh * 0.8 + Math.random() * (obj.sh * 0.2));
        let msg = `-${sh}`;
        let baoji=false;
        if (Math.random() <= obj.baojilv) {
            sh = ~~(obj.maxsh * obj.baojishang);
            msg = `暴击-${sh}`;
            baoji=true;
        }
        this.hp -= sh;
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
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: msg, color: baoji?"red":"white", size: baoji?30:15 });
    }
    die(who) {
        if(this.isDie)return;
        this.isDie=true;
        glb.playAudio("die");
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
class TANK {
    constructor(arg) {//(生命,外观,立场,位置,面向,ID) 立场=0无敌 1我方 其他敌方,面向0=left 1=up 2=right 3=down
        this.hp = arg.hp;
        this.maxhp = arg.hp;
        this.exterior = arg.exterior;
        this.belong = arg.belong;
        this.xy = arg.xy;
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
        this.isPlayer = arg.isPlayer||false;
        this.killCount = 0;//杀敌计数器，10个敌人奖励1发炮弹
        this.boomCount = arg.boomCount||0;
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
        this.autoGetBoomCount=0;
        this.repush();
    }
    set moveSpeed(val) {
        this._moveSpeed = val;
        if (this._moveSpeed > 10) this._moveSpeed = 10;//移速最高10；
    }
    get moveSpeed() {
        return this._moveSpeed;
    }
    repush() {
        this.width = this._size.width;
        this.height = this._size.height;
        this.img = glb.tankImg[this.exterior];
        this.stop = 0;
        this.isDie = false;
        this.index = glb.tanklist.push(this) - 1;
        this.handle = setInterval(() => { this.loop() }, 20);
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
        glb.context.drawImage(this.img, x, y, this.width, this.height);//把图片绘制在旋转的中心点，
        glb.context.restore();//恢复状态
        if (this.hp > 0) {// 画血条
            glb.context.fillStyle = "green";
            glb.context.fillRect(x, y - 5, this.hp / this.maxhp * this.width, 5);
            glb.context.strokeStyle = "green";
            glb.context.strokeRect(x, y - 5, this.width, 5);
        }
        if (this.name) {
            glb.context.fillStyle = this.fontColor;
            let fsize = 20;
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(this.chenghao + this.name, x + 6, y - 15);
        }
        if (this.boomCount > 0) {
            glb.context.fillStyle = 'gray';
            let fsize = 18;
            glb.context.font = fsize + 'px Arial';
            glb.context.fillText(`导弹${this.boomCount}`, x + 6, y - 32);
        }
    }
    xixiefun(val) {
        let x = val * this.xixie
        this.changeHp(x);
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: `吸血+${~~x}`, color: "green", size: 15 });
    }
    changeHp(val) {
        this.hp += val;
        if (this.hp > this.maxhp) this.hp = this.maxhp;
        if (this.hp < 0) this.hp = 0;
    }
    shoot() {
        if (this.stop) return;
        if ((new Date().getTime() - this.shootTimeout < this.shootSpeed)) return;
        this.shootTimeout = new Date().getTime();
        let { x, y } = this.xy;
        let width = this.tmp.zidanwidth || 15, height = this.tmp.zidanheight || 15;
        let zhuizongdan = this.zhuizongdan || this.tmp.zhuizongdan || 0;
        let zhalie = this.zhalie || this.tmp.zhalie || 0;
        glb.playAudio("zidan");
        new ZIDAN({ baojilv: this.baojilv, baojishang: this.baojishang, sh: this.sh, xy: { x: x + this.width / 2 - width / 2, y: y + this.height / 2 - height / 2 }, belong: this.belong, exterior: 0, who: this, direction: this.direction, far: this.shootFar, width, height, zhalie, zhuizongdan });
    }
    shoot1() {//炮弹
        if (this.stop) return;
        if ((new Date().getTime() - this.boomTimeOut < 1000)) return;
        this.boomTimeOut = new Date().getTime();
        if (this.boomCount > 0) {
            glb.playAudio("missile");
            new ZIDAN({
                baojilv: this.baojilv ,
                moveSpeed:8,
                baojishang: this.baojishang , sh: 12000+this.sh * 5,
                zhuizongdan:1,
                xy: this.xy, belong: this.belong, exterior: 0,
                who: this, direction: this.direction, far: this.shootFar * 5, width: 55, height: 55
            });
            this.boomCount--;
        }

    }
    loop() {
        if (glb.pause) return;
        if (this.killCount >= 10) {//杀敌10个奖励1发炮弹
            this.boomCount++;
            this.killCount = 0;
        }
        this.autoGetBoomCount++;
        if(this.autoGetBoomCount>=50*40){//每40秒奖励1发炮弹
            this.boomCount++;
            this.autoGetBoomCount=0;
        }
        this.changeHp(Math.floor(this.maxhp*0.2/60/50));//每秒血量加50
        if (this.autoShoot) this.shoot();
        if (this.isai) this.ai();
        if (this.keystate["32"] || this.keystate["96"] || this.keystate["74"]) this.shoot1();
        if (this.keystate["37"] || this.keystate["65"]) this.move(0);
        else if (this.keystate["38"] || this.keystate["87"]) this.move(1);
        else if (this.keystate["39"] || this.keystate["68"]) this.move(2);
        else if (this.keystate["40"] || this.keystate["83"]) this.move(3);
    }
    ai() {
        if (!this.move(this.direction)) this.direction = Math.floor(Math.random() * 4);
        if (Math.floor(Math.random() * 50) == 0) this.direction = Math.floor(Math.random() * 4);
        if (Math.floor(Math.random() * 800) == 0)this.shoot1();//敌人有千分之一的概率发炮
        this.shoot();
    }
    move(direction) {
        if (this.stop) return;
        if (glb.shunyiing && glb.shunyiing != this.id) return;//瞬移时其他坦克不能动，防止卡住
        if (direction != this.direction) { this.direction = direction; return true; };
        let { x, y } = this.xy;
        if (direction == 0) x -= this.moveSpeed;
        else if (direction == 2) x += this.moveSpeed;
        else if (direction == 1) y -= this.moveSpeed;
        else if (direction == 3) y += this.moveSpeed;
        else return false;
        if (!glb.isin(x, y, this.width, this.height)) return false;
        let oldxy = this.xy;
        this.xy = { x, y };
        let hit = glb.checkhit(this);
        if (hit.type == glb.types.tank || hit.type == glb.types.wall) {
            this.xy = oldxy;
            return false;
        }
        if (hit.type == glb.types.food) hit.action(this);
        this.direction = direction;
        return true;
    }
    zhongdan(obj) {
        if (obj.belong != this.belong && !this.stop) {
            let hp = this.hp;
            let baoji=false;
            let sh = ~~(obj.sh * 0.8 + Math.random() * (obj.sh * 0.2));
            let msg = `-${sh}`;
            if (Math.random() <= obj.baojilv) {
                sh = ~~(obj.maxsh * obj.baojishang);
                msg = `暴击-${sh}`;
                baoji=true;
            }
            this.changeHp(-sh);
            obj.sh -= hp;
            if (this.hp <= 0) {
                this.die(obj.who);
                obj.who.changeScore(this.score>10000?10000:this.score);
                obj.who.killCount++;
            }
            obj.who.xixiefun(sh);
            if (obj.sh <= 0) obj.die();
            obj.boom(this);
            new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: msg, color: "red", size: baoji?40:20 });
        }
    }
    changeScore(v) {
        this.score += v;
        new PROMPT({ xy: { x: this.xy.x, y: this.xy.y - 10 }, msg: `积分+${v}`, color: "green", size: 40 });
    }
    die(who) {
        if(this.isDie)return;//已经死了
        this.isDie=true;
        if (this.handle) clearTimeout(this.handle);
        this.stop = 1;
        glb.playAudio("die");
        (async () => {//闪烁
            this.width *= 1.5;
            this.height *= 2;
            for (let i = 0; i < 4; i++) {
                this.img = glb.tankboomImg[i]
                await sleep(100);
            }
            glb.tanklist[this.index] = 0;
            this.index = -1;
            let jl=this.score>=3000?Math.floor(Math.random() *FOOD.list.length):Math.floor(Math.random() * 200);//积分大于3000必须有食物
            let food = FOOD.list.map((v,i)=>i)[jl+1] || 0;//有几率产生食物
            if (food) new FOOD({ xy: { x: this.xy.x, y: this.xy.y }, act: food, who });
        })();
    }
}
class Battlefield {
    constructor(playerCount = 1) {
        glb.context.canvas.width = glb.width;
        glb.context.canvas.height = glb.height;
        glb.makeTankimg();
        glb.makeBoomimg();
        this.pass = 0;
        this.playerCount = playerCount;
        this.init();
        this.drawAll();
        setInterval(() => { this.msgCallBackfun() }, 500);
        this.looptimehandle = setInterval(() => { this.loop() }, 500);
    }
    init() {
        this.pass = 0;
        let list = glb.list;
        list.forEach((v) => {
            glb[v] = [];
        });
        this.player1 = new TANK({ isPlayer:true,boomCount:3,sh:1800,autoShoot: true, hp: 150000, exterior: 5, belong: 1, xy: { x: 400, y: 750 }, direction: 1, moveSpeed: 1, name: localStorage.getItem("p1name") || "P1" });
        this.player2 = new TANK({ isPlayer:true,boomCount:3,sh:1800,autoShoot: true, hp: 150000, exterior: 6, belong: 1, xy: { x: 700, y: 750 }, direction: 1, isai: this.playerCount == 1 ? 1 : 0, moveSpeed: 1, name: localStorage.getItem("p2name")||"P2" });
        new SHUIJING({ hp: 20000 + this.pass * 2000, belong: 1, xy: { x: 550, y: 700 } });
    }
    set pass(val) {
        glb.pass = val;
    }
    get pass() {
        return glb.pass;
    }
    clearBoard() {
        glb.context.beginPath();
        glb.context.clearRect(0, 0, glb.width, glb.height);
    }
    pause(flag) {
        flag ? glb.gamePause() : glb.gameStart();
    }
    loop() {
        if (glb.pause) return;
        let oppcount = 0, humcount = 0, foodcount = 0, oppshuijingcount = 0, humshuijingcount = 0;
        for (const shuijing of glb.shuijinglist) {
            if (shuijing) {
                if (shuijing.belong == 2) oppshuijingcount++;
                else if (shuijing.belong == 1) humshuijingcount++;
            }
        }
        if (oppshuijingcount == 0) {//如果敌方水晶炸毁，炸毁所有敌方坦克
            for (let i = 0, l = glb.tanklist.length; i < l; i++) {
                if (glb.tanklist[i] && !glb.tanklist[i].isPlayer&&glb.tanklist[i].type!==glb.types.plane ) {
                    glb.tanklist[i].die();
                }
            }
        }

        for (let i = 0, l = glb.tanklist.length; i < l; i++) {
            if (glb.tanklist[i]) {
                if (!glb.tanklist[i].isPlayer) oppcount++;
                else humcount++;
            }
        }
        for (let i = 0; i < 7 - oppcount; i++) {//水晶不灭20秒后自动复活坦克
            if (oppshuijingcount > 0) {
                //console.log("产生坦克");
                   this.makeTank(null, null, null) 
                
            }
        }
        for (let i = 0, l = glb.foodlist.length; i < l; i++) {
            if (glb.foodlist[i]&&glb.foodlist[i].act!==13) foodcount++
        }

        for (let i = 0, l = glb.walllist.length; i < l; i++) {
            if (glb.walllist[i]) {
                if (glb.walllist[i].belong == 2) oppshuijingcount++;
                else if (glb.walllist[i].belong == 1) humshuijingcount++;
            }
        }
        if (humshuijingcount == 0) { 
            clearInterval(this.looptimehandle); 
            this.player1.die();
            this.player2.die();
            return alert("游戏结束"); 
        }
        if (oppcount == 0 && foodcount == 0) {
            glb.pause = true;
            for(let v of glb.zidanlist){//防止子弹带入下一关
                v&&v.die
            }
            glb.zidanlist = [];
            glb.walllist = [];
            glb.boomlist = [];
            glb.foodlist = [];
            glb.shuijinglist=[];
            if (this.player1.index==-1){
                this.player1.hp=this.player1.maxhp/2;
                this.player1.repush();
            }
            if (this.player2.index==-1){
                this.player2.hp=this.player2.maxhp/2;
                this.player2.repush();
            }
            this.player1.xy = { x: 300, y: 750 };
            this.player2.xy = { x: 700, y: 750 };
            this.player1.tmp = {};
            this.player2.tmp = {};
            new SHUIJING({ hp: 50000 + this.pass * 10000, belong: 1, xy: { x: 550, y: 700 }, exterior: 1 });
            new SHUIJING({ hp: 50000 + this.pass * 10000, belong: 2, xy: { x: 550, y: 100 } });
            for (let i = 0; i < 7; i++) {//随机生成坦克
                this.makeTank(null, null, { x: 0 + i * 120 + 50, y: 0 });
            }
            for (let i = 0; i < 250; i++) {
                let x = (i%(glb.width / 51))*51;
                let y = 100+Math.floor(i/(glb.width / 51))*51;
                if (glb.checkhit({ xy: { x, y }, width: 50, height: 50 })!=false||!glb.isin(x, y, 50, 50)) continue;
                new WALL({ hp: 1000 * Math.floor(Math.random() * 5)+this.pass*100, food: FOOD.list.map((v,i)=>i)[Math.floor(Math.random() * (150 + this.pass * 5))+1] || 0, xy: { x, y }, width: 50, height: 50 })
            }
            this.pass++;
            glb.playAudio("go");
            new PROMPT({ xy: { x: 300, y: glb.height/2 }, msg: `第${this.pass}关，准备！`, color: "orange", size: 80, life: 80,onDie:()=>{
                new PROMPT({ xy: { x: glb.width/2-200, y: glb.height/2 }, msg: `开始!`, color: "orange", size: 120, life: 100})
                glb.pause = false;
            } });
        }
    }
    killAll(){
        for (let i = 0, l = glb.tanklist.length; i < l; i++) {
            if (glb.tanklist[i]&&!glb.tanklist[i].isPlayer) glb.tanklist[i].die();
        }
    }
    makeTank(bl, name, xy,isPlayer=false) {
        let getChenghhao = function () {
            let chenghao = [
                {
                    name: "你的好朋友",
                    sh: 5,
                    moveSpeed: 2,
                    boomCount: 5,
                    zhuizongdan:1,
                    belong:1,
                    hp:20,
                },
                {
                    name: "搞笑的",
                    sh: 0.1,
                    score:100,
                    moveSpeed: 0.2
                },
                {
                    name: "嗑药的",
                    moveSpeed: 3,
                    score:3000,
                    fontColor:"purple",
                    shootSpeed: 800,
                },
                {
                    name: "愚蠢的",
                    belong: 12//攻击自己人
                },
                {
                    name: "慢悠悠的",
                    moveSpeed: 0.1
                },
                {
                    name: "敏捷的",
                    moveSpeed: 3,
                    score:1000,
                },
                {
                    name: "死神般的",
                    moveSpeed: 2,
                    hp: 10,
                    fontColor:"purple",
                    score:3000,
                    boomCount:1,
                    belong: 11,//攻击自己人
                    sh: 4
                },
                {
                    name: "疯狂的",
                    moveSpeed: 3,
                    hp: 12,
                    fontColor:"purple",
                    score:3000,
                    baojilv: 0.1,
                    zhuizongdan: 1,
                    boomCount:1,
                    sh: 3,
                    belong: 10//攻击自己人
                },
                {
                    name: "射的超远的",
                    shootFar: 5,
                    zhuizongdan:1,
                    score:3000,
                    fontColor:"purple",
                    boomCount:1,
                    sh: 0.5
                },
                {
                    name: "坚硬的",
                    score:2000,
                    hp: 5
                },
                {
                    name: "超级坚硬的",
                    fontColor:"purple",
                    score:3000,
                    hp: 13
                },
                {
                    name: "噩梦的",
                    hp: 10,
                    boomCount: 2,
                    fontColor:"purple",
                    score:3000,
                    sh: 5,
                    moveSpeed: 2,
                    beiong: 13
                },
                {
                    name: "难搞的",
                    hp: 10,
                    boomCount:1,
                    fontColor:"purple",
                    score:3000,
                    sh: 3,
                    moveSpeed: 2,
                    beiong: 2
                }
            ]
            for (let i = 0; i < 100; i++)
                chenghao.push({});
            let n = Math.floor(Math.random() * chenghao.length);
            return chenghao[n];
        };
        let size = bl == 1 ? null : (40 + Math.random() * 20);
        let ch = getChenghhao();
        let shootFar = (200 + this.pass * 2) * (ch.shootFar || 1);
        let shootSpeed = 1000 - (this.pass * 2 + (ch.shootSpeed || 1));
        let hp = (1500 + this.pass * 1000) * (ch.hp || 1);
        let sh = (1000 + this.pass * 70) * (ch.sh || 1);
        let boomCount = ch.boomCount || 0;
        let score=(ch.score||500);
        let belong = bl || (ch.belong || 2);
        let moveSpeed = (1 + this.pass * 0.01) * (ch.moveSpeed || 1);
        let baojilv=0.01+this.pass*0.002+(ch.baojilv||0);
        let baojishang=2+this.pass*0.01;
        let fontColor = ch.fontColor || "white";
        let chenghao = ch.name || "";
        let zhuizongdan = ch.zhuizongdan || 0;
        if (!xy) {
            while(true){
                xy = { x: Math.round(Math.random() * glb.width), y: Math.round(Math.random() * glb.height) };
                if (glb.checkhit({ xy, width: 60, height: 60 })==false&&glb.isin(xy.x, xy.y, 60, 60)) break;
            }
        }
        return new TANK({ isPlayer,fontColor,score,baojilv,baojishang,zhuizongdan,name,boomCount, chenghao, shootFar, shootSpeed, hp, exterior: bl == 1 ? 5 : Math.round(Math.random() * 4), sh, belong, xy, direction: 1, isai: bl == 1 ? 0 : 1, moveSpeed, width: size, height: size });
    }
    msgCallBackfun() {
        let arg = {
            pass: this.pass,
            p1: {
                name: this.player1.name,
                score: this.player1.score,
                hp: Math.round(this.player1.hp),
                sh: ~~this.player1.sh,
                shootSpeed: 1000 - this.player1.shootSpeed + 100,
                moveSpeed: Math.round(50 * this.player1.moveSpeed),
                shootFar: this.player1.shootFar,
                baojilv: this.player1.baojilv,
                baojishang: this.player1.baojishang,
                xixie: this.player1.xixie
            },
            p2: {
                name: this.player2.name,
                score: this.player2.score,
                hp: ~~this.player2.hp,
                sh: ~~this.player2.sh,
                shootSpeed: 1000 - this.player2.shootSpeed + 100,
                moveSpeed: Math.round(50 * this.player2.moveSpeed),
                shootFar: this.player2.shootFar,
                baojilv: this.player2.baojilv,
                baojishang: this.player2.baojishang,
                xixie: this.player2.xixie
            }
        }
        this.msgCallBack && this.msgCallBack(arg);
    }
    drawAll() {
        //const timer = Date.now();
        this.clearBoard();
        let list = ["shuijinglist", "walllist", "foodlist","tanklist", "zidanlist", "boomlist", "promptlist"];
        list.forEach((v) => {
            let arr = glb[v];
            let newarr = [];
            if (arr.length > 1000) {
                for (let i = 0, l = arr.length; i < l; i++) {
                    if (arr[i]) arr[i].index = newarr.push(arr[i]) - 1;//整理数组
                }
                glb[v] = newarr;
                arr = newarr;
            }
            for (let i = 0, l = arr.length; i < l; i++)
                if (arr[i]) arr[i].drawme();
        });
        //this.drawFps(Math.round((Date.now() - timer)));
        requestAnimationFrame(() => { this.drawAll() });
    }
    drawFps(fps) {
        glb.context.fillStyle = "red";
        glb.context.font = "20px Arial";
        glb.context.fillText(`FPS:${fps}`, 10, 20);
    }
    keydown(keyCode) {
        if (keyCode == 65 || keyCode == 87 || keyCode == 68 || keyCode == 83 || keyCode == 32 || keyCode == 74)
            this.player1.keystate[keyCode] = true;
        else
            this.player2.keystate[keyCode] = true;
    }
    keyup(keyCode) {
        this.player1.keystate[keyCode] = 0;
        this.player2.keystate[keyCode] = 0;
    }
}

let zc = new Battlefield(1);
document.onkeydown = (e) => {
    zc.keydown(e.keyCode);
}
document.onkeyup = (e) => {
    zc.keyup(e.keyCode);
}
zc.msgCallBack = (arg) => {
    $("#pass").text(`第${arg.pass}关`);
    $("#player1 .score").text(`得分:${arg.p1.score}`);
    $("#player1 .hp").text(`${arg.p1.name} 生命值:${arg.p1.hp}`);
    $("#player1 .sh").text(`伤害${arg.p1.sh}`);
    $("#player1 .sspeed").text(`射速${arg.p1.shootSpeed}`);
    $("#player1 .shootFar").text(`射程${arg.p1.shootFar}`);
    $("#player1 .moveSpeed").text(`移速${arg.p1.moveSpeed}`);
    $("#player1 .baojishang").text(`暴击伤害${arg.p1.baojishang.toFixed(2)}`);
    $("#player1 .baojilv").text(`暴击率${(arg.p1.baojilv * 100).toFixed(2)}%`);
    $("#player1 .xixie").text(`吸血率${(arg.p1.xixie * 100).toFixed(2)}%`);

    $("#player2 .score").text(`得分:${arg.p2.score}`);
    $("#player2 .hp").text(`${arg.p2.name} 生命值:${arg.p2.hp}`);
    $("#player2 .sh").text(`伤害${arg.p2.sh}`);
    $("#player2 .sspeed").text(`射速${arg.p2.shootSpeed}`);
    $("#player2 .shootFar").text(`射程${arg.p2.shootFar}`);
    $("#player2 .moveSpeed").text(`移速${arg.p2.moveSpeed}`);
    $("#player2 .baojishang").text(`暴击伤害${arg.p2.baojishang.toFixed(2)}`);
    $("#player2 .baojilv").text(`暴击率${(arg.p2.baojilv * 100).toFixed(2)}%`);
    $("#player2 .xixie").text(`吸血率${(arg.p2.xixie * 100).toFixed(2)}%`);
}

class SHOP {
    constructor() {
        this.make();
        document.getElementById("p1gwc").ondragover = function (e) {  //源对象在悬停在目标对象上时  
            e.preventDefault();  //阻止默认行为，使得drop可以触发  
        }
        document.getElementById("p2gwc").ondragover = function (e) {  //源对象在悬停在目标对象上时  
            e.preventDefault();  //阻止默认行为，使得drop可以触发  
        }
        document.getElementById("p1gwc").ondrop = function (e) { //源对象松手释放在了目标对象中  
            SHOP.chiose("p1gwc", e);
        }
        document.getElementById("p2gwc").ondrop = function (e) { //源对象松手释放在了目标对象中  
            SHOP.chiose("p2gwc", e);
        }
        $("#btn_shop").click(() => { zc.pause(1); $("#shop").show() });
        $("#btn_shop_cancel").click(() => { SHOP.cancel() });
        $("#btn_shop_buy").click(() => { SHOP.buy() });
    }
    make() {
        let ul = $("#shop .item-list");
        for (let i = 1; i < glb.foodImg.length; i++) {
            let data = FOOD.getDataByid(i);
            if (data.hide) continue;
            let m = data.money >= 10000 ? `${data.money / 10000}万` : `${data.money / 1000}千`;
            let li = `<li><img src="image/food/${i}.png" inx=${i}><p>${data.text}</p><p>$${m}</p></li>`;
            ul.append(li);

        }
        let srcList = document.querySelectorAll('.item-list li img');//找到全部img元素  
        for (let i = 0; i < srcList.length; i++) { //遍历img元素  
            let p = srcList[i];
            p.ondragstart = function (e) { //开始拖动源对象  
                e.dataTransfer.setData('inx', $(this).attr("inx"));
                //console.log(this);
            }
        }
    }
    static moneyCount(who) {
        let imgs = $(`#${who} ul img`);
        let count = 0;
        $.each(imgs, function (i, v) {
            let inx = $(v).attr("inx");
            let data = FOOD.getDataByid(~~inx);
            count += data.money;
        });
        return count;
    }
    static buy() {
        let p1money = SHOP.moneyCount("p1gwc");
        if (p1money > zc.player1.score) return alert("P1积分不够...");
        let p2money = SHOP.moneyCount("p2gwc");
        if (p2money > zc.player2.score) return alert("P2积分不够...");
        zc.player1.score -= p1money;
        zc.player2.score -= p2money;
        let p1 = [], p2 = [];
        let imgs = $(`#p1gwc ul img`);
        $.each(imgs, function (i, v) {
            let inx = $(v).attr("inx");
            p1.push(~~inx);
        });
        imgs = $(`#p2gwc ul img`);
        $.each(imgs, function (i, v) {
            let inx = $(v).attr("inx");
            p2.push(~~inx);
        });
        for (let i = 0; i < p1.length; i++) {
            new FOOD({ xy: zc.player1.xy, act: p1[i] });
        }
        for (let i = 0; i < p2.length; i++) {
            new FOOD({ xy: zc.player2.xy, act: p2[i] });
        }
        SHOP.cancel();
    }
    static cancel() {
        $("#shop").hide();
        $(`#p1gwc ul`).html("");
        $(`#p2gwc ul`).html("");
        SHOP.setzj("p1gwc", 0);
        SHOP.setzj("p2gwc", 0);
        zc.pause(0);
    }
    static setzj(who, z) {
        let j = z || SHOP.moneyCount(who);
        $(`#${who} .zj`).text(`总计:${j}`);
    }
    static chiose(who, e) {
        let inx = e.dataTransfer.getData('inx');
        if (inx == "") return;
        let ul = $(`#${who} ul`);
        if (ul.find("li").size() >= 4) return;
        let data = FOOD.getDataByid(~~inx);
        let li = `<li ondblclick="SHOP.remove(this)"><img src="image/food/${inx}.png" inx=${inx} title="${data.text}"></li>`;
        ul.append(li);
        SHOP.setzj(who);
    }
    static remove(obj) {
        let who = $(obj).parent().parent().attr("id");
        $(obj).remove();
        SHOP.setzj(who);
    }
}
let shop = new SHOP();
$(() => {
    $("#start").click(() => {
        location.reload();
        $("#pause").text("暂停");
    })
    $("#pause").click(function () {
        let $this = $(this);
        console.log($this.text());
        if ("暂停" == $this.text()) {
            zc.pause(1);
            $this.text("继续");
        } else {
            zc.pause(0);
            $this.text("暂停");
        }
    })
    $("#playercount").change(function () {
        let val = ~~$(this).val();
        zc.player2.isai = val == 1 ? 1 : 0;
        zc.playerCount = val;
    });
    $("#btn_save").click(function () {
        let p1name = $("#p1name").val();
        let p2name = $("#p2name").val();
        if (p1name == "") p1name = "P1";
        if (p2name == "") p2name = "P2";
        zc.player1.name = p1name;
        zc.player2.name = p2name;
        localStorage.setItem("p1name", p1name);
        localStorage.setItem("p2name", p2name);
    })
    window.addEventListener('beforeunload', function (e) {
        const confirmationMessage = "要记得保存！你确定要离开我吗？";
        (e || window.event).returnValue = confirmationMessage; // 兼容 Gecko + IE
        return confirmationMessage; // 兼容 Gecko + Webkit, Safari, Chrome
    });

})
function ondragoverfunction(e) {  //源对象在悬停在目标对象上时  
    e.preventDefault();  //阻止默认行为，使得drop可以触发  
} 