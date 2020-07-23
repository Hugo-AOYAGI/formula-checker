$(document).ready( () => {

    var mathFieldSpan = document.getElementById('mathfield');

    var MQ = MathQuill.getInterface(2);
    var mathField = MQ.MathField(mathFieldSpan, {
        spaceBehavesLikeTab: true,
    });

    mathField.latex("\\text{Type your formula here}");

    $(mathFieldSpan).on("focusin", () => {
        $(mathFieldSpan).addClass("mf-focused");
        if (mathField.latex() == "\\text{Type your formula here}") {
            mathField.latex("");
        }
    });

    $(mathFieldSpan).on("focusout", () => {
        if (mathField.latex().replace("", "") == "") {
            $(mathFieldSpan).removeClass("mf-focused");
            mathField.latex("\\text{Type your formula here}");
        }
    });

    $(".help-page").on("click", () => {
        $(".help-page").css("display", "none");
    });

    $(".__help-btn").on("click", () => {
        $(".help-page").css("display", "unset");
    });

    $(".variables-button").on("click", () => {
        $(".vars-wrapper").css("display", "unset");
    });

    $(".vars-wrapper").on("click", () => {
        $(".vars-wrapper").css("display", "none");
    });


});