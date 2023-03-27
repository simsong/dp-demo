define(["require", "exports", 'vs/base/objects', 'vs/editor/modes/modes', 'vs/languages/monarch/monarchCommon'], function(require, exports, __Base__, __Modes__, __Common__) {
    //----------------------------------------------------------------------------------
    // The Monarch library.
    // 2012 (c) Daan Leijen
    //
    // This module only exports 'compile' which compiles a JSON langauge definition
    // into a typed and checked ILexer definition.
    //
    // export function compile(json : Types.ILanguage) : Common.ILexer
    //----------------------------------------------------------------------------------
    var Base = __Base__;

    var Modes = __Modes__;

    
    var Common = __Common__;

    // ----------------------------------------------------------------------------------
    // Type helpers
    //
    // Note: this is just for sanity checks on the JSON description which is
    // helpful for the programmer. No checks are done anymore once the lexer is
    // already 'compiled and checked'.
    // ----------------------------------------------------------------------------------
    function isArrayOf(elemType, obj) {
        if(!obj) {
            return false;
        }
        if(!(obj instanceof Array)) {
            return false;
        }
        var idx;
        for(idx in obj) {
            if(!(elemType(obj[idx]))) {
                return false;
            }
        }
        return true;
    }
    function bool(prop, def, onerr) {
        if(typeof (prop) === "boolean") {
            return prop;
        }
        if(onerr && (prop || def === undefined)) {
            onerr();
        }// type is wrong, or there is no default
        
        return (def === undefined ? null : def);
    }
    function string(prop, def, onerr) {
        if(typeof (prop) === "string") {
            return prop;
        }
        if(onerr && (prop || def === undefined)) {
            onerr();
        }// type is wrong, or there is no default
        
        return (def === undefined ? null : def);
    }
    function regExString(prop, def, onerr) {
        // for now just a string
        return string(prop, def, onerr);
    }
    function number(prop, def, onerr) {
        if(typeof (prop) === "number") {
            return prop;
        }
        if(onerr && (prop || def === undefined)) {
            onerr();
        }// type is wrong, or there is no default
        
        return (def === undefined ? null : def);
    }
    function stringArray(prop, def, onerr) {
        if(isArrayOf(function (elem) {
            return (typeof (elem) === "string");
        }, prop)) {
            return prop.slice(0);
        }
        if(typeof (prop) === "string") {
            return [
                prop
            ];
        }
        if(onerr && (prop || def === undefined)) {
            onerr();
        }// type is wrong, or there is no default
        
        return (def === undefined ? null : def);
    }
    // ----------------------------------------------------------------------------------
    // Lexer helpers
    // ----------------------------------------------------------------------------------
    // Compile a regular expression string, adding the "i" flag if 'ignoreCase' is set.
    // Also replace @\w+ or sequences with the content of the specified attribute
    function compileRegExp(lexer, str) {
        if(typeof (str) !== "string") {
            return null;
        }
        var n = 0;
        while(str.indexOf("@") >= 0 && n < 5) {
            // at most 5 expansions
            n++;
            str = str.replace(/@(\w+)/g, function (s, attr) {
                var sub = "";
                if(typeof (lexer[attr]) === "string") {
                    sub = lexer[attr];
                } else if(lexer[attr] && lexer[attr] instanceof RegExp) {
                    sub = lexer[attr].source;
                } else {
                    if(lexer[attr] === undefined) {
                        Common.throwError(lexer, "language definition does not contain attribute '" + attr + "', used at: " + str);
                    } else {
                        Common.throwError(lexer, "attribute reference '" + attr + "' must be a string, used at: " + str);
                    }
                }
                return (Common.empty(sub) ? "" : "(?:" + sub + ")");
            });
        }
        return new RegExp(str, (lexer.ignoreCase ? "i" : ""));
    }
    // ----------------------------------------------------------------------------------
    // Compile guard functions for case matches.
    // This compiles 'cases' attributes into efficient match functions.
    // ----------------------------------------------------------------------------------
    function selectScrutinee(id, matches, state, num) {
        if(num < 0) {
            return id;
        }
        if(num < matches.length) {
            return matches[num];
        }
        if(num >= 100) {
            num = num - 100;
            var parts = state.split(".");
            parts.unshift(state);
            if(num < parts.length) {
                return parts[num];
            }
        }
        return null;
    }
    function createGuard(lexer, ruleName, tkey, val) {
        // get the scrutinee and pattern
        var scrut = -1;// -1: $!, 0-99: $n, 100+n: $Sn
        
        var oppat = tkey;
        var matches = tkey.match(/^\$(([sS]?)(\d\d?)|#)(.*)$/);
        if(matches) {
            if(matches[3]) {
                // if digits
                scrut = parseInt(matches[3]);
                if(matches[2]) {
                    scrut = scrut + 100;
                }// if [sS] present
                
            }
            oppat = matches[4];
        }
        // get operator
        var op = "~";
        var pat = oppat;
        if(!oppat || oppat.length === 0) {
            op = "!=";
            pat = "";
        } else if(/^\w*$/.test(pat)) {
            // just a word
            op = "==";
        } else {
            matches = oppat.match(/^(@|!@|~|!~|==|!=)(.*)$/);
            if(matches) {
                op = matches[1];
                pat = matches[2];
            }
        }
        // set the tester function
        var tester;
        // special case a regexp that matches just words
        if((op === "~" || op === "!~") && /^(\w|\|)*$/.test(pat)) {
            var words = pat.split("|");
            var inWords = Base.createKeywordMatcher(words, lexer.ignoreCase);
            tester = function (s) {
                return (op === "~" ? inWords(s) : !inWords(s));
            };
        } else if(op === "@" || op === "!@") {
            var words = lexer[pat];
            if(!words) {
                Common.throwError(lexer, "the @ match target '" + pat + "' is not defined, in rule: " + ruleName);
            }
            if(!(isArrayOf(function (elem) {
                return (typeof (elem) === "string");
            }, words))) {
                Common.throwError(lexer, "the @ match target '" + pat + "' must be an array of strings, in rule: " + ruleName);
            }
            var inWords = Base.createKeywordMatcher(words, lexer.ignoreCase);
            tester = function (s) {
                return (op === "@" ? inWords(s) : !inWords(s));
            };
        } else if(op === "~" || op === "!~") {
            if(pat.indexOf("$") < 0) {
                // precompile regular expression
                var re = compileRegExp(lexer, "^" + pat + "$");
                tester = function (s) {
                    return (op === "~" ? re.test(s) : !re.test(s));
                };
            } else {
                tester = function (s, id, matches, state) {
                    var re = compileRegExp(lexer, "^" + Common.substituteMatches(lexer, pat, id, matches, state) + "$");
                    return re.test(s);
                };
            }
        } else {
            // if (op==="==" || op==="!=") {
            if(pat.indexOf("$") < 0) {
                var patx = Common.fixCase(lexer, pat);
                tester = function (s) {
                    return (op === "==" ? s === patx : s !== patx);
                };
            } else {
                var patx = Common.fixCase(lexer, pat);
                tester = function (s, id, matches, state, eos) {
                    var patexp = Common.substituteMatches(lexer, patx, id, matches, state);
                    return (op === "==" ? s === patexp : s !== patexp);
                };
            }
        }
        // return the branch object
        if(scrut === -1) {
            return {
                name: tkey,
                value: val,
                test: function (id, matches, state, eos) {
                    return tester(id, id, matches, state, eos);
                }
            };
        } else {
            return {
                name: tkey,
                value: val,
                test: function (id, matches, state, eos) {
                    var scrutinee = selectScrutinee(id, matches, state, scrut);
                    return tester(!scrutinee ? "" : scrutinee, id, matches, state, eos);
                }
            };
        }
    }
    // ----------------------------------------------------------------------------------
    // Compiles an action: i.e. optimize regular expressions and case matches
    // and do many sanity checks.
    //
    // This is called only during compilation but if the lexer definition
    // contains user functions as actions (which is usually not allowed), then this
    // may be called during lexing. It is important therefore to compile common cases efficiently
    // ----------------------------------------------------------------------------------
    function compileAction(lexer, ruleName, action) {
        if(!action) {
            return {
                token: ""
            };
        } else if(typeof (action) === "string") {
            return action;// { token: action };
            
        } else if(action.token || action.token === "") {
            if(typeof (action.token) !== "string") {
                Common.throwError(lexer, "a 'token' attribute must be of type string, in rule: " + ruleName);
                return {
                    token: ""
                };
            } else {
                // only copy specific typed fields (only happens once during compile Lexer)
                var newAction = {
                    token: action.token
                };
                if(action.token.indexOf("$") >= 0) {
                    newAction.tokenSubst = true;
                }
                if(typeof (action.bracket) === "string") {
                    if(action.bracket === "@open") {
                        newAction.bracket = Modes.Bracket.Open;
                    } else if(action.bracket === "@close") {
                        newAction.bracket = Modes.Bracket.Close;
                    } else {
                        Common.throwError(lexer, "a 'bracket' attribute must be either '@open' or '@close', in rule: " + ruleName);
                    }
                }
                if(action.next) {
                    if(typeof (action.next) !== "string") {
                        Common.throwError(lexer, "the next state must be a string value in rule: " + ruleName);
                    } else {
                        var next = action.next;
                        if(!/^(@pop|@push|@popall)$/.test(next)) {
                            if(next[0] === '@') {
                                next = next.substr(1);
                            }// peel off starting @ sign
                            
                            if(next.indexOf('$') < 0) {
                                // no dollar substitution, we can check if the state exists
                                if(!Common.stateExists(lexer, Common.substituteMatches(lexer, next, "", [], ""))) {
                                    Common.throwError(lexer, "the next state '" + action.next + "' is not defined in rule: " + ruleName);
                                }
                            }
                        }
                        newAction.next = next;
                    }
                }
                if(typeof (action.goBack) === "number") {
                    newAction.goBack = action.goBack;
                }
                if(typeof (action.switchTo) === "string") {
                    newAction.switchTo = action.switchTo;
                }
                if(typeof (action.log) === "string") {
                    newAction.log = action.log;
                }
                if(typeof (action.nextEmbedded) === "string") {
                    newAction.nextEmbedded = action.nextEmbedded;
                    lexer.usesEmbedded = true;
                }
                return newAction;
            }
        } else if(action instanceof Array) {
            var results = [];
            var idx;
            for(idx in action) {
                results[idx] = compileAction(lexer, ruleName, action[idx]);
            }
            return {
                group: results
            };
        } else if(action.cases) {
            // build an array of test cases
            var cases = [];
            // for each case, push a test function and result value
            var tkey;
            for(tkey in action.cases) {
                var val = compileAction(lexer, ruleName, action.cases[tkey]);
                // what kind of case
                if(tkey === "@default" || tkey === "@" || tkey === "") {
                    cases.push({
                        test: null,
                        value: val,
                        name: tkey
                    });
                } else if(tkey === "@eos") {
                    cases.push({
                        test: function (id, matches, state, eos) {
                            return eos;
                        },
                        value: val,
                        name: tkey
                    });
                } else {
                    cases.push(createGuard(lexer, ruleName, tkey, val))// call separate function to avoid local variable capture
                    ;
                }
            }
            // create a matching function
            var def = lexer.defaultToken;
            return {
                test: function (id, matches, state, eos) {
                    var idx;
                    for(idx in cases) {
                        var didmatch = (!cases[idx].test || cases[idx].test(id, matches, state, eos));
                        if(didmatch) {
                            return cases[idx].value;
                        }
                    }
                    return def;
                }
            };
        } else {
            Common.throwError(lexer, "an action must be a string, an object with a 'token' or 'cases' attribute, or an array of actions; in rule: " + ruleName);
            return "";
        }
    }
    // ----------------------------------------------------------------------------------
    // Helper class for creating matching rules
    // ----------------------------------------------------------------------------------
    var Rule = (function () {
        function Rule(name) {
            this.regex = new RegExp("");
            this.action = {
                token: ""
            };
            this.matchOnlyAtLineStart = false;
            this.name = "";
            this.name = name;
        }
        Rule.prototype.setRegex = function (lexer, re) {
            var sregex;
            if(typeof (re) === "string") {
                sregex = re;
            } else if(re instanceof RegExp) {
                sregex = (re).source;
            } else {
                Common.throwError(lexer, "rules must start with a match string or regular expression: " + this.name);
            }
            this.matchOnlyAtLineStart = (sregex.length > 0 && sregex[0] === "^");
            this.name = this.name + ": " + sregex;
            this.regex = compileRegExp(lexer, "^(?:" + (this.matchOnlyAtLineStart ? sregex.substr(1) : sregex) + ")");
        };
        Rule.prototype.setAction = function (lexer, act) {
            this.action = compileAction(lexer, this.name, act);
        };
        return Rule;
    })();    
    /// <summary>
    /// ----------------------------------------------------------------------------------
    /// Compile a language definition.
    ///
    /// Compile a json description function into json where all regular expressions,
    /// case matches etc, are compiled and all include rules are expanded.
    /// We also compile the bracket definitions, supply defaults, and do many sanity checks.
    /// If the 'jsonStrict' parameter is 'false', we allow at certain locations
    ///  regular expression objects and functions that get called during lexing.
    /// (Currently we have no samples that need this so perhaps we should always have
    /// jsonStrict to true)
    /// ----------------------------------------------------------------------------------
    /// </summary>
    function compile(json) {
        if(!json || typeof (json) !== "object") {
            throw new Error("Monarch: expecting a language definition object");
        }
        // Get names
        if(typeof (json.name) !== "string") {
            throw new Error("Monarch: a language definition must include a string 'name' attribute");
        }
        // Create our lexer
        var lexer = {
        };
        lexer.name = json.name;
        lexer.displayName = string(json.displayName, lexer.name);
        lexer.logConsole = string(json.logConsole);
        lexer.noThrow = false// raise exceptions during compilation
        ;
        lexer.maxStack = 100;
        // Set standard fields: be defensive about types
        lexer.mimeTypes = stringArray(json.mimeTypes, undefined, function () {
            Common.throwError(lexer, "the attribute 'mimeTypes' must be defined as an array of strings");
        });
        lexer.start = string(json.start);
        lexer.fileExtensions = stringArray(json.fileExtensions);
        lexer.ignoreCase = bool(json.ignoreCase, false);
        lexer.lineComment = string(json.lineComment, "//");
        lexer.blockCommentStart = string(json.blockCommentStart, "/*");
        lexer.blockCommentEnd = string(json.blockCommentEnd, "*/");
        lexer.tokenPostfix = string(json.tokenPostfix, "." + lexer.name);
        lexer.defaultToken = string(json.defaultToken, "source", function () {
            Common.throwError(lexer, "the 'defaultToken' must be a string");
        });
        lexer.editorOptions = (!json.editorOptions ? null : json.editorOptions);
        lexer.workerScriptPath = string(json.workerScriptPath);
        lexer.usesEmbedded = false// becomes true if we find a nextEmbedded action
        ;
        // COMPAT: with earlier monarch versions
        if(!lexer.lineComment && (json).lineComments) {
            if(typeof ((json).lineComments) === "string") {
                lexer.lineComment = (json).lineComments;
            } else if(typeof ((json).lineComments[0]) === "string") {
                lexer.lineComment = (json).lineComments[0];
            }
        }
        // For calling compileAction later on
        var lexerMin = json;
        lexerMin.name = lexer.name;
        lexerMin.displayName = lexer.displayName;
        lexerMin.ignoreCase = lexer.ignoreCase , lexerMin.noThrow = lexer.noThrow , lexerMin.usesEmbedded = lexer.usesEmbedded , lexerMin.stateNames = json.tokenizer , lexerMin.logConsole = lexer.logConsole , lexerMin.defaultToken = lexer.defaultToken;
        // Compile an array of rules into newrules where RegExp objects are created.
        function addRules(state, newrules, rules) {
            var idx;
            for(idx in rules) {
                var rule = rules[idx];
                var include = rule.include;
                if(include) {
                    if(typeof (include) !== "string") {
                        Common.throwError(lexer, "an 'include' attribute must be a string at: " + state);
                    }
                    if(include[0] === "@") {
                        include = include.substr(1);
                    }// peel off starting @
                    
                    if(!json.tokenizer[include]) {
                        Common.throwError(lexer, "include target '" + include + "' is not defined at: " + state);
                    }
                    addRules(state + "." + include, newrules, json.tokenizer[include]);
                } else {
                    var newrule = new Rule(state);
                    // Set up new rule attributes
                    if(rule instanceof Array && rule.length >= 1 && rule.length <= 3) {
                        newrule.setRegex(lexerMin, rule[0]);
                        if(rule.length >= 3) {
                            if(typeof (rule[1]) === "string") {
                                newrule.setAction(lexerMin, {
                                    token: rule[1],
                                    next: rule[2]
                                });
                            } else if(typeof (rule[1]) === "object") {
                                var rule1 = rule[1];
                                rule1.next = rule[2];
                                newrule.setAction(lexerMin, rule1);
                            } else {
                                Common.throwError(lexer, "a next state as the last element of a rule can only be given if the action is either an object or a string, at: " + state);
                            }
                        } else {
                            newrule.setAction(lexerMin, rule[1]);
                        }
                    } else {
                        if(!rule.regex) {
                            Common.throwError(lexer, "a rule must either be an array, or an object with a 'regex' or 'include' field at: " + state);
                        }
                        if(rule.name) {
                            newrule.name = string(rule.name);
                        }
                        if(rule.matchOnlyAtStart) {
                            newrule.matchOnlyAtLineStart = bool(rule.matchOnlyAtLineStart);
                        }
                        newrule.setRegex(lexerMin, rule.regex);
                        newrule.setAction(lexerMin, rule.action);
                    }
                    newrules.push(newrule);
                }
            }
        }
        // compile the tokenizer rules
        if(!json.tokenizer || typeof (json.tokenizer) !== "object") {
            Common.throwError(lexer, "a language definition must define the 'tokenizer' attribute as an object");
        }
        lexer.tokenizer = [];
        var key;
        for(key in json.tokenizer) {
            if(!lexer.start) {
                lexer.start = key;
            }
            var rules = json.tokenizer[key];
            lexer.tokenizer[key] = new Array();
            addRules("tokenizer." + key, lexer.tokenizer[key], rules);
        }
        lexer.usesEmbedded = lexerMin.usesEmbedded// can be set during compileAction
        ;
        // nonWordTokens
        lexer.nonWordTokens = stringArray(json.nonWordTokens, [
            "delimiter", 
            "delimiter.parenthesis", 
            "delimiter.curly", 
            "delimiter.square", 
            "delimiter.angle"
        ], function () {
            Common.throwError(lexer, "the 'nonWordTokens' attribute must be an array of strings");
        });
        var idx;
        for(idx in lexer.nonWordTokens) {
            lexer.nonWordTokens[idx] += lexer.tokenPostfix;
        }
        // Set brackets
        if(json.brackets) {
            if(!(json.brackets instanceof Array)) {
                Common.throwError(lexer, "the 'brackets' attribute must be defined as an array");
            }
        } else {
            json.brackets = [
                {
                    open: "{",
                    close: "}",
                    token: "delimiter.curly"
                }, 
                {
                    open: "[",
                    close: "]",
                    token: "delimiter.square"
                }, 
                {
                    open: "(",
                    close: ")",
                    token: "delimiter.parenthesis"
                }, 
                {
                    open: "<",
                    close: ">",
                    token: "delimiter.angle"
                }
            ];
        }
        var brackets = [];
        for(var idx in json.brackets) {
            var desc = json.brackets[idx];
            if(desc && desc instanceof Array && desc.length === 3) {
                desc = {
                    token: desc[2],
                    open: desc[0],
                    close: desc[1]
                };
            }
            if(desc.open === desc.close) {
                Common.throwError(lexer, "open and close brackets in a 'brackets' attribute must be different: " + desc.open + "\n hint: use the 'bracket' attribute if matching on equal brackets is required.");
            }
            if(typeof (desc.open) === "string" && typeof (desc.token) === "string") {
                brackets.push({
                    token: string(desc.token) + lexer.tokenPostfix,
                    open: Common.fixCase(lexer, string(desc.open)),
                    close: Common.fixCase(lexer, string(desc.close))
                });
            } else {
                Common.throwError(lexer, "every element in the 'brackets' array must be a '{open,close,token}' object or array");
            }
        }
        lexer.brackets = brackets;
        // Set default auto closing pairs
        var autoClosingPairs;
        if(json.autoClosingPairs) {
            if(!(json.autoClosingPairs instanceof Array)) {
                Common.throwError(lexer, "the 'autoClosingPairs' attribute must be an array of string pairs (as arrays)");
            }
            autoClosingPairs = json.autoClosingPairs.slice(0);
        } else {
            autoClosingPairs = [
                [
                    "\"", 
                    "\""
                ], 
                [
                    "'", 
                    "'"
                ], 
                [
                    "@brackets"
                ]
            ];
        }
        // set auto closing pairs
        lexer.autoClosingPairs = [];
        if(autoClosingPairs) {
            for(var idx in autoClosingPairs) {
                var pair = autoClosingPairs[idx];
                var openClose;
                if(pair === "@brackets" || pair[0] === "@brackets") {
                    var bidx;
                    for(bidx in brackets) {
                        if(brackets[bidx].open && brackets[bidx].open.length === 1 && brackets[bidx].close && brackets[bidx].close.length === 1) {
                            openClose = {
                                open: brackets[bidx].open,
                                close: brackets[bidx].close
                            };
                            lexer.autoClosingPairs.push(openClose);
                        }
                    }
                } else if(pair instanceof Array && pair.length === 2 && typeof (pair[0]) === "string" && pair[0].length === 1 && typeof (pair[1]) === "string" && pair[1].length === 1) {
                    openClose = {
                        open: Common.fixCase(lexer, pair[0]),
                        close: Common.fixCase(lexer, pair[1])
                    };
                    lexer.autoClosingPairs.push(openClose);
                } else if(typeof (pair.open) === "string" && pair.open.length === 1 && typeof (pair.close) === "string" && pair.close.length === 1) {
                    openClose = {
                        open: Common.fixCase(lexer, pair.open[0]),
                        close: Common.fixCase(lexer, pair.close[0])
                    };
                    lexer.autoClosingPairs.push(openClose);
                } else {
                    Common.throwError(lexer, "every element in an 'autoClosingPairs' array must be a pair of 1 character strings, or a '@brackets' directive");
                }
            }
        }
        // custom auto indentation
        if(json.autoIndent) {
            var autoIndent = [];
            if(!(json.autoIndent instanceof Array)) {
                Common.throwError(lexer, "an 'autoIndent' attribute must be an array of '{match,matchAfter}' objects");
            }
            var i;
            for(i in json.autoIndent) {
                if(typeof (json.autoIndent[i].match) !== "string") {
                    Common.throwError(lexer, "each object in the 'autoIndent' array must define a 'match' attribute");
                }
                autoIndent.push({
                    match: compileRegExp(lexer, json.autoIndent[i].match),
                    matchAfter: compileRegExp(lexer, string(json.autoIndent[i].matchAfter))
                });
            }
            lexer.autoIndent = autoIndent;
        }
        // custom auto completion
        if(json.autoComplete) {
            var autoComplete = [];
            if(!(json.autoComplete instanceof Array)) {
                Common.throwError(lexer, "an 'autoComplete' attribute must be an array of '{trigger,match,complete}' objects");
            }
            for(var i in json.autoComplete) {
                if(typeof (json.autoComplete[i].triggers) !== "string") {
                    Common.throwError(lexer, "each object in the 'autoComplete' array must define a 'triggers' attribute");
                }
                if(typeof (json.autoComplete[i].match) !== "string") {
                    Common.throwError(lexer, "each object in the 'autoComplete' array must define a 'match' attribute as a regular expression string");
                }
                if(typeof (json.autoComplete[i].complete) !== "string") {
                    Common.throwError(lexer, "each object in the 'autoComplete' array must define a 'complete' attribute");
                }
                autoComplete.push({
                    triggers: Common.fixCase(lexer, string(json.autoComplete[i].triggers)),
                    match: compileRegExp(lexer, json.autoComplete[i].match),
                    complete: string(json.autoComplete[i].complete)
                });
            }
            lexer.autoComplete = autoComplete;
        }
        // noindentBrackets: a regex that excludes certain brackets from doing indentation
        if(json.noindentBrackets) {
            var re = regExString(json.noindentBrackets, null, function () {
                Common.throwError(lexer, "the 'noindentBrackets' must be a regular expression string");
            });
            lexer.noindentBrackets = compileRegExp(lexer, re);
        }
        // Construct electric chars: ie. chars where onElectricChar is called when typed
        var electricChars = [];
        for(var i in lexer.brackets) {
            var close = lexer.brackets[i].close;
            if(close && close.length > 0) {
                if(!lexer.noindentBrackets || !lexer.noindentBrackets.test(close)) {
                    electricChars.push(close.substr(close.length - 1))// take last character
                    ;
                }
            }
        }
        for(var i in lexer.autoComplete) {
            electricChars.push(lexer.autoComplete[i].triggers);
        }
        lexer.electricChars = electricChars.join("") + string(json.outdentTriggers, "");
        // Enable logging now (if not set already)
        if(!lexer.logConsole) {
            lexer.logConsole = "monarchConsole";
        }
        // Disable throw so the syntax highlighter goes, no matter what
        lexer.noThrow = true;
        return lexer;
    }
    exports.compile = compile;
})
