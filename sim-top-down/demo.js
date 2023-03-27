// All wrapped inside the document.ready() function so that it runs when the document is completely loaded
// We bind the 'input' event because it fires whenever the slider is moved. The 'changed' event only fires
// when the slider is released

// Create a jquery plugin to use .nval() to get the numeric val
// https://stackoverflow.com/questions/9227268/how-can-val-return-number
$.fn.nval = function() {
    // handle the spans
    if (this.text().length){
        return Number(this.text());
    }
    // handle the inputs
    if (this.val().length){
        return Number(this.val());
    }
    return 0;
};


// (f,m) pairs of the true blocks
true_block_map   = ['#rb1-f', '#rb1-m', 
                  '#rb2-f', '#rb2-m', 
                  '#rb3-f', '#rb3-m', 
                  '#rb4-f', '#rb4-m', 
                  '#rb5-f', '#rb5-m', 
                  '#rb6-f', '#rb6-m'];

priv_block_map   = ['#pb1-f', '#pb1-m', 
                  '#pb2-f', '#pb2-m', 
                  '#pb3-f', '#pb3-m', 
                  '#pb4-f', '#pb4-m', 
                  '#pb5-f', '#pb5-m', 
                  '#pb6-f', '#pb6-m'];


initial_counts = ['1','2','3','4','5','6',
                  '101','102','103','104','105','106'];


function sum_county_from_blocks(p) {
    // sum the f & m cells to compute the block populations, the tract population, and the county population
    // Calc the block totals
    for(var b=1;b<=6;b++){
        $("#"+p+"b"+b+"-pop").text( $("#"+p+"b"+b+"-f").nval() + $("#"+p+"b"+b+"-m").nval());
    }

    // Calc Ruraltract totals
    $("#"+p+"rcounty-pop").text( $("#"+p+"b1-pop").nval()  + $("#"+p+"b2-pop").nval()  + $("#"+p+"b3-pop").nval());
    $("#"+p+"rcounty-f").text(   $("#"+p+"b1-f").nval() + $("#"+p+"b2-f").nval() + $("#"+p+"b3-f").nval());
    $("#"+p+"rcounty-m").text(   $("#"+p+"b1-m").nval() + $("#"+p+"b2-m").nval() + $("#"+p+"b3-m").nval());

    // Calc Urbantract totals
    $("#"+p+"ucounty-pop").text( $("#"+p+"b4-pop").nval()  + $("#"+p+"b5-pop").nval()  + $("#"+p+"b6-pop").nval());
    $("#"+p+"ucounty-f").text(   $("#"+p+"b4-f").nval() + $("#"+p+"b5-f").nval() + $("#"+p+"b6-f").nval());
    $("#"+p+"ucounty-m").text(   $("#"+p+"b4-m").nval() + $("#"+p+"b5-m").nval() + $("#"+p+"b6-m").nval());

    // Calc County totals
    $("#"+p+"county-pop").text( $("#"+p+"rcounty-pop").nval() + $("#"+p+"ucounty-pop").nval() );
    $("#"+p+"county-f").text(  $("#"+p+"rcounty-f").nval()   + $("#"+p+"ucounty-f").nval() );
    $("#"+p+"county-m").text(  $("#"+p+"rcounty-m").nval()   + $("#"+p+"ucounty-m").nval() );

}

function recalc() {
    sum_county_from_blocks("r");

    // get the real values
    var epsilon = Number($("#epsilon option:selected").text());
    var true_vals = true_block_map.map(function(_) { return $(_).nval(); });
    var priv_vals = topdown(epsilon,true_vals);

    // for now, just write them over
    zip(priv_block_map, priv_vals).map(function(_) {
        $(_[0]).text( _[1] );
    });
    sum_county_from_blocks("p");
}

function set_true_counts(counts) {
    zip(true_block_map,counts).map(function (_) {
        $( _[0] ).val( _[1] );
    });
    recalc();
}

function unpush_buttons() {
    $(".pushedsbutton").toArray().forEach(function(button) {button.setAttribute("class", "sbutton")});
}

$(document).ready(function() {
    $("input").on('input', function() {
        unpush_buttons();
        this.value = this.value.replace(/\D/g,'');
        if (this.value.length > 4){
            this.value='9999';
        }
        recalc();
    });
    $("#privatize").click( function() {
        recalc();
    });
    $("#epsilon").change( function() {
        recalc();
    });
    $(".sbutton").click( function(event) {
        unpush_buttons();
        this.setAttribute("class", "pushedsbutton");
        var counts =  $(event.target).attr('counts').split(',');
        set_true_counts( counts );
    });

    set_true_counts( initial_counts );
});


