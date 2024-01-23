import { FOOD,foodList } from "./food.js";
export class SHOP {
    constructor(zc) {
        this.zc=zc;
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
        $("#btn_shop").click(() => { this.openShop() });
        $("#btn_shop_cancel").click(() => { SHOP.cancel(zc) });
        $("#btn_shop_buy").click(() => { SHOP.buy(zc) });
        
    }
    openShop() {
        this.zc.pause(1);
        $("#shop").show();
    }
    closeShop(){
        SHOP.cancel(this.zc)
    }
    make() {
        let ul = $("#shop .item-list");
        const list=foodList.map((item,i)=>{item.i=i;return item;}).filter(item=>!item.hide).sort((a,b)=>a.sort-b.sort);
        for (const data of list) {
            let m = data.money >= 10000 ? `${data.money / 10000}万` : `${data.money / 1000}千`;
            let li = `<li><img src="image/food/${data.i}.png" inx=${data.i}><p>${data.text}</p><p>$${m}</p><p>快捷键：${data.sort||'无'}</p></li>`;
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
    static buy(zc) {
        let p1money = SHOP.moneyCount("p1gwc");
        if (p1money > zc.player1.score) return alert("P1积分不够...");
        let p2money = SHOP.moneyCount("p2gwc");
        if (p2money > zc.player2.score) return alert("P2积分不够...");
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
        SHOP.cancel(zc);
        for (let i = 0; i < p1.length; i++) {
            zc.player1.shoping(p1[i]);
        }
        for (let i = 0; i < p2.length; i++) {
            zc.player2.shoping(p2[i]);
        }
        
    }
    static cancel(zc) {
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
function ondragoverfunction(e) {  //源对象在悬停在目标对象上时  
    e.preventDefault();  //阻止默认行为，使得drop可以触发  
} 