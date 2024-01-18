import  { glb } from "./glb.js";
import { TANK } from "./tank.js";
import { PROMPT } from "./prompt.js";
import { WALL } from "./wall.js";
import { SHUIJING } from "./shuijing.js";
import { FOOD } from "./food.js";
export class Battlefield {
    constructor(playerCount = 1) {
        glb.context.canvas.width = glb.width;
        glb.context.canvas.height = glb.height;
        glb.makeTankimg();
        glb.makeBoomimg();
        this.pass = 0;
        this.playerCount = playerCount;
        this.init();
        this.drawAll();
        this.bgm = new Audio('audio/bgm1.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 1;
        setInterval(() => { this.msgCallBackfun() }, 500);
        this.looptimehandle = setInterval(() => { this.loop() }, 500);
    }
    init() {
        this.pass = 0;
        let list = glb.list;
        list.forEach((v) => {
            glb[v] = [];
        });
        this.player1 = new TANK({ isPlayer: true,baojilv:0.05,baojishang:3, width: 60, height: 60, boomCount: 3, sh: 1800, autoShoot: true, hp: 150000, exterior: 0, belong: 1, direction: 1, moveSpeed: 2, name: localStorage.getItem("p1name") || "P1" });
        this.player2 = new TANK({ isPlayer: true,baojilv:0.05,baojishang:3, width: 60, height: 60, boomCount: 3, sh: 1800, autoShoot: true, hp: 150000, exterior: 1, belong: 1, direction: 1, isai: this.playerCount == 1 ? 1 : 0, moveSpeed: 2, name: localStorage.getItem("p2name") || "P2" });
        this.resetPos();
        new SHUIJING({ hp: 20000 + this.pass * 2000, belong: 1,isPlayer: true, xy: { x: 550, y: 700 } });
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
    gamePause() {
        glb.pause = 1;
        new PROMPT({ xy: { x: glb.width / 2 - 200, y: glb.height / 2 }, msg: `暂停中`, color: "orange", size: 120, life: 100 })
    }
    gameStart() {
        glb.pause = 0;
        new PROMPT({ xy: { x: glb.width / 2 - 200, y: glb.height / 2 }, msg: `继续`, color: "orange", size: 120, life: 100 })
    }
    pause(flag) {
        if (flag) {
            this.gamePause();
            this.bgm.pause()
        } else {
            this.gameStart();
            this.bgm.play();
        }
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
                if (glb.tanklist[i] && !glb.tanklist[i].isPlayer && glb.tanklist[i].type !== glb.types.plane) {
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
            if (glb.foodlist[i] && glb.foodlist[i].act !== 13) foodcount++
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
            this.bgm.pause();
            glb.pause = true;
            this.gameOver=true;
            this.drawGameOver();
            setTimeout(() => {
                const audio=new Audio('audio/gameover.mp3');
                audio.play();
            },500);
            return ;
        }
        if (oppcount == 0 && foodcount == 0) {
            glb.pause = true;
            this.bgm.pause();
            for (let v of glb.zidanlist) {//防止子弹带入下一关
                v && v.die
            }
            glb.zidanlist = [];
            glb.walllist = [];
            glb.boomlist = [];
            glb.foodlist = [];
            glb.shuijinglist = [];
            if (this.player1.index == -1) {
                this.player1.hp = this.player1.maxhp / 2;
                this.player1.repush();
            }
            if (this.player2.index == -1) {
                this.player2.hp = this.player2.maxhp / 2;
                this.player2.repush();
            }
            this.player1.tmp = {};
            this.player2.tmp = {};
            this.resetPos();
            new SHUIJING({ hp: 50000 + this.pass * 10000, belong: 1,isPlayer:true, xy: { x: 550, y: 700 }, exterior: 1 });
            new SHUIJING({ hp: 50000 + this.pass * 10000, belong: 2, xy: { x: 550, y: 100 } });
            for (let i = 0; i < 7; i++) {//随机生成坦克
                this.makeTank(null, null, { x: 0 + i * 120 + 50, y: 0 });
            }
            for (let i = 0; i < 189; i++) {
                let x = (i % (glb.width / 61)) * 61;
                let y = 140 + Math.floor(i / (glb.width / 61)) * 61;
                if (glb.checkhit({ xy: { x, y }, width: 60, height: 60 }) != false || !glb.isin(x, y, 60, 60)) continue;
                new WALL({ hp: 1000 * Math.floor(Math.random() * 5) + this.pass * 100, food: FOOD.list.map((v, i) => i)[Math.floor(Math.random() * (150 + this.pass * 5)) + 1] || 0, xy: { x, y }, width: 60, height: 60 })
            }
            this.pass++;
            glb.playAudio("go");
            new PROMPT({
                xy: { x: 300, y: glb.height / 2 }, msg: `第${this.pass}关，准备！`, color: "orange", size: 80, life: 80, onDie: () => {
                    new PROMPT({ xy: { x: glb.width / 2 - 200, y: glb.height / 2 }, msg: `开始!`, color: "orange", size: 120, life: 100 })
                    glb.pause = false;
                    this.bgm.currentTime = 0;
                    this.bgm.play();
                }
            });
        }
    }
    resetPos() {
        this.player1.xy = { x: 300, y: 740 };
        this.player2.xy = { x: 700, y: 740 };
    }
    killAll() {
        for (let i = 0, l = glb.tanklist.length; i < l; i++) {
            if (glb.tanklist[i] && !glb.tanklist[i].isPlayer) glb.tanklist[i].die();
        }
    }
    makeTank(bl, name, xy, isPlayer = false) {
        let getChenghhao = function () {
            let chenghao = [
                {
                    name: "好朋友",
                    sh: 5,
                    moveSpeed: 2,
                    boomCount: 5,
                    //zhuizongdan: 1,
                    belong: 1,
                    hp: 20,
                },
                {
                    name: "搞笑的",
                    sh: 0.1,
                    score: 100,
                    moveSpeed: 0.2
                },
                {
                    name: "嗑药的",
                    moveSpeed: 3,
                    score: 3000,
                    fontColor: "purple",
                    shootSpeed: 800,
                },
                {
                    name: "大聪明",
                    belong: 12//攻击自己人
                },
                {
                    name: "慢悠悠的",
                    moveSpeed: 0.1
                },
                {
                    name: "敏捷的",
                    moveSpeed: 3,
                    score: 1000,
                },
                {
                    name: "死神",
                    moveSpeed: 2,
                    hp: 10,
                    fontColor: "purple",
                    score: 3000,
                    boomCount: 1,
                    belong: 11,//攻击自己人
                    sh: 4
                },
                {
                    name: "疯狂的",
                    moveSpeed: 3,
                    hp: 12,
                    fontColor: "purple",
                    score: 3000,
                    baojilv: 0.1,
                    //zhuizongdan: 1,
                    boomCount: 1,
                    sh: 3,
                    belong: 10//攻击自己人
                },
                {
                    name: "狙击手",
                    shootFar: 5,
                    zhuizongdan: 1,
                    score: 3000,
                    fontColor: "purple",
                    boomCount: 1,
                    sh: 0.5
                },
                {
                    name: "坚硬的",
                    score: 2000,
                    hp: 5
                },
                {
                    name: "超级坚硬的",
                    fontColor: "purple",
                    score: 3000,
                    hp: 13
                },
                {
                    name: "噩梦的",
                    hp: 10,
                    boomCount: 2,
                    fontColor: "purple",
                    score: 3000,
                    sh: 5,
                    moveSpeed: 2,
                    beiong: 13
                },
                {
                    name: "难搞的",
                    hp: 10,
                    boomCount: 1,
                    fontColor: "purple",
                    score: 3000,
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
        let size = 50;
        let ch = getChenghhao();
        let shootFar = (200 + this.pass * 2) * (ch.shootFar || 1);
        let shootSpeed = 1000 - (this.pass * 2 + (ch.shootSpeed || 1));
        let hp = (1500 + this.pass * 500) * (ch.hp || 1);
        let sh = (1000 + this.pass * 70) * (ch.sh || 1);
        let boomCount = ch.boomCount || 0;
        let score = (ch.score || 500);
        let belong = bl || (ch.belong || 2);
        let moveSpeed = (1 + this.pass * 0.01) * (ch.moveSpeed || 1);
        let baojilv = 0.01 + this.pass * 0.002 + (ch.baojilv || 0);
        let baojishang = 2 + this.pass * 0.01;
        let fontColor = ch.fontColor || "white";
        let chenghao = ch.name || "";
        let zhuizongdan = ch.zhuizongdan || 0;
        if (!xy) {
            while (true) {
                xy = { x: Math.round(Math.random() * glb.width), y: Math.round(Math.random() * glb.height) };
                if (glb.checkhit({ xy, width: 60, height: 60 }) == false && glb.isin(xy.x, xy.y, 60, 60)) break;
            }
        }
        if(fontColor==='purple'){
            glb.playAudio('warning')//强敌来袭警告
            new PROMPT({ xy:{...xy}, msg: '强敌来袭警告!', color: 'purple', size: 30, life: 200});
        }
        return new TANK({ isPlayer,preAnimationTime:20, fontColor, score, baojilv, baojishang, zhuizongdan, name, boomCount, chenghao, shootFar, shootSpeed, hp, sh, belong, xy, direction: 1, isai: bl == 1 ? 0 : 1, moveSpeed, width: size, height: size });
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
                xixie: this.player1.xixie,
                huifu: this.player1.autoHuifu
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
                xixie: this.player2.xixie,
                huifu: this.player2.autoHuifu
            }
        }
        this.msgCallBack && this.msgCallBack(arg);
    }
    drawAll() {
        //const timer = Date.now();
        if(this.gameOver) return;
        this.clearBoard();
        let list = ["walllist","shuijinglist",  "foodlist", "tanklist", "zidanlist", "boomlist", "promptlist"];
        list.forEach((v) => {
            let arr = glb[v];
            // let newarr = [];
            // if (arr.length > 1000) {
            //     for (let i = 0, l = arr.length; i < l; i++) {
            //         if (arr[i]) arr[i].index = newarr.push(arr[i]) - 1;//整理数组
            //     }
            //     glb[v] = newarr;
            //     arr = newarr;
            // }
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
    drawGameOver() {
        const img=new Image();
        img.src='image/biankuang/fail.jpg';
        img.onload=()=>{
            glb.context.drawImage(img, 300, 200, 600, 270);
        }
        //glb.context.drawImage(img, 0, 0, glb.width, glb.height);
        glb.context.fillStyle = "red";
        glb.context.font = "20px Arial";
        glb.context.fillText(`123`, 10, 20);
    }
    keyPress(keyCode) {//快捷键
        const map={
            'Digit1':()=>{
                this.player1.shoping(1);//生命
            },
            'Digit2':()=>{
                this.player1.shoping(7);//炸裂
            },
            'Digit3':()=>{
                this.player1.shoping(12);//追踪弹
            },
            'Digit4':()=>{
                this.player1.shoping(16);//宝箱
            },
            'Digit5':()=>{
                this.player1.shoping(17);//水晶盾
            },
            'Numpad1':()=>{
                this.player2.shoping(1);//生命
            },
            'Numpad2':()=>{
                this.player2.shoping(7);//炸裂
            },
            'Numpad3':()=>{
                this.player2.shoping(12);//追踪弹
            },
            'Numpad4':()=>{
                this.player2.shoping(16);//宝箱
            },
            'Numpad5':()=>{
                this.player2.shoping(17);//水晶盾
            },
        }
        map[keyCode]&&map[keyCode]();
    }
    keydown(keyCode) {
        if ( keyCode == 'KeyA' || keyCode == 'KeyS' || keyCode == 'KeyD' || keyCode == 'KeyW'||keyCode=='Space')
            this.player1.keystate[keyCode] = true;
        else if(keyCode == 'ArrowUp' || keyCode == 'ArrowDown' || keyCode == 'ArrowLeft' || keyCode == 'ArrowRight' ||keyCode=='Numpad0')
            this.player2.keystate[keyCode] = true;
    }
    keyup(keyCode) {
        this.player1.keystate[keyCode] = 0;
        this.player2.keystate[keyCode] = 0;
    }
}