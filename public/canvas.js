var canvas = $("#canvas");
var context = document.getElementById("canvas").getContext("2d");

context.strokeStyle = "rgb(159, 28, 213)";

let offsetX;
let offsetY;

canvas.mousedown(function(e) {
    context.beginPath();

    canvas.mousemove(function(e) {
        offsetX = e.offsetX;
        offsetY = e.offsetY;

        context.lineTo(offsetX, offsetY);
        context.stroke();
    });
});

canvas.mouseup(function() {
    canvas.unbind("mousemove"); //unbind cancels mousemove event

    const dataURL = document.querySelector("#canvas").toDataURL();
    // console.log(dataURL);
    $("#hidden").val(dataURL);
});
