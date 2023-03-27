define(["require", "exports"], function(require, exports) {
    
    
    
    //-----------------------------------------------------------------------------------------
    // Globals
    //-----------------------------------------------------------------------------------------
    exports.monarchPath = 'vs/languages/monarch/monarch';
    function version() {
        return "0.96  (2013.01.22)";
    }
    exports.version = version;
    //-----------------------------------------------------------------------------------------
    // Small helper functions
    //-----------------------------------------------------------------------------------------
    // Is a string null, undefined, or empty?
    function empty(s) {
        return (s ? false : true);
    }
    exports.empty = empty;
    // Put a string to lower case if 'ignoreCase' is set.
    function fixCase(lexer, str) {
        return (lexer.ignoreCase && str ? str.toLowerCase() : str);
    }
    exports.fixCase = fixCase;
    //-----------------------------------------------------------------------------------------
    // HTML sanitization
    //-----------------------------------------------------------------------------------------
    var escapes = {
        '&': '&amp;',
        '<': // & first!
        '&lt;',
        '>': '&gt;',
        '\'': '&apos;',
        '"': '&quot;'
    };
    //, ' ': '&nbsp;'
    //, '\n': '<br>'
    var escapesRe = new RegExp("[" + Object.keys(escapes).join("") + "]", "g");
    // Escape HTML characters like < > and &
    function htmlEscape(txt) {
        return txt.replace(escapesRe, function (s) {
            var r = escapes[s];
            return (r ? r : "");
        });
    }
    exports.htmlEscape = htmlEscape;
    // Ensure there are no bad characters in a CSS token class
    function sanitize(s) {
        return s.replace(/[&<>'"]/g, '_');// used on all output token CSS classes
        
    }
    exports.sanitize = sanitize;
    //-----------------------------------------------------------------------------------------
    // Logging
    //-----------------------------------------------------------------------------------------
    // Log a message
    function appendInnerText(elem, txt) {
        elem.innerHTML += htmlEscape(txt);
    }
    function logMessage(consoleId, msg) {
        if(consoleId) {
            var consoleArea = document.getElementById(consoleId);
            if(consoleArea) {
                appendInnerText(consoleArea, msg + "\n");
                if(consoleArea.scrollTop) {
                    consoleArea.scrollTop = consoleArea.scrollHeight// scroll to end
                    ;
                }
            }
        }
        if(console) {
            console.log(msg);
        }
    }
    function log(lexer, msg) {
        logMessage(lexer.logConsole, msg);
    }
    exports.log = log;
    //-----------------------------------------------------------------------------------------
    // Throwing errors
    //-----------------------------------------------------------------------------------------
    // Throw error. May actually just log the error and continue.
    function throwError(lexer, msg) {
        if(!lexer) {
            throw new Error(msg);
        } else {
            msg = lexer.displayName + " highlighter: " + msg;
            if(lexer.logConsole) {
                var consoleArea = document.getElementById(lexer.logConsole);
                if(consoleArea) {
                    appendInnerText(consoleArea, msg + "\n");
                }
            }
            if(lexer.noThrow) {
                if(console) {
                    console.log(msg);
                }
            } else {
                throw new Error(msg);// only during compilation, not during tokenizing
                
            }
        }
    }
    exports.throwError = throwError;
    //-----------------------------------------------------------------------------------------
    // Helper functions for rule finding and substitution
    //-----------------------------------------------------------------------------------------
    /// <summary>
    /// substituteMatches is used on lexer strings and can substitutes predefined patterns:
    /// $$  => $
    /// $#  => id
    /// $n  => matched entry n
    /// @attr => contents of lexer[attr]
    ///
    /// See documentation for more info
    /// </summary>
    function substituteMatches(lexer, str, id, matches, state) {
        var re = /\$((\$)|(#)|(\d\d?)|[sS](\d\d?)|@(\w+))/g;
        var stateMatches = null;
        return str.replace(re, function (full, sub, dollar, hash, n, s, attr, ofs, total) {
            if(!empty(dollar)) {
                return "$";
            }// $$
            
            if(!empty(hash)) {
                return fixCase(lexer, id);
            }// default $#
            
            if(!empty(n) && n < matches.length) {
                return fixCase(lexer, matches[n]);
            }// $n
            
            if(!empty(attr) && lexer && typeof (lexer[attr]) === "string") {
                return lexer[attr];
            }//@attribute
            
            if(stateMatches === null) {
                // split state on demand
                stateMatches = state.split(".");
                stateMatches.unshift(state);
            }
            if(!empty(s) && s < stateMatches.length) {
                return fixCase(lexer, stateMatches[s]);
            }//$Sn
            
            return "";
        });
    }
    exports.substituteMatches = substituteMatches;
    /// <summary>
    /// Find the tokenizer rules for a specific state (i.e. next action)
    /// </summary>
    function findRules(lexer, state) {
        while(state && state.length > 0) {
            var rules = lexer.tokenizer[state];
            if(rules) {
                return rules;
            }
            var idx = state.lastIndexOf(".");
            if(idx < 0) {
                state = null;
            } else {
                // no further parent
                state = state.substr(0, idx);
            }
        }
        return null;
    }
    exports.findRules = findRules;
    /// <summary>
    /// Is a certain state defined? In contrast to 'findRules' this works on a ILexerMin.
    /// This is used during compilation where we may know the defined states
    /// but not yet whether the corresponding rules are correct.
    /// </summary>
    function stateExists(lexer, state) {
        while(state && state.length > 0) {
            var exist = lexer.stateNames[state];
            if(exist) {
                return true;
            }
            var idx = state.lastIndexOf(".");
            if(idx < 0) {
                state = null;
            } else {
                // no further parent
                state = state.substr(0, idx);
            }
        }
        return false;
    }
    exports.stateExists = stateExists;
})
