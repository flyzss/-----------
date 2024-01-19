import { glb } from "./glb.js";
export class BOOM {
    constructor(obj) {
        this.width = obj.width * 1.2 || 40;
        this.height = obj.height * 1.2 || 40;
        this.exterior = obj.exterior || 0;
        this.xy = obj.xy;
        this.id = obj.id || Math.random();
        this.index = glb.pushToArr(glb.boomlist, this);
        this.img = glb.boomImg[2];
        this.play();
    }
    play() {
        glb.playAudio("boom", true, false, 0.4);
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
export class TANKBOOM{
    constructor(obj) {
        this.imgList = obj.imgList || glb.tankboomImg;
        this.width = obj.width || 128;
        this.height = obj.height || 128;
        this.img = this.imgList[0];
        this.xy = obj.xy;
        this.id = obj.id || Math.random();
        this.index = glb.pushToArr(glb.boomlist, this);
        this.play();
    }
    async play() {
        glb.playAudio("die");
        for (let i = 0; i < this.imgList.length; i++) {
            this.img = this.imgList[i];
            await sleep(100);
        }
        this.die();

    }
    drawme() {
        let { x, y } = this.xy; 0
        glb.context.drawImage(this.img, x-this.width/4, y-this.width/4, this.width, this.height);
    }
    zhongdan(obj) {

    }
    die() {
        if (glb.boomlist.length > this.index) glb.boomlist[this.index] = 0;
    }
}
function sleep(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve() }, timeout);
    })
}