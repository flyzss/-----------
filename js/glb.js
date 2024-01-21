import { foodList } from "./food.js";
export const glb = {
    list: ["foodlist", "walllist", "tanklist", "zidanlist", "boomlist", 'shuijinglist'],
    tanklist: [],
    zidanlist: [],
    walllist: [],
    shuijinglist: [],
    foodlist: [],
    boomlist: [],
    promptlist: [],
    buffList: [],
    pause: 0,
    pass: 0,
    width: 1281,
    height: 880,
    context: document.getElementById("can").getContext("2d"),
    tankImg: new Array(22).fill(0).map((v, i) => {
        v = new Image();
        v.src = `image/tank/${i}.png`;
        return v;
    }),
    boomImg: [],
    tankboomImg: [],
    tankboomImg1: new Array(5).fill(0).map((v, i) => {
        v = new Image();
        v.src = `image/tankboom/1/${i}.png`;
        return v;
    }),
    planeImg: [],
    zidanImg: [],
    foodImg: [],
    house: [],
    biankuangImg: [],
    wallimg1:new Image(),
    victoryimg:new Image(),
    methysisImg: new Array(8).fill(0).map((v, i) => {
        v = new Image();
        v.src = `image/skill/4/${i}.png`;
        return v;
    }),   
    missileImg: new Array(8).fill(0).map((v, i) => {
        v = new Image();
        v.src = `image/skill/3/${i}.png`;
        return v;
    }),
    skillImg2: new Array(9).fill(0).map((v, i) => {
        v = new Image();
        v.src = `image/skill/2/${i}.png`;
        return v;
    }),
    skillImg1: new Array(6).fill(0).map((v, i) => {
        v = new Image();
        v.src = `image/skill/1/${i}.png`;
        return v;
    }),
    types: { tank: 0, zidan: 1, wall: 2, food: 3, plane: 4, boom: 5, shuijing: 6 },
    zidancolors: ["LightGray", "white", "blue", "yellow", "lime", "Purple", "Crimson"],
    isin: function (x, y, width, height) {
        return !(x < 0 || y < 0 || x > this.width - width || y > this.height - height);
    },
    makeTankimg: function () {
        this.wallimg1.src = `image/biankuang/wall1.png`;
        this.victoryimg.src = `image/biankuang/victory.png`;
        for (let i = 0; i < 3; i++) {
            this.planeImg[i] = new Image();
            this.planeImg[i].src = `image/plane/${i}.png`
        }
        for (let i = 0; i < 13; i++) {
            this.zidanImg[i] = new Image();
            this.zidanImg[i].src = `image/zidan/${i}.png`
        }
        for (let i = 0; i < foodList.length; i++) {
            this.foodImg[i] = new Image();
            this.foodImg[i].src = `image/food/${i}.png`
        }
        for (let i = 0; i < 2; i++) {
            this.house[i] = new Image();
            this.house[i].src = `image/house/${i}.png`
        }
        for (let i = 0; i < 3; i++) {
            this.biankuangImg[i] = new Image();
            this.biankuangImg[i].src = `image/biankuang/${i}.png`
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
    checkhit: function (obj,list= ["tanklist", "foodlist", 'shuijinglist',"walllist"]) {
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
    tankNameList: [
        "猎鹰",
        "黑豹",
        "灰熊",
        "猛虎",
        "雄狮",
        "影狼",
        "银狐",
        "狂鲨",
        "金蝎",
        "火凤",
        "冰龙",
        "暗影蛇",
        "钢猿",
        "雷狼",
        "墨蛟",
        "岩猩",
        "烈虎",
        "燃鹰",
        "霜熊",
        "幽狐",
        "毒蝎",
        "炎蟾",
        "冰狼",
        "巨象",
        "深海鲨",
        "炎鳗",
        "毒蜂",
        "雷鹰",
        "铁犀",
        "毒蛇",
        "寒冰熊"
      ],
    getTankName: function () {
        let n = Math.floor(Math.random() * this.tankNameList.length);
        return this.tankNameList[n];
    },
    pushToArr: function (arr, obj) {
        for(let i=0;i<arr.length;i++){
            if(!arr[i]){
                arr[i]=obj;
                return i;
            }
        }
        return arr.push(obj)-1;
    },
    audioPool: {
        boom: [],
        plane: [],
        zidan: [],
        pick: [],
        go: [],
        missile: [],
        attackShuijing: [],
        kehuan: [],
        warning: [],
        glass: [],
        die: []
    },
    playAudio(name, autoPlay = true, loop = false, volume = 1,max=Infinity) {
        for (let i = 0; i < glb.audioPool[name].length; i++) {//从Audio池中找播放完成的音频重复利用
            if (glb.audioPool[name][i].paused) {
                glb.audioPool[name][i].currentTime = 0;
                glb.audioPool[name][i].volume = volume;
                glb.audioPool[name][i].loop = loop;
                if (autoPlay) {
                    glb.audioPool[name][i].play();
                }
                return glb.audioPool[name][i];
            }
        }
        if (glb.audioPool[name].length >= max) return;
        glb.audioPool[name].push(new Audio(`audio/${name}.mp3`));
        glb.audioPool[name][glb.audioPool[name].length - 1].volume = volume;
        glb.audioPool[name][glb.audioPool[name].length - 1].loop = loop;
        autoPlay && glb.audioPool[name][glb.audioPool[name].length - 1].play();
        return glb.audioPool[name][glb.audioPool[name].length - 1];
    }
}

export function sleep(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve() }, timeout);
    })
}
window.glb=glb;