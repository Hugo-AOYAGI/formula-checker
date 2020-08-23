import MathLive from '/modules/mathlive.mjs';

var lang = localStorage.getItem("formula-checler.lang") == null ? "en" : localStorage.getItem("formula-checler.lang");


var problems = 0;

var problem_details = [];

var selected_variable = "";

var greekAlphabetLatex = ["\\alpha", "\\beta", "\\gamma", "\\Gamma", "\\delta", "\\Delta", "\\epsilon", "\\zeta", "\\eta", "\\theta", "\\Theta", "\\iota", "\\kappa", "\\lambda", "\\Lambda", "\\mu", "\\nu", "\\xi", "\\Xi", "\\pi", "\\Pi", "\\rho", "\\varrho", "\\sigma", "\\Sigma", "\\tau", "\\upsilon", "\\Upsilon", "\\varphi", "\\phi", "\\Phi", "\\chi", "\\psi", "\\Psi", "\\omega", "\\Omega", "\\vartheta", "\\varepsilon"];
var greekAlphabetChar = ["α", "β", "γ", "Γ", "δ", "Δ", "ϵ", "ζ", "η", "θ", "Θ", "ι", "κ", "λ", "Λ", "μ", "ν", "ξ", "Ξ", "π", "Π", "ρ", "ϱ", "σ", "Σ", "τ", "υ", "ϒ", "ϕ", "φ", "Φ", "χ", "ψ", "Ψ", "ω", "Ω", "ϑ", "ε"];


var isMobile = {
    Android: () => navigator.userAgent.match(/Android/i),
    BlackBerry: () => navigator.userAgent.match(/BlackBerry/i),
    iOS: () => navigator.userAgent.match(/iPhone|iPad|iPod/i),
    Opera: () => navigator.userAgent.match(/Opera Mini/i),
    Windows: () => navigator.userAgent.match(/IEMobile/i),
    any: () => (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows())
    // any: () => true
}

// LOAD JSON

var defaultDims = [];

// LOCALES
var placeholder_loc = {"en": "\\text{Type your formula here}", "fr": "\\text{Ecrivez votre formule ici}"}
var novars_loc = {"en": "No Variables Yet", "fr": "Vous n'avez encore aucune variable"}


$.getJSON('data/dimensions.json', (data) => {
    defaultDims = data;
});

var mathField;


$(document).ready( () => {


    $(".__flag").click(() => {
        lang = lang == "en" ? "fr" : "en";
        updateLang();
    });


    var mathFieldSpan = document.getElementById('mathfield');

    var MQ = MathQuill.getInterface(2);
    mathField = MQ.MathField(mathFieldSpan, {
        spaceBehavesLikeTab: true,
        substituteTextarea: () => {
            return !isMobile.any() ? $("<input id='subSpan'></input>")[0] : $("<span id='subSpan'></span>")[0];
        },
    });

    window.mathField = mathField;

    if(!isMobile.any()) {
        mathField.latex(placeholder_loc[lang]);

        $(mathFieldSpan).on("focusin", () => {
            $(mathFieldSpan).addClass("mf-focused");
            if (mathField.latex() == placeholder_loc[lang]) {
                mathField.latex("");
            }
            
        });
    
        $(mathFieldSpan).on("focusout", () => {
            if (mathField.latex().replace("", "") == "") {
                $(mathFieldSpan).removeClass("mf-focused");
                mathField.latex(placeholder_loc[lang]);
            }
        });
    } else {

        $(mathFieldSpan).addClass("mf-focused");

        $(mathFieldSpan).on("click", (event) => {
            showKeyboard();
            event.stopPropagation();
        });

        $(".mobile-keyboard").on("click", (event) => {
            $(".kb-more-chars").remove();
            event.stopPropagation();
        });

        $(".main-wrapper").on("click", (event) => {
            hideKeyboard();
        })

    }

    

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

        if (mathField.latex() != placeholder_loc[lang] && mathField.latex().replace(" ", "") != "") {
            addVariablesToMenu();
        } else if (variables.length == 0) {
            $(".__vars-container").html("");
            $(".__vars-container").append(`
                <div class="__no-vars-disclaimer">
                    ${novars_loc[lang]}
                </div>
            `);
        }

        $(".vars-wrapper").css("display", "unset");
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
    });

    $(".vars-page-close-btn").on("click", () => {
        $(".vars-wrapper").css("display", "none");
    });

    $(".__go-btn").on("click", () => {

        if (mathField.latex() != placeholder_loc[lang] && mathField.latex().replace(" ", "") != "") {
            addVariablesToMenu();
        }

        if (variables.length == 0) {
            alert(lang == "en" ? "You have no variables yet !" : "Vous n'avez encore aucune variable !");
            return;
        }

        $(".vars-wrapper").css("display", "unset");
        $(".__cancel-btn").css("display", "unset");
        $(".__confirm-btn").css("display", "unset");

        $(".vars-wrapper").css("display", "unset");
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

        $(".vars-page-close-btn").css("display", "none");
    });

    $(".__confirm-btn").on("click", () => {

        let tree = MathLive.latexToAST(mathField.latex());

        problems = 0;
        problem_details = [];

        console.log(tree);
        
        try {
            let globalDim = exploreTree(tree);

            $(".__issues-board").empty();

            if (problems == 0) {
                $(".__errors-icon").css("background-color", "#57DE90").html("<img src='assets/icons/check-mark.png'>").css("display", "flex");
                $(".__issues-board").append(lang == "en" ? `<div class="__issue __issue-ok">
                    The dimension of the whole equation is ${dimListToStringHTML(globalDim)}.
                </div>` :
                `<div class="__issue __issue-ok">
                    La dimension globale de l'équation est ${dimListToStringHTML(globalDim)}.
                </div>`
                );
            }
            else {
                $(".__errors-icon").css("background-color", "#D1675C").html(problems.toString()).css("display", "flex");

                for (let i = 0; i < problem_details.length; i++) {
                    let child;
                    if (lang == "en") {
                        if (problem_details[i].length == 4) {
                            child = `<div class="__issue __issue-pb">
                                \\(${problem_details[i][0]}\\) (${dimListToStringHTML(problem_details[i][2])}) and \\(${problem_details[i][1]}\\) (${dimListToStringHTML(problem_details[i][3])}) are not of the same dimension.
                            </div>`;
                        } else {
                            child = `<div class="__issue __issue-pb">
                                \\(${problem_details[i][0]}\\) (${dimListToStringHTML(problem_details[i][1])}) is not of dimension \\(1\\) while being the argument of a ${problem_details[i][2]} function.
                            </div>`;
                        }
                        
                    } else {
                        if (problem_details[i].length == 4) {
                            child = `<div class="__issue __issue-pb">
                            \\(${problem_details[i][0]}\\) (${dimListToStringHTML(problem_details[i][2])}) et \\(${problem_details[i][1]}\\) (${dimListToStringHTML(problem_details[i][3])}) n'ont pas la même dimension.
                            </div>`;
                        } else {
                            child = `<div class="__issue __issue-pb">
                                \\(${problem_details[i][0]}\\) (${dimListToStringHTML(problem_details[i][1])}) n'est pas sans dimension alors qu'il est l'argument d'une fonction ${problem_details[i][2]}.
                            </div>`;
                        }
                    }
                    
                    $(".__issues-board").append(child);

                    if (i != problem_details.length - 1) {
                        $(".__issues-board").append(`<div class="__separator"></div>`);
                    }
                }
            }
        } catch (error) {
            console.log(error);
            alert(lang == "en" ? "There was an error in the equation or the developper sucks.\n\n" : "Il y a eu une erreur dans l'équation ou le développeur est nul.");
            $(".vars-wrapper").css("display", "none");
            return;
        }

        
        $(".__issues-board").css("display", "flex");
        $(".vars-wrapper").css("display", "none");
        console.log("Rendering Math");
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
    });

    $(".__cancel-btn").on("click", () => {
        $(".vars-wrapper").css("display", "none");
    });

    $(".vars-wrapper").on("click", (evt) => {
        if (!$(evt.target).hasClass("__dim") && !$(evt.target).hasClass("dim-editor") && $(evt.target).parents(".__dim").length == 0 && $(evt.target).parents(".dim-editor").length == 0) {
            if ($(".dim-editor").css("display") != "none") {
                updateVariableName();
            }
            $(".dim-editor").css("display", "none");
        }
    });

    $(".vars-wrapper").on("click", (evt) => {
        if (!$(evt.target).hasClass("__name") && !$(evt.target).hasClass("search-results") && $(evt.target).parents(".__name").length == 0 && $(evt.target).parents(".search-results").length == 0) {
            $(".search-results").css("display", "none");
        }
    });

    for (let i=0; i<baseDims.length; i++) {
        $("#" + (baseDims[i] == "\\theta" ?  "theta" : baseDims[i]) + "-node").on("input", (evt) => {
            for (let variable of variables) {
                
                let new_val = $(evt.target).val() == "" ? 0 : $(evt.target).val();

                if (variable[0] == selected_variable) {
                    variable[2][i] = parseInt(new_val);

                    let html_sym = variable[0].replace("{", ":bl:").replace("}", ":br:");
                    html_sym = replaceGreekLatex(html_sym);

                    $("#var-" + html_sym + "-dim").html(dimListToStringHTML(variable[2]));

                    break;
                }
            }
        });
    }

    var updateLang = () => {
        if (lang == "fr") {

            localStorage.setItem("formula-checler.lang", "fr")
    
            $(".__flag").attr("src", "assets/icons/fr-flag.png");
            if (mathField.latex() == placeholder_loc["en"]) {
                mathField.latex(placeholder_loc["fr"]);
            }
            $("#title-help-page").html("Aide pour équations");
            $(".__more-disclaimer").html("<a href='http://www.univ-irem.fr/lexique/res/Annexe_E_-_Liste_des_symboles_mathematiques_usuels__LaTeX_.pdf'>En savoir plus sur la syntaxe latex</a>");
            $("#vars-menu-title").html("Vos variables");
    
    
        } else if (lang == "en") {

            localStorage.setItem("formula-checler.lang", "en")
    
            $(".__flag").attr("src", "assets/icons/uk-flag.png");
            if (mathField.latex() == placeholder_loc["fr"]) {
                mathField.latex(placeholder_loc["en"]);
            }
            $("#title-help-page").html("Equations Cheat Sheet");
            $(".__more-disclaimer").html("<a href='https://www.overleaf.com/learn/latex/List_of_Greek_letters_and_math_symbols'>More about latex syntax for equations</a>");
            $("#vars-menu-title").html("Your variables");
    
        }
    }

    updateLang();


    var addVariablesToMenu = () => {
        getVariablesFromLatex(mathField.latex() + " ");
        $(".__vars-container").html("");
                // Display all user variables
        for (let variable of variables) {
            let html_sym = variable[0].replace("{", ":bl:").replace("}", ":br:");
            html_sym = replaceGreekLatex(html_sym);
            
            let template = `
                <div class="__var" id="var-${html_sym}">
                    <div class="__sym">${html_sym.replace(":bl:", "{").replace(":br:", "}")}</div>
                    <div class="__name"><input type="text" value="${variable[1]}" id="var-${html_sym}-name" autocomplete="off"></div>
                    <div class="__dim" id="var-${html_sym}-dim">${dimListToStringHTML(variable[2])}</div>
                </div>
                <div class="__hz-separator"></div>
            `;
    
            // Listeners
            $(".__vars-container").append(template);
            $("#var-" + html_sym + "-dim").on("click", (evt) => {
                
                if ($(".dim-editor").css("display") != "none") updateVariableName();

                selected_variable = variable[0];
                showDimEditor(evt);
            });

            $("#var-" + html_sym + "-name").on("input", (evt) => {
                selected_variable = variable[0];
                showSearchResults(evt);
            });

        }
        if (variables.length == 0) {
            $(".__vars-container").append(`
                <div class="__no-vars-disclaimer">
                    ${novars_loc[lang]}
                </div>
            `);
        }

        $(".__vars-container .__hz-separator").last().remove();
    }

    

    var updateVariableName = () => {
        if (selected_variable != "") {
            for (let variable_ of variables) {
                if (variable_[0] == selected_variable) {
                    for (let unit of Object.keys(defaultDims[lang]["units"])) {
                        if (areEqual(dimStringToList(defaultDims[lang]["units"][unit]), variable_[2])) {
                            variable_[1] = unit;

                            let html_id = variable_.replace("{", ":bl:").replace("}", ":br:");

                            $("#var-" + html_id + "-name").val(unit);
                            break;
                        }
                    }
                    break;
                }
            }
        }
    }

    var showDimEditor = (evt) => {

        let dimList = [];
        for (let variable of variables) {
            if (variable[0] == selected_variable) {
                dimList = variable[2];
                break;
            }
        }

        for (let i=0; i<dimList.length; i++) {
            $("#" + baseDims[i] + "-node").val(dimList[i]);
        }

        $(".dim-editor").css("display", "flex").css("top", ($(evt.target).position()["top"] + 30).toString() + "px");

    }
    
    var showSearchResults = (evt) => {

        let input_value = $(evt.target).val().replace(" ", "").toLowerCase();

        if (input_value == "") {
            $(".search-results").css("display", "none");
            return;
        }

        let matches = findMatches(input_value);

        $(".search-results").empty();

        for (let res of matches) {
            $(".search-results").append(`
                <div class="__result">${res}</div>
            `);
        }

        $(".search-results").append(`
                <div class="__result">Other</div>
        `);

        $(".__result").click((evt) => {

            for (let variable of variables) {
                if (variable[0] == selected_variable) {
                    let var_name = replaceGreekLatex(selected_variable).replace("{", "\\:bl\\:").replace("}", "\\:br\\:")
                    if ($(evt.target).html() == "Other") {
                        variable[1] = $("#var-" + var_name + "-name").val().toLowerCase()
                    } else {
                        variable[1] = $(evt.target).html().toLowerCase()
                        $("#var-" +  var_name + "-name").val($(evt.target).html());

                        variable[2] = dimStringToList(defaultDims[lang]["units"][$(evt.target).html().toLowerCase()]);
                        $("#var-" + var_name + "-dim").html(dimListToStringHTML(variable[2]));
                    }
                    $(".search-results").css("display", "none");
                    break;
                }
            }
        });


        $(".search-results").css("display", "flex").css("top", ($(evt.target).position()["top"] + 30).toString() + "px");
                
    }

    var findMatches = (pattern) => {
        let matches = []
        for (let variable of Object.keys(defaultDims[lang]["units"])) {
            if (variable.startsWith(pattern)) {
                matches.push(variable);
            }
        }
        return matches;
    }

});


var variables = [];


var getVariablesFromLatex = (latex) => {
    // Find vars with sub attribute for instance V_1 or x_{eq} as well as greek letters
    let subVars = [];
    
    latex = latex.replace("\\ ", "").replace(" ", "");

    latex += " ";

    latex = latex.replace(/\\log_[1-9]/g, "");

    for (let letter of greekAlphabetLatex) {
        let greekMatch = latex.match(RegExp("\\" + letter + "[^_]", "g"));
        if (greekMatch != null) {
            for (let match of greekMatch) {
                subVars.push(match.slice(0, match.length - 1));
            }
        }
        let subGreekMatch = latex.match(RegExp("\\" + letter + "_[a-zA-Z0-9]", "g"));

        if (subGreekMatch != null) subGreekMatch = subGreekMatch.concat(latex.match(RegExp("\\" + letter + "_\\{[a-zA-Z1-9]+\\}", "g")));
        else subGreekMatch = latex.match(RegExp("\\" + letter + "_\\{[a-zA-Z0-9]+\\}", "g"));
        
        if (subGreekMatch != null) {
            subVars = subVars.concat(subGreekMatch);
        }
    }

    let new_latex = latex;
    // Remove them from the latex string
    
    for (let subvar of subVars) {
        new_latex = new_latex.replace(subvar, "");
    }

    subVars = subVars.concat(new_latex.match(/[a-zA-Z]_[a-zA-Z0-9]/g));
    subVars = subVars.concat(new_latex.match(/[a-zA-Z]_\{[a-zA-Z0-9]+\}/g));

    for (let subvar of subVars) {
        new_latex = new_latex.replace(subvar, "");
    }


    // Get other vars
    let vars_string = new_latex.replace(/\\\w+/g, "").replace(/[\^\{\}\+\-\=\(\)\[\]\|\/]/g, "").replace(" ", "").replace(/[0-9]/g, "");
    let symbols = [...new Set(vars_string.split(""))].concat(subVars);


    // Find default names for each symbol
    for (let symbol of symbols) {

        if (symbol == null) continue;
        if (symbol == " ") continue;

        let alreadyExists = false;
        for (let variable of variables) {
            if (variable[0] == symbol) {
                alreadyExists = true;
            }
        }

        if (!alreadyExists) {

            let var_list = [symbol];
            for (let name of Object.keys(defaultDims[lang]["defaults"])) {
                if (defaultDims[lang]["defaults"][name].includes(symbol)) {
                    var_list.push(name);
                    var_list.push(dimStringToList(defaultDims[lang]["units"][name]));
                    break;
                }
            }
            if (var_list.length == 1) {
                for (let name of Object.keys(defaultDims[lang]["defaults"])) {
                    if (defaultDims[lang]["defaults"][name].includes(symbol.split("_")[0])) {
                        var_list.push(name);
                        var_list.push(dimStringToList(defaultDims[lang]["units"][name]));
                        break;
                    }
                }
            }
            if (var_list.length == 1) {
                var_list.push(lang == "en" ? "length" : "longueur");
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
        if (dimList[i] == 1) dimString += i != 4 ? baseDims[i] + "." : "θ.";
        else if (dimList[i] != 1 && dimList[i] != 0) dimString += i != 4 ? baseDims[i] + "<sup>" + dimList[i].toString() + "</sup>." : "θ" + "<sup>" + dimList[i].toString() + "</sup>.";
    } 
    return dimString == "" ? "1" : dimString.slice(0, dimString.length - 1);
}

var exploreTree = (tree) => {

    if (Object.keys(tree).includes("error")) {
        return dimOf(tree["latex"].replace("\\vec{", "").replace("}", ""));
    }


    if (Object.keys(tree).includes("fn")) {

        let result;

        // If add, equal or substract, check if the dimensions of all args are the same, if not signal problem
        if (["equal", "add", "subtract"].includes(tree["fn"])) {

            // Loop through args of sum
            for (let i=0; i < tree["arg"].length - 1; i++) { 
                // Check if arg and the next are same dimension
                // If not, return problem
                let isWrong = false;
                let dim1 = exploreTree(tree["arg"][i]), dim2 = exploreTree(tree["arg"][i+1]);
                if (dim1.length == 8 || dim2.length == 8) return [0, 0, 0, 0, 0, 0, 0, 0];

                if (!areEqual(dim1, dim2)) {
                    let details = [MathLive.astToLatex(tree["arg"][i]), MathLive.astToLatex(tree["arg"][i+1]), dim1, dim2];
                    if (!listIncludesDeep(problem_details, details)) {
                        problems++;
                        problem_details.push(details);
                        isWrong = true;
                    }
                    
                } 
                
                if (i == tree["arg"].length - 2) {
                    result = isWrong ? [0, 0, 0, 0, 0, 0, 0, 0] : dim1;
                }
            }


        // If multiply, return sum of all dimensions
        } else if (tree["fn"] == "multiply") {
            result = sumDim(tree);
        // If divide, return substraction of dimensions
        } else if (tree["fn"] == "divide") {
            result = subDim(exploreTree(tree["arg"][0]), exploreTree(tree["arg"][1]));
        // If negate, return same dimension
        } else if (tree["fn"] == "negate") {
            result = exploreTree(tree["arg"][0]);
        // If sqrt, return halved dimension
        } else if (tree["fn"] == "sqrt") {
            result = multDim(exploreTree(tree["arg"][0]), 0.5);
        // If pow, multiply dim by power
        } else if (tree["fn"] == "pow") {
            result = multDim(exploreTree(tree["arg"][0]), getVal(tree["arg"][1]));
        } else if (["ln", "cos", "sin", "tan", "arccos", "arcsin", "arctan", "exp", "log", "sec", "cot", "csc", "arccot", "arcsec", "arccsc"].includes(tree["fn"])) {
            let dim = exploreTree(tree["arg"][0]);
            if (!areEqual(dim, [0, 0, 0, 0, 0, 0, 0])) {
                problems++;
                problem_details.push([MathLive.astToLatex(tree["arg"][0]), dim, "\\( \\" + tree["fn"] + "\\)"]);
            }
            result = [0, 0, 0, 0, 0, 0, 0];
        } else if (["f", "g"].includes(tree["fn"])) {
            if (Object.keys(tree).includes("arg")) {
                result = sumDim2(dimOf(tree["fn"]), exploreTree(tree["arg"][0]));
            } else {
                result = dimOf(tree["fn"]);
            }
            
        } else if (["zeta", "Gamma", "Zeta", "gamma"].includes(tree["fn"])) {
            if (Object.keys(tree).includes("arg")) {
                result = sumDim2(dimOf("\\" + tree["fn"]), exploreTree(tree["arg"][0]));
            } else {
                result = dimOf("\\" + tree["fn"]);
            }
        } else if (tree["fn"] == "abs") {
            result = exploreTree(tree["arg"][0]);
        }


        if (Object.keys(tree).includes("sup")) {
            let value = getVal(tree["sup"]);

            if (isNaN(value)) {

                let sup_dim = exploreTree(tree["sup"]);

                if (!areEqual(sup_dim, [0, 0, 0, 0, 0, 0, 0])) {
                    problems++;
                    problem_details.push([MathLive.astToLatex(tree["sup"]), sup_dim, lang == "en" ? "power" : "puissance"]);
                    return [0, 0, 0, 0, 0, 0, 0, 0];
                }

                return [0, 0, 0, 0, 0, 0, 0];
                
            } else {
                return multDim(result, value);
            }   
        } else {
            return result;
        }
        

    // If symbol, return dimension of symbol
    } else if (Object.keys(tree).includes("sym")) {

        let sym = Object.keys(tree).includes("sub") ? tree["sym"] + "_" + getSubSym(tree["sub"]) : tree["sym"];

        if (Object.keys(tree).includes("sup")) {
            let dim1 = exploreTree(tree["sup"]);
            let dim2 = dimOf(sym);
            if (areEqual(dim2, [0, 0, 0, 0, 0, 0, 0])) {
                if (!areEqual(dim1, [0, 0, 0, 0, 0, 0, 0])) {
                    problems++;
                    problem_details.push([MathLive.astToLatex(tree["sup"]), dim1, lang == "en" ? "power" : "puissance"]);
                }
                return [0, 0, 0, 0, 0, 0, 0];
            } else {
                if (areEqual(dim1, [0, 0, 0, 0, 0, 0, 0])) {
                    return multDim(dimOf(sym), getVal(tree["sup"]));
                } else {
                    return [0, 0, 0, 0, 0, 0, 0];
                }
            }
            
        } else {
            return dimOf(sym);
        }

    } else if (Object.keys(tree).includes("num")) {
        if (Object.keys(tree).includes("sup")) {
            let dim = exploreTree(tree["sup"]);
            if (!areEqual(dim, [0, 0, 0, 0, 0, 0, 0])) {
                problems++;
                problem_details.push([MathLive.astToLatex(tree["sup"]), dim , lang == "en" ? "power" : "puissance"]);
            }
        } 
        return [0, 0, 0, 0, 0, 0, 0];
        
    }
}

var listIncludesDeep = (list, element) => {
    for (let el of list) {
        let found = true;
        for (let k = 0; k < el.length; k++) {
            if (el[k] != element[k]) {
                found = false;
                break;
            }
            if (found) {
                return true
            }
        }
    }
    return false;
}

var dimOf = (name) => {
    let real_name = replaceGreekChars(name);

    for (let variable of variables) {
        if (variable[0] == real_name) return variable[2];
    }

    // Handle Upsilon
    if (name == "Υ") {
        for (let variable of variables) {
            if (variable[0] == "\\Upsilon") return variable[2];
        }
    }

    for (let variable of variables) {
        if (variable[0] == real_name.replace("var", "")) return variable[2];
    }

    for (let variable of variables) {
        if (variable[0] == "\\var" + real_name.replace("\\", "")) return variable[2];
    }
    
}

var replaceGreekChars = (name) => {
    for (let j = 0; j < greekAlphabetChar.length; j ++) {
        if (name.includes(greekAlphabetChar[j])) {
            return name.replace(greekAlphabetChar[j], greekAlphabetLatex[j]);
        }
    }
    return name;
}

var replaceGreekLatex = (name) => {
    for (let j = 0; j < greekAlphabetLatex.length; j ++) {
        if (name.includes(greekAlphabetLatex[j])) {
            return name.replace(greekAlphabetLatex[j], greekAlphabetChar[j]);
        }
    }
    return name;
}

var sumDim = (tree) => {
    let sum = [0, 0, 0, 0, 0, 0, 0];
    for (let arg of tree["arg"]) {
        let symDim = exploreTree(arg);
        if (symDim.length == 8) sum.push(0); 
        for (let i=0; i<7; i++) {
            sum[i] += symDim[i];
        }
    }
    return sum;
}


var subDim = (dim1, dim2) => {
    let res = dim1.slice();

    if (dim2.length == 8) res.push(0);

    for (let i=0; i<7; i++) {
        res[i] -= dim2[i];
    }

    return res;
}


var sumDim2 = (dim1, dim2) => {
    let res = dim1.slice();

    if (dim2.length == 8) res.push(0);

    for (let i=0; i<7; i++) {
        res[i] += dim2[i];
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
