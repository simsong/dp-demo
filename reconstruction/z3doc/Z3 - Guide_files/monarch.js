var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define("vs/languages/monarch/monarch",["require", "exports", 'vs/platform/platform', 'vs/editor/modes/stream', 'vs/editor/modes/modes', 'vs/editor/modes/modesExtensions', 'vs/languages/monarch/monarchCommon', 'vs/languages/monarch/monarchCompile'], function(require, exports, __Platform__, __Stream__, __Modes__, __ModesExtensions__, __Common__, __Compile__) {
    
    var Platform = __Platform__;

    var Stream = __Stream__;

    var Modes = __Modes__;

    var ModesExtensions = __ModesExtensions__;

    
    var Common = __Common__;

    var Compile = __Compile__;

    //----------------------------------------------------------------------------------
    // Event handlers for the editor:
    // - onEnter: handles auto indentation
    // - onElectricChar: handles auto completion, and auto outdentation
    //----------------------------------------------------------------------------------
    function tokenIsWhite(token) {
        return (!token || token === "" || /\bcomment\b/.test(token) || /\bwhite\b/.test(token));
    }
    // search for a bracket in the 'brackets' attribute that matches the input
    function findBracket(lexer, matched) {
        if(!matched) {
            return null;
        }
        matched = Common.fixCase(lexer, matched);
        var brackets = lexer.brackets;
        for(var i = 0; i < brackets.length; i++) {
            var bracket = brackets[i];
            if(bracket.open === matched) {
                return {
                    token: bracket.token,
                    bracketType: Modes.Bracket.Open
                };
            } else if(bracket.close === matched) {
                return {
                    token: bracket.token,
                    bracketType: Modes.Bracket.Close
                };
            }
        }
        return null;
    }
    function createTokenMatchStrings(line, tokens, offset) {
        var preline = [];
        var postline = [];
        for(var i = 0; i < tokens.length; i++) {
            if(!tokenIsWhite(tokens[i].type)) {
                var str = "";
                if(i < tokens.length - 1) {
                    str = line.substr(tokens[i].startIndex, tokens[i + 1].startIndex - tokens[i].startIndex);
                } else {
                    str = line.substr(tokens[i].startIndex);
                }
                if(tokens[i].startIndex < offset) {
                    preline.push(str);
                } else {
                    postline.push(str);
                }
            }
        }
        return {
            pre: " " + preline.join(" ") + " ",
            post: " " + postline.join(" ") + " "
        };
    }
    function getTokenString(line, tokens, tokenIdx) {
        if(tokenIdx + 1 < tokens.length) {
            return line.substr(tokens[tokenIdx].startIndex, tokens[tokenIdx + 1].startIndex - tokens[tokenIdx].startIndex);
        } else {
            return line.substr(tokens[tokenIdx].startIndex);
        }
    }
    // -------------------------------------------------------
    // Gets called on every enter: do auto-indentation
    // -------------------------------------------------------
    function onEnter(lexer, line, tokens, offset) {
        // Do custom auto indentation if necessary
        if(lexer.autoIndent) {
            var matchLine = createTokenMatchStrings(line, tokens, offset);
            for(var i = 0; i < lexer.autoIndent.length; i++) {
                if(!lexer.autoIndent[i].match || lexer.autoIndent[i].match.test(matchLine.pre)) {
                    if(!lexer.autoIndent[i].matchAfter || lexer.autoIndent[i].matchAfter.test(matchLine.post)) {
                        return Modes.IndentAction.IndentOutdent;
                    } else {
                        return Modes.IndentAction.Indent;
                    }
                }
            }
        }
        // Do auto-indentation for brackets
        var i;
        var nesting = [];
        for(i = 0; i < tokens.length && tokens[i].startIndex < offset; i++) {
            if(tokens[i].bracket === Modes.Bracket.Open) {
                nesting.push(i);
            } else if(tokens[i].bracket === Modes.Bracket.Close && nesting.length > 0) {
                nesting.pop();
            }
        }
        // Was there an unmatched open bracket?
        if(nesting.length === 0) {
            return null;
        }
        // we pick the last unmatched bracket
        var openIdx = nesting.pop();
        // Is it not in the noindent list?
        if(lexer.noindentBrackets) {
            var openToken = getTokenString(line, tokens, openIdx);
            if(lexer.noindentBrackets.test(openToken)) {
                return null;
            }
        }
        /*
        // skip to the next non-white token
        while (i < tokens.length && tokenIsWhite(tokens[i].type)) i++;
        */
        // if after the break is a matching close, we do an indent/outdent block
        if(i < tokens.length && tokens[i].bracket === Modes.Bracket.Close && tokens[i].type === tokens[openIdx].type) {
            return Modes.IndentAction.IndentOutdent;
        } else// otherwise a regular indentation
         {
            return Modes.IndentAction.Indent;
        }
    }
    // -------------------------------------------------------
    // Gets called on certain characters: do auto-completion and outdentation
    // -------------------------------------------------------
    function onElectricChar(lexer, line, tokens, offset) {
        var appendText = null;
        var matchBracketType = null;
        // Do auto-complete if necessary
        if(lexer.autoComplete && lexer.autoComplete.length > 0) {
            var trigger = Common.fixCase(lexer, line.substr(offset, 1));
            var matchLine = createTokenMatchStrings(line, tokens, offset + 1).pre;
            for(i = 0; i < lexer.autoComplete.length; i++) {
                if(lexer.autoComplete[i].triggers.indexOf(trigger) >= 0) {
                    var matches = matchLine.match(lexer.autoComplete[i].match);
                    if(matches) {
                        appendText = matches[0].replace(lexer.autoComplete[i].match, lexer.autoComplete[i].complete);
                        break;
                    }
                }
            }
        }
        // Do auto-outdent for brackets
        // first find the last token and check if it is a close bracket
        var tokenOffset = 0;
        var tokenIndex = 0;
        for(var i = 0; i < tokens.length; i++) {
            if(tokens[i].startIndex > offset) {
                break;
            }
            tokenOffset = tokens[i].startIndex;
            tokenIndex = i;
        }
        // if it is a close bracket
        if(tokens[tokenIndex].bracket === Modes.Bracket.Close) {
            // and it is not in the noindent list
            if(!lexer.noindentBrackets || !lexer.noindentBrackets.test(getTokenString(line, tokens, tokenIndex))) {
                // then check if it is preceded by whitespace
                var allwhite = true;
                for(i = 0; i < tokenOffset; i++) {
                    if(line[i] !== ' ' && line[i] !== '\t') {
                        allwhite = false;
                        break;
                    }
                    ;
                }
                // now set matchBracketType for outdent if applicable
                if(allwhite) {
                    matchBracketType = tokens[tokenIndex].type;
                }
            }
        }
        // Return
        if(appendText || matchBracketType) {
            return {
                matchBracketType: matchBracketType,
                appendText: appendText
            };
        } else {
            return null;
        }
    }
    // ----------------------------------------------------------------------------------
    // The MonarchLexer class implements a monaco lexer that highlights source code
    //
    // It takes a compiled lexer to guide the tokenizer and maintains a stack of
    // lexer states.
    // ----------------------------------------------------------------------------------
    var monarchLexerId = 0;
    var MonarchLexer = (function (_super) {
        __extends(MonarchLexer, _super);
        function MonarchLexer(mode, lexer, stack, embeddedMode) {
                _super.call(this, mode);
            this.id = monarchLexerId;
            monarchLexerId++// for debugging, assigns unique id to each instance
            ;
            this.lexer = lexer// (compiled) lexer description
            ;
            this.stack = (stack ? stack : [
                lexer.start
            ])// stack of states
            ;
            this.embeddedMode = (embeddedMode ? embeddedMode : null)// are we scanning an embedded section?
            ;
            // did we encounter an embedded start on this line?
            // no need for cloning or equality since it is used only within a line
            this.embeddedEntered = false;
            // regular expression group matching
            // these never need cloning or equality since they are only used within a line match
            this.groupActions = null;
            this.groupMatches = null;
            this.groupMatched = null;
            this.groupRule = null;
        }
        MonarchLexer.prototype.makeClone = function () {
            return new MonarchLexer(this.getMode(), this.lexer, this.stack.slice(0), this.embeddedMode);
        };
        MonarchLexer.prototype.equals = function (other) {
            if(!_super.prototype.equals.call(this, other)) {
                return false;
            }
            if(!(other instanceof MonarchLexer)) {
                return false;
            }
            var otherm = other;
            if((this.stack.length !== otherm.stack.length) || (this.lexer.name !== otherm.lexer.name) || (this.embeddedMode !== otherm.embeddedMode)) {
                return false;
            }
            var idx;
            for(idx in this.stack) {
                if(this.stack[idx] !== otherm.stack[idx]) {
                    return false;
                }
            }
            return true;
        };
        MonarchLexer.prototype.tokenize = // ------------------------------------------------------
        // The main tokenizer: this function gets called by monaco to tokenize lines
        // Note: we don't want to raise exceptions here and always keep going..
        //
        // TODO: there are many optimizations possible here for the common cases
        // but for now I concentrated on functionality and correctness.
        // ------------------------------------------------------
        function (stream, noConsumeIsOk) {
            var stackLen0 = this.stack.length;// these are saved to check progress
            
            var groupLen0 = 0;
            var state = this.stack[0];// the current state
            
            this.embeddedEntered = false;
            var matches = null;
            var matched = null;
            var action = null;
            var next = null;
            var rule = null;
            // check if we need to process group matches first
            if(this.groupActions) {
                groupLen0 = this.groupActions.length;
                matches = this.groupMatches;
                matched = this.groupMatched.shift();
                action = this.groupActions.shift();
                rule = this.groupRule;
                // cleanup if necessary
                if(this.groupActions.length === 0) {
                    this.groupActions = null;
                    this.groupMatches = null;
                    this.groupMatched = null;
                    this.groupRule = null;
                }
            } else// otherwise we match on the token stream
             {
                // nothing to do
                if(stream.eos()) {
                    return {
                        type: ""
                    };
                }
                // get the entire line
                var line = stream.advanceToEOS();
                stream.goBack(line.length);
                // get the rules for this state
                var rules = this.lexer.tokenizer[state];
                if(!rules) {
                    rules = Common.findRules(this.lexer, state);
                }// do parent matching
                
                if(!rules) {
                    Common.throwError(this.lexer, "tokenizer state is not defined: " + state);
                } else {
                    // try each rule until we match
                    var rule = null;
                    var pos = stream.pos();
                    var idx;
                    for(idx in rules) {
                        rule = rules[idx];
                        if(pos === 0 || !rule.matchOnlyAtLineStart) {
                            matches = line.match(rule.regex);
                            if(matches) {
                                matched = matches[0];
                                action = rule.action;
                                break;
                            }
                        }
                    }
                }
            }
            // We matched 'rule' with 'matches' and 'action'
            if(!matches) {
                matches = [
                    ""
                ];
                matched = "";
            }
            if(!action) {
                // bad: we didn't match anything, and there is no action to take
                // we need to advance the stream or we get progress trouble
                if(!stream.eos()) {
                    matches = [
                        stream.peek()
                    ];
                    matched = matches[0];
                }
                action = this.lexer.defaultToken;
            }
            // advance stream
            stream.advance(matched.length);
            // maybe call action function (used for 'cases')
            while(action.test) {
                var callres = action.test(matched, matches, state, stream.eos());
                action = callres;
            }
            // set the result: either a string or an array of actions
            var result = null;
            if(typeof (action) === "string" || action instanceof Array) {
                result = action;
            } else if(action.group) {
                result = action.group;
            } else if(action.token !== null && action.token !== undefined) {
                result = action.token;
                // do $n replacements?
                if(action.tokenSubst) {
                    result = Common.substituteMatches(this.lexer, result, matched, matches, state);
                }
                // enter embedded mode?
                if(action.nextEmbedded) {
                    if(action.nextEmbedded === "@pop") {
                        if(!this.embeddedMode) {
                            Common.throwError(this.lexer, "cannot pop embedded mode if not inside one");
                        }
                        this.embeddedMode = null;
                    } else if(this.embeddedMode) {
                        Common.throwError(this.lexer, "cannot enter embedded mode from within an embedded mode");
                    } else {
                        this.embeddedMode = Common.substituteMatches(this.lexer, action.nextEmbedded, matched, matches, state);
                        this.embeddedEntered = true;
                    }
                }
                // state transformations
                if(action.goBack) {
                    // back up the stream..
                    stream.goBack(action.goBack);
                }
                if(action.switchTo && typeof action.switchTo === "string") {
                    var nextState = Common.substituteMatches(this.lexer, action.switchTo, matched, matches, state);// switch state without a push...
                    
                    if(nextState[0] === "@") {
                        nextState = nextState.substr(1);
                    }// peel off starting '@'
                    
                    if(!Common.findRules(this.lexer, nextState)) {
                        Common.throwError(this.lexer, "trying to switch to a state '" + nextState + "' that is undefined in rule: " + rule.name);
                    } else {
                        this.stack[0] = nextState;
                    }
                    next = null;
                } else if(action.transform && typeof action.transform === "function") {
                    this.stack = action.transform(this.stack)// if you need to do really funky stuff...
                    ;
                    next = null;
                } else if(action.next) {
                    if(action.next === "@push") {
                        if(this.stack.length >= this.lexer.maxStack) {
                            Common.throwError(this.lexer, "maximum tokenizer stack size reached: [" + this.stack[0] + "," + this.stack[1] + ",...," + this.stack[this.stack.length - 2] + "," + this.stack[this.stack.length - 1] + "]");
                        } else {
                            this.stack.unshift(state);
                        }
                    } else if(action.next === "@pop") {
                        if(this.stack.length <= 1) {
                            Common.throwError(this.lexer, "trying to pop an empty stack in rule: " + rule.name);
                        } else {
                            this.stack.shift();
                        }
                    } else if(action.next === "@popall") {
                        if(this.stack.length > 1) {
                            this.stack = [
                                this.stack[this.stack.length - 1]
                            ];
                        }
                    } else {
                        var nextState = Common.substituteMatches(this.lexer, action.next, matched, matches, state);
                        if(nextState[0] === "@") {
                            nextState = nextState.substr(1);
                        }// peel off starting '@'
                        
                        if(!Common.findRules(this.lexer, nextState)) {
                            Common.throwError(this.lexer, "trying to set a next state '" + nextState + "' that is undefined in rule: " + rule.name);
                        } else {
                            this.stack.unshift(nextState);
                        }
                    }
                }
                if(action.log && typeof (action.log) === "string") {
                    Common.log(this.lexer, this.lexer.displayName + ": " + Common.substituteMatches(this.lexer, action.log, matched, matches, state));
                }
            }
            // check result
            if(result === null) {
                Common.throwError(this.lexer, "lexer rule has no well-defined action in rule: " + rule.name);
                result = this.lexer.defaultToken;
            }
            // is the result a group match?
            if(result instanceof Array) {
                if(this.groupActions && this.groupActions.length > 0) {
                    Common.throwError(this.lexer, "groups cannot be nested: " + rule.name);
                }
                if(matches.length !== result.length + 1) {
                    Common.throwError(this.lexer, "matched number of groups does not match the number of actions in rule: " + rule.name);
                }
                var totalLen = 0;
                for(var i = 1; i < matches.length; i++) {
                    totalLen += matches[i].length;
                }
                if(totalLen !== matched.length) {
                    Common.throwError(this.lexer, "with groups, all characters should be matched in consecutive groups in rule: " + rule.name);
                }
                this.groupMatches = matches;
                this.groupMatched = matches.slice(1);
                this.groupActions = result.slice(0);
                this.groupRule = rule;
                stream.goBack(matched.length);
                return this.tokenize(stream);// call recursively to initiate first result match
                
            } else// regular result
             {
                // check for "@rematch"
                if(result === "@rematch") {
                    stream.goBack(matched.length);
                    matched = ""// better set the next state too..
                    ;
                    matches = null;
                    result = "";
                }
                // check progress
                if(matched.length === 0) {
                    if(stackLen0 !== this.stack.length || state !== this.stack[0] || (!this.groupActions ? 0 : this.groupActions.length) !== groupLen0) {
                        if(!noConsumeIsOk) {
                            // used for nested modes..
                            return this.tokenize(stream);// tokenize again in the new state
                            
                        }
                    } else {
                        Common.throwError(this.lexer, "no progress in tokenizer in rule: " + rule.name);
                        stream.advanceToEOS()// must make progress or editor loops
                        ;
                        // result="";
                                            }
                }
                // return the result (and check for brace matching)
                // todo: for efficiency we could pre-sanitize tokenPostfix and substitutions
                if(result.indexOf("@brackets") === 0) {
                    var rest = result.substr("@brackets".length);
                    var bracket = findBracket(this.lexer, matched);
                    if(!bracket) {
                        Common.throwError(this.lexer, "@brackets token returned but no bracket defined as: " + matched);
                        bracket = {
                            token: "",
                            bracketType: Modes.Bracket.None
                        };
                    }
                    return {
                        type: Common.sanitize(bracket.token + rest),
                        bracket: bracket.bracketType
                    };
                } else {
                    var token = (result === "" ? "" : result + this.lexer.tokenPostfix);
                    return {
                        type: Common.sanitize(token),
                        bracket: action.bracket
                    };
                }
            }
        };
        return MonarchLexer;
    })(ModesExtensions.AbstractState);
    exports.MonarchLexer = MonarchLexer;    
    // ----------------------------------------------------------------------------------
    // The MonarchMode creates a Monaco language mode given a certain language description
    // ----------------------------------------------------------------------------------
    var MonarchMode = (function (_super) {
        __extends(MonarchMode, _super);
        function MonarchMode(lexer) {
            if(!lexer.name && (lexer).lexer) {
                // it is a deferred lexer from DeferredDescriptor
                lexer = (lexer).lexer;
            }
                _super.call(this, lexer.name, lexer.workerScriptPath ? lexer.workerScriptPath : Common.monarchPath + "Worker", lexer.usesEmbedded);
            this.lexer = lexer;
            this.modesRegistry = (Platform.Registry ? Platform.Registry.as(ModesExtensions.Extensions.EditorModes) : null);
        }
        MonarchMode.prototype.getInitialState = function () {
            return new MonarchLexer(this, this.lexer);
        };
        MonarchMode.prototype.getNonWordTokenTypes = function () {
            return this.lexer.nonWordTokens;
        };
        MonarchMode.prototype.getElectricCharacters = function () {
            return this.lexer.electricChars.split("");
        };
        MonarchMode.prototype.getAutoClosingPairs = function () {
            return this.lexer.autoClosingPairs;
        };
        MonarchMode.prototype.getCommentsConfiguration = function () {
            return {
                lineCommentTokens: [
                    this.lexer.lineComment
                ],
                blockCommentStartToken: this.lexer.blockCommentStart,
                blockCommentEndToken: this.lexer.blockCommentEnd
            };
        };
        MonarchMode.prototype.onEnterImpl = function (line, tokens, offset) {
            return onEnter(this.lexer, line, tokens, offset);
        };
        MonarchMode.prototype.onElectricCharacterImpl = function (line, tokens, offset) {
            return onElectricChar(this.lexer, line, tokens, offset);
        };
        MonarchMode.prototype.enterNestedMode = // ----------------------------------------------------------------------------------
        // The following API deals with embedded language modes
        // ----------------------------------------------------------------------------------
        function (state) {
            if(!(state instanceof MonarchLexer)) {
                return false;
            }
            return (state).embeddedEntered;
        };
        MonarchMode.prototype.getNestedMode = function (state) {
            if(state instanceof MonarchLexer) {
                var mime = (state).embeddedMode;
                var mode = getEditorMode(this.modesRegistry, mime);
                if(mode) {
                    return mode;
                }
                // fall through if the mode cannot be found
                            }
            return getEditorMode(this.modesRegistry, "text/plain");// always return a valid mode object
            
        };
        MonarchMode.prototype.getLeavingNestedModeData = function (line, state) {
            // state = state.clone();
            var mstate = state;
            var stream = new Stream.LineStream(line);
            while(!stream.eos() && mstate.embeddedMode) {
                mstate.tokenize(stream, true)// allow no consumption for @rematch
                ;
            }
            if(mstate.embeddedMode) {
                return null;
            }// don't leave yet
            
            var end = stream.pos();
            return {
                nestedModeBuffer: line.substring(0, end),
                bufferAfterNestedMode: line.substring(end),
                stateAfterNestedMode: mstate
            };
        };
        return MonarchMode;
    })(ModesExtensions.AbstractMode);
    exports.MonarchMode = MonarchMode;    
    // ----------------------------------------------------------------------------------
    // Register a language description with Monaco
    // If it is 'false', at we allow functions and RegExp objects in actions
    // ----------------------------------------------------------------------------------
    var registered = {
    };
    /// <summary>
    /// Create an editor mode from a JSON language definition.
    /// This call does not register
    /// </summary>
    function createEditorMode(json) {
        var lexer = Compile.compile(json);
        var mode = new MonarchMode(lexer);
        registered[lexer.name] = {
            mode: mode,
            mimeTypes: lexer.mimeTypes
        };
        return mode;
    }
    exports.createEditorMode = createEditorMode;
    /// <summary>
    /// Statically register a language definition with Monaco and return the editor mode object.
    /// <summary>
    function register(json) {
        var lexer = Compile.compile(json);
        var mode = new MonarchMode(lexer);
        registered[lexer.name] = {
            mode: mode,
            mimeTypes: lexer.mimeTypes
        };
        // var options = {};
        // if (lexer.editorOptions) options.editor = lexer.editorOptions;
        // Platform.Registry.registerEditorMode(lexer.mimeTypes, mode, options);
        if(Platform && Platform.Registry) {
            var modesRegistry = Platform.Registry.as(ModesExtensions.Extensions.EditorModes);
            modesRegistry.registerMode(lexer.mimeTypes, new Platform.DeferredDescriptor(Common.monarchPath, 'MonarchMode', lexer));
        }
        return mode;
    }
    exports.register = register;
    function getEditorMode(registry, mimeType) {
        if(!registry || registry.getMode === undefined) {
            return null;
        }
        var editor = registry.getMode(mimeType);
        if(editor) {
            return editor;
        }
        if(registry.getOrCreateMode) {
            var promise = registry.getOrCreateMode(mimeType);
            if(promise && promise.value) {
                return promise.value;
            } else {
                return null;
            }
        }
    }
    /// <summary>
    /// Return a registered language mode.
    /// This is used mainly for stand-alone execution.
    /// </summary>
    function getLanguage(mimeType) {
        if(Platform) {
            var editor = getEditorMode(Platform.Registry.as(ModesExtensions.Extensions.EditorModes), mimeType);
            if(editor) {
                return editor;
            }
        }
        // otherwise, look in our own registry..
        if(registered[mimeType]) {
            // mimeType === name
            return registered[mimeType].mode;
        }
        var name;
        for(name in registered) {
            var reg = registered[name];
            for(var i = 0; i < reg.mimeTypes.length; i++) {
                if(reg.mimeTypes[i] === mimeType) {
                    return reg.mode;
                }
            }
        }
        return null;
    }
    exports.getLanguage = getLanguage;
    // ----------------------------------------------------------------------------------
    // Tokenize text independent of an editor
    // ----------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------
    // This can be used to highlight pieces of static text without instantiating editors
    // Works for any Mode, not just Monarch lexers
    // ----------------------------------------------------------------------------------
    function _highlightLine(tokenizer, line) {
        var stream = new Stream.LineStream(line);
        var html = "";
        while(!stream.eos()) {
            var posStart = stream.pos();
            var type = null;
            var brackets = "";
            while(type === null) {
                var pos0 = stream.pos();
                var result = tokenizer.tokenize(stream);
                type = result.type;
                if(result.bracket) {
                    if(result.bracket === Modes.Bracket.Open) {
                        brackets += " bracket-open";
                    }
                    if(result.bracket === Modes.Bracket.Close) {
                        brackets += " bracket-close";
                    }
                }
                if(result.nextState) {
                    result.nextState.setStateData(tokenizer.getStateData());
                    tokenizer = result.nextState;
                } else if(!type && stream.pos() - pos0 <= 0) {
                    Common.throwError(null, "no progress in tokenizer")// FIX: null should be a lexer for monarch states
                    ;
                    break;
                }
            }
            var len = stream.pos() - posStart;
            var src = "";
            if(len > 0) {
                stream.goBack(len);
                src = Common.htmlEscape(stream.advance(len));
            }
            var classes = "";
            if(!Common.empty(type)) {
                classes += result.type.replace(/\./g, ' ');
            }
            if(!Common.empty(brackets)) {
                classes += brackets;
            }
            if(!Common.empty(classes)) {
                src = "<span class='token " + classes + "'>" + src + "</span>";
            }
            html += src;
        }
        return {
            html: html,
            next: tokenizer
        };
    }
    function _highlightText(tokenizer, text) {
        var lines = text.replace(/\r/g, '').split('\n');
        var html = "";
        for(var i = 0; i < lines.length; i++) {
            var result = _highlightLine(tokenizer, lines[i]);
            html += result.html;
            tokenizer = result.next;
            if(i !== lines.length - 1) {
                html += "<br>";
            }
        }
        return {
            html: html,
            next: tokenizer
        };
    }
    // highlight an element
    function _highlightElem(tokenizer, elem, outerClass) {
        if (typeof outerClass === "undefined") { outerClass = null; }
        var text = elem.innerText;
        if(!text) {
            text = elem.textContent;
        }// for firefox
        
        // trim whitespace
        text = text.replace(/(^([ \t]*[\n\r]+)+)|(\s+$)|(\r)/g, '');
        // indent removal
        var html = _highlightText(tokenizer, text).html;
        if(outerClass) {
            html = "<span class='" + outerClass + "'>" + html + "</span>";
        }
        elem.innerHTML = html;
    }
    /// <summary>
    /// Highlight a specific string text, returning highlighted HTML.
    /// </summary>
    function highlightText(text, mimeType, outerClass) {
        if (typeof mimeType === "undefined") { mimeType = "text/plain"; }
        if (typeof outerClass === "undefined") { outerClass = null; }
        if(!text) {
            return "";
        }
        var mode = getLanguage(mimeType);
        if(!mode) {
            return null;
        }
        if(!mode.tokenizationSupport) {
            return null;
        }
        var tokenizer = mode.tokenizationSupport.getInitialState();
        var html = _highlightText(tokenizer, text).html;
        if(outerClass) {
            html = "<span class='" + outerClass + "'>" + html + "</span>";
        }
        return html;
    }
    exports.highlightText = highlightText;
    /// <summary>
    /// Highlight a  specific HTML element
    /// elem: the element
    /// defaultMimeType, optional: the default mime type if no 'type' attribute was present
    /// outerClass, optional: a string of class names that will span all of the highlighted html. (for example: "monaco-editor")
    /// </summary>
    function highlightElem(elem, defaultMimeType, outerClass) {
        if (typeof defaultMimeType === "undefined") { defaultMimeType = "text/plain"; }
        if (typeof outerClass === "undefined") { outerClass = null; }
        if(!elem) {
            return;
        }
        var mimeType = elem.getAttribute("type");
        var mode = null;
        if(mimeType) {
            mode = getLanguage(mimeType);
        }
        if(!mode) {
            mode = getLanguage(defaultMimeType);
        }
        if(!mode) {
            return;
        }
        var tokenizer = mode.getInitialState();
        _highlightElem(tokenizer, elem, outerClass);
    }
    exports.highlightElem = highlightElem;
    /// </summary>
    /// Highlight many elements
    /// Highlights all elems with tag tag (use "*" for all elements), and a class that matches the regular expression class.
    /// Use the optional defaultMimeType if there is no type attribute specified on the element.
    /// Optionally enclose the highlighted result with a span with class names outerClass.
    /// </summary>
    function highlightElems(tagName, sclassRegEx, defaultMimeType, outerClass) {
        if (typeof defaultMimeType === "undefined") { defaultMimeType = "text/plain"; }
        if (typeof outerClass === "undefined") { outerClass = null; }
        var classRegEx = (!sclassRegEx ? null : new RegExp(sclassRegEx));
        var elems = document.getElementsByTagName(tagName);
        var i;
        for(i in elems) {
            var elem = elems[i];
            var clsName = elem.className;
            if(classRegEx === null || classRegEx.test(clsName)) {
                highlightElem(elem, defaultMimeType, outerClass);
            }
        }
    }
    exports.highlightElems = highlightElems;
})
