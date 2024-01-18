import { glb } from "./glb.js";
export class PROMPT {//减血提示
    constructor(arg) {
        this.xy = arg.xy;
        this.msg = arg.msg;
        this.color = arg.color;
        this.size = arg.size;
        this.life = arg.life || 50;
        this.moveCount = 0;
        this.moveStep = 3;
        this.onDie = arg.onDie || function () { };
        this.handle = setInterval(() => { this.loop() }, 50);
        this.index = glb.pushToArr(glb.promptlist, this);
        if (this.xy.x + this.size * this.msg.length > glb.width) {//防止超出屏幕
            this.xy.x = glb.width - this.size * this.msg.length;
        }
        if (this.xy.y - this.life < 0) {
            this.xy.y = this.life;
        }
    }
    loop() {
        this.moveCount += this.moveStep;
        this.xy.y -= this.moveStep;
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