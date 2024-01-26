import { glb } from "./glb.js";
export class PROMPT {//减血提示
    constructor(arg) {
        this.xy = arg.xy;
        this.msg = arg.msg||'';
        this.color = arg.color;
        this.size = arg.size||0;
        this.width = arg.width||0;
        this.height = arg.height||0;
        this.life = arg.life || 50;
        this.moveCount = 0;
        this.moveStep = arg.moveStep || 3;
        this.img = arg.img;
        this.onDie = arg.onDie || function () { };
        this.handle = setInterval(() => { this.loop() }, 50);
        this.index = glb.pushToArr(glb.promptlist, this);
        if (this.xy.x + this.size * this.msg.length+this.width > glb.width) {//防止超出屏幕
            this.xy.x = glb.width - this.size * this.msg.length-this.width;
        }
        if(this.xy.x<0){
            this.xy.x=0;
        }
        if (this.xy.y - this.life < 0) {
            this.xy.y = this.life;
        }
        this.ignorePause = arg.ignorePause;
    }
    loop() {
        if(glb.pause&&!this.ignorePause) return;
        this.moveCount += this.moveStep;
        this.xy.y -= this.moveStep;
        if (this.moveCount >= this.life) this.die();
    }
    drawme() {
        if(this.img){
            glb.context.drawImage(this.img, this.xy.x, this.xy.y, this.width, this.height);
            return;
        }
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