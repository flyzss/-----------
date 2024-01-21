"use strict"
import { Battlefield } from "./battlefield.js";
import { SHOP } from "./shop.js";


const zc = new Battlefield(2);
const shop = new SHOP(zc);
document.onkeydown = (e) => {
    zc.keydown(e.code);
}
document.onkeyup = (e) => {
    zc.keyup(e.code);
    zc.keyPress(e.code);
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
    $("#player1 .huifu").text(`自动恢复每分钟${(arg.p1.huifu * 100).toFixed(2)}%`);

    $("#player2 .score").text(`得分:${arg.p2.score}`);
    $("#player2 .hp").text(`${arg.p2.name} 生命值:${arg.p2.hp}`);
    $("#player2 .sh").text(`伤害${arg.p2.sh}`);
    $("#player2 .sspeed").text(`射速${arg.p2.shootSpeed}`);
    $("#player2 .shootFar").text(`射程${arg.p2.shootFar}`);
    $("#player2 .moveSpeed").text(`移速${arg.p2.moveSpeed}`);
    $("#player2 .baojishang").text(`暴击伤害${arg.p2.baojishang.toFixed(2)}`);
    $("#player2 .baojilv").text(`暴击率${(arg.p2.baojilv * 100).toFixed(2)}%`);
    $("#player2 .xixie").text(`吸血率${(arg.p2.xixie * 100).toFixed(2)}%`);
    $("#player2 .huifu").text(`自动恢复每分钟${(arg.p2.huifu * 100).toFixed(2)}%`);
}



$(() => {

        $("#p1name").val(zc.player1DefultName);
        $("#p2name").val(zc.player2DefultName);
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
    $("#resetPos").click(function () {
        zc.resetPos();
    })
    $("#playercount").change(function () {
        let val = ~~$(this).val();
        zc.player2.isai = val == 1 ? 1 : 0;
        zc.player2.isAutoBuyHp = val == 1 ? true : false;
        zc.playerCount = val;
    });
    $("#btn_save").click(function () {
        let p1name = $("#p1name").val();
        let p2name = $("#p2name").val();
        if (p1name == "") p1name = zc.player1DefultName;
        if (p2name == "") p2name = zc.player2DefultName;
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
