import MathLive from '/modules/mathlive.mjs';


var lang = "en";

var problems = 0;

// LOAD JSON

var defaultDims = [];

$.getJSON('data/dimensions.json', (data) => {
    defaultDims = data;
});


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
        $(".__cancel-btn").css("display", "none");
        $(".__confirm-btn").css("display", "none");
        $(".vars-page-close-btn").css("display", "unset");

        if (mathField.latex() != "\\text{Type your formula here}") {
            addVariablesToMenu();
        }
        $(".vars-wrapper").css("display", "unset");
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
    });

    $(".vars-page-close-btn").on("click", () => {
        $(".vars-wrapper").css("display", "none");
    });

    $(".__go-btn").on("click", () => {
        $(".vars-wrapper").css("display", "unset");
        $(".__cancel-btn").css("display", "unset");
        $(".__confirm-btn").css("display", "unset");

        if (mathField.latex() != "\\text{Type your formula here}") {
            addVariablesToMenu();
        }
        $(".vars-wrapper").css("display", "unset");
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

        $(".vars-page-close-btn").css("display", "none");
    });

    $(".__confirm-btn").on("click", () => {
        let tree = MathLive.latexToAST(mathField.latex());
        problems = 0;
        exploreTree(tree);

        if (problems == 0) $(".__errors-icon").css("background-color", "green").html("✓").css("display", "flex");
        else $(".__errors-icon").css("background-color", "red").html(problems.toString()).css("display", "flex");


        $(".vars-wrapper").css("display", "none");
    });

    $(".__cancel-btn").on("click", () => {
        $(".vars-wrapper").css("display", "none");
    });

    var addVariablesToMenu = () => {
        getVariablesFromLatex(mathField.latex() + " ");
        $(".__vars-container").html("");
                // Display all user variables
        for (let variable of variables) {
            $(".__vars-container").append(`
                <div class="__var">
                    <div class="__sym">${variable[0]}</div>
                    <div class="__name"><input type="text" value="${variable[1]}"></div>
                    <div class="__dim">${dimListToStringHTML(variable[2])}</div>
                </div>
                <div class="__hz-separator"></div>
            `);
        }
        $(".__vars-container .__hz-separator").last().remove();
    }
    


});


var variables = [];

var greekAlphabet = ["\\alpha", "\\beta", "\\gamma", "\\Gamma", "\\delta", "\\Delta", "\\epsilon", "\\varepsilon", "\\zeta", "\\eta", "\\theta", "\\vartheta", "\\Theta", "\\iota", "\\kappa", "\\lambda", "\\Lambda", "\\mu", "\\nu", "\\xi", "\\Xi", "\\pi", "\\Pi", "\\rho", "\\varrho", "\\sigma", "\\Sigma", "\\tau", "\\upsilon", "\\Upsilon", "\\phi", "\\varphi", "\\Phi", "\\chi", "\\psi", "\\Psi", "\\omega", "\\Omega"];

var getVariablesFromLatex = (latex) => {
    // Find vars with sub attribute for instance V_1 or x_{eq} as well as greek letters
    let subVars = [];

    for (let letter of greekAlphabet) {
        let greekMatch = latex.match(RegExp("\\" + letter + "[^_]", "g"));
        if (greekMatch != null) {
            for (let match of greekMatch) {
                subVars.push(match.slice(0, match.length - 1));
            }
        }
        let subGreekMatch = latex.match(RegExp("\\" + letter + "_[a-zA-Z1-9\\{\\}]", "g"));
        if (subGreekMatch != null) {
            subVars = subVars.concat(subGreekMatch);
        }
        
        
    }

    let new_latex = latex;
    // Remove them from the latex string
    
    for (let subvar of subVars) {
        new_latex = latex.replace(subvar, "");
    }

    subVars = subVars.concat(new_latex.match(/[a-zA-Z]_[a-zA-Z1-9\{\}]+/g));

    for (let subvar of subVars) {
        new_latex = new_latex.replace(subvar, "");
    }


    // Get other vars
    let vars_string = new_latex.replace(/\\\w+/g, "").replace(/[\^\{\}\+\-]/g, "").replace(" ", "").replace(/[0-9]/g, "");
    let symbols = [...new Set(vars_string.split(""))].concat(subVars);


    // Find default names for each symbol
    for (let symbol of symbols) {

        if (symbol == null) continue;

        let alreadyExists = false;
        for (let variable of variables) {
            if (variable[0] == symbol) {
                alreadyExists = true;
            }
        }

        if (!alreadyExists) {

            let var_list = [symbol];
            for (let name of Object.keys(defaultDims[lang]["defaults"])) {
                if (defaultDims[lang]["defaults"][name].includes(symbol) || defaultDims[lang]["defaults"][name].includes(symbol.split("_")[0])) {
                    var_list.push(name);
                    var_list.push(dimStringToList(defaultDims[lang]["units"][name]));
                    break;
                }
            }
            if (var_list.length == 1) {
                var_list.push("length");
                var_list.push([1, 0, 0, 0, 0, 0, 0]);
            }

            variables.push(var_list);

        }

    }

    console.log(variables);

}

var baseDims = ["L", "M", "T", "I", "\\theta", "J", "N"];

var dimStringToList = (dimString) => {
    let dimList = [0, 0, 0, 0, 0, 0, 0];
    for (let sub of dimString.split(".")) {
        if (!sub.includes("^")) {
            dimList[baseDims.indexOf(sub)] = 1;
        } else {
            dimList[baseDims.indexOf(sub.split("^")[0])] = parseInt(sub.split("^")[1]);
        }
    }
    return dimList;
}

var dimListToString = (dimList) => {
    let dimString = "";
    for (let i = 0; i < 7; i++) {
        if (dimList[i] == 1) dimString += baseDims[i] + "."
        else if (dimList[i] != 1 && dimList[i] != 0) dimString += baseDims[i] + "^" + dimList[i].toString() + ".";
    } 
    return dimString.slice(0, dimString.length - 1);
}

var dimListToStringHTML = (dimList) => {
    let dimString = "";
    for (let i = 0; i < 7; i++) {
        if (dimList[i] == 1) dimString += i != 4 ? baseDims[i] + "." : "\\(" + baseDims[i] + "\\)."
        else if (dimList[i] != 1 && dimList[i] != 0) dimString += i != 4 ? baseDims[i] + "<sup>" + dimList[i].toString() + "</sup>." : "\\(" + baseDims[i] + "\\)" + "<sup>" + dimList[i].toString() + "</sup>.";
    } 
    return dimString == "" ? "∅" : dimString.slice(0, dimString.length - 1);
}

var exploreTree = (tree) => {
    if (Object.keys(tree).includes("fn")) {

        // If add, equal or substract, check if the dimensions of all args are the same, if not signal problem
        if (["equal", "add", "substract"].includes(tree["fn"])) {

            // Loop through args of sum
            for (let i=0; i < tree["arg"].length - 1; i++) { 
                // Check if arg and the next are same dimension
                // If not, return problem
                if (!areEqual(exploreTree(tree["arg"][i]), exploreTree(tree["arg"][i+1]))) {
                    problems++;
                }
                if (i == tree["arg"].length - 2) {
                    return exploreTree(tree["arg"][0]);
                }
            }

        // If multiply, return sum of all dimensions
        } else if (tree["fn"] == "multiply") {
            return sumDim(tree);
        // If divide, return substraction of dimensions
        } else if (tree["fn"] == "divide") {
            return subDim(exploreTree(tree["arg"][0]), exploreTree(tree["arg"][1]));
        // If negate, return same dimension
        } else if (tree["fn"] == "negate") {
            return exploreTree(tree["arg"][0])
        // If sqrt, return halved dimension
        } else if (tree["fn"] == "sqrt") {
            return multDim(exploreTree(tree["arg"][0]), 0.5);
        // If pow, multiply dim by power
        } else if (tree["fn"] == "pow") {
            return multDim(exploreTree(tree["arg"][0]), getVal(tree["arg"][1]));
        }

    // If symbol, return dimension of symbol
    } else if (Object.keys(tree).includes("sym")) {

        let sym = Object.keys(tree).includes("sub") ? tree["sym"] + "_" + getSubSym(tree["sub"]) : tree["sym"];

        if (Object.keys(tree).includes("sup")) {
            return multDim(dimOf(sym), getVal(tree["sup"]));
        } else {
            return dimOf(sym);
        }

    } else if (Object.keys(tree).includes("num")) {
        return [0, 0, 0, 0, 0, 0, 0];
    }
}

var dimOf = (name) => {
    for (let variable of variables) {
        if (variable[0] == name) return variable[2];
    }
}

var sumDim = (tree) => {
    let sum = [0, 0, 0, 0, 0, 0, 0];
    for (let arg of tree["arg"]) {
        let symDim = exploreTree(arg);
        for (let i=0; i<7; i++) {
            sum[i] += symDim[i];
        }
    }
    return sum;
}

var subDim = (dim1, dim2) => {
    let res = dim1.slice();

    for (let i=0; i<7; i++) {
        res[i] -= dim2[i];
    }

    return res;
}

var multDim = (dims, n) => {
    let res = []
    for (let dim of dims) res.push(dim*n);
    return res;
}

var areEqual = (l1, l2) => {
    for (let i=0; i<l1.length; i++) {
        if (l1[i] != l2[i]) return false;
    }
    return true;
}

var getSubSym = (sub) => {
    if (Object.keys(sub).includes("num")) {
        return sub["num"].length > 1 ? "{" + sub["num"] + "}" : sub["num"];
    } else if (Object.keys(sub).includes("sym")) {
        return sub["sym"];
    } else if (Object.keys(sub).includes("fn")) {
        let str = "";
        for (let arg of sub["arg"]) {
            if (Object.keys(arg).includes("sym")) {
                str += arg["sym"];
            } else {
                str += arg["num"];
            }
        }
        return str.length > 1 ? "{" + str + "}" : str;
    }
} 

var getVal = (tree) => {
    if (Object.keys(tree).includes("fn")) {
        if (tree["fn"] == "divide") {
            return getVal(tree["arg"][0])/getVal(tree["arg"][1]);
        } else if (tree["fn"] == "substract") {
            return getVal(tree["arg"][0]) - getVal(tree["arg"][1]);
        } else if (tree["fn"] == "add") {
            let sum = 0;
            for (let arg of tree["arg"]) { 
                sum += getVal(arg);
            }
            return sum;
        } else if (tree["fn"] == "multiply") {
            let prod = 1;
            for (let arg of tree["arg"]) { 
                prod *= getVal(arg);
            }
            return prod;
        } else if (tree["fn"] == "sqrt") {
            return Math.sqrt(getVal(tree["arg"][0]));
        } else if (tree["fn"] == "pow") {
            return getVal(tree["arg"][0])**(getVal(tree["arg"][1]))
        }

    } else if (Object.keys(tree).includes("num")) {
        if (Object.keys(tree).includes("sup")) {
            return parseInt(tree["num"])**(getVal(tree["sup"]));
        }
        return parseInt(tree["num"]);
    }
}
