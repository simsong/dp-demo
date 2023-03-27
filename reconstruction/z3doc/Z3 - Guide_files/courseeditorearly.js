var editorMode;

function loadEditor(index) {
    var code = $(this);
    var text = code.text().trim();
    code.html("")
    .removeClass('listing')
    .addClass('listingeditor');
    var mode = code.attr('ptype') || code.attr('type') || editorMode;
    var readonly = code.attr('readOnly');
    var self = this;
    var scrollbar = (code.attr("scrollbar") === "true") ? "visible" : "hidden";
    Monaco.Editor.getOrCreateMode(mode).then(function () {
        var editor = Monaco.Editor.create(self, {
            value: text,
            mode: mode,
            fontIsMonospace: true,
            lineNumbers: true,
            tabSize: 2,
            insertSpaces: true,
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: (readonly === "true"),
            scrollbar: {
                vertical: scrollbar,
                handleMouseWheel: false
            }
        });
        var height = code.attr('height');
        if (!height) {
            height = (text.split('\n').length * 1.5) + "em";
        }
        code.height(height);
        editor.layout();
        self.editor = editor;
    });
}

function loadEditors(mode, jsonLanguageDef) {
    $('#progressbar').fadeIn(function () {
        editorMode = mode;
        require.config({ baseUrl: "/editor" });
        require(["vs/editor/editor.main"], function () {
            require(["vs/languages/monarch/monarch"], function (_monarch) {
                // require('vs/platform/platform').Registry.getMode(editorMode).loadAndCreate().then(function () {
                Monaco.Editor.getOrCreateMode(mode).then(function () {
                    if (jsonLanguageDef && _monarch) {
                        try {
                            _monarch.register(jsonLanguageDef);
                        }catch(e){}
                    }
                    if (_monarch) {
                      _monarch.highlightElems("pre", /listing/, editorMode, "monaco-editor vs");
                      _monarch.highlightElems("code", /listing/, editorMode, "monaco-editor vs");
                    }
                    else {
                        $('pre.listing').each(loadEditor);
                    }
                    $('pre.editor').each(loadEditor);
                });
            });
        });
    }).fadeOut();
}