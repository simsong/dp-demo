// Authors: Sarah Powazek, Summer 2018, 
//          Simson Garfinkel, Summer 2018-Dec. 2018
// 
// This code is the result of a joint research between the Massachusetts
// Institute of Technology and the US Census Bureau. 
// 
// Copyright 2018 Sarah Powazek
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// 'Software'), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be 
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// 
// we apologize for the gender binary assumption

var epsilon = 1.0;              // the value of epsilon
var apt_residents = [];         // global variable for who is living in the apartment building. Each is a random take from icons below.
var ADULT_AGE=18;
var icons = [
    {//woman
        'html': [ '👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿' ],
        'men': 0,
        'women': 1,
        'ages': [25]
    }, 
    {//man
        'html': [ '👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿' ],
        'men': 1,
        'women': 0,
        'ages': [55]
    }, 
    {//man and woman
        'html': [ '&#x1F46B;' ],
        'men': 1,
        'women': 1,
        'ages': [30,40]
    }, 
    {//family
        'html': [ '&#x1F46A;' ],
        'men': 2,
        'women': 1,
        'ages': [25,30,5]
    }, 
]


// Utility functions
function getArrayRandomElement (arr) {
    if (arr && arr.length) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    // The undefined will be returned if the empty array was passed
}

// Repeat a string, substituting %i for the counter
function repeat(s, start, end) {
    ret = []
    for (var i = start; i < end; i++) {
        ret.push(s.replace("%i", i))
    }
    return ret.join("");
}

// Draw each apartment building
function draw_houses(count) {
    $('#houses').html('<div id="house1" class="house">' + '<div id="apartment" style="padding-top:10pt; font-size:20pt"></div>' + '</div>');
}

// Create the windows in the apartment building
function draw_windows(count) {
    $('#apartment').html(repeat( '<div class="windowHolder" id="wh%i"></div>', 0, 4));
    for (index = 0, i = 0; i < 4; i++) {
        $('#wh' + i).html(repeat('<div class="window" id="w%i"/><div class="windowSpacer" id="wsp%i"/>', index, index + 4))
        index += 4;
    }
}

//Updates the metrics at the top given the number of people set by the slider
//Is called every time the people slider is touched
function compute_confidential_values() {
    //update counts using people dictionary
    metrics = {
        'men': 0,
        'women': 0,
        'adults': 0,
        'children': 0,
        'total_age': 0,
        'total_population': 0
    };
    for (var i = 0; i < apt_residents.length; i++) {
        elem = apt_residents[i];
        metrics['men']   += elem['men'];
        metrics['women'] += elem['women'];
        metrics['total_population'] += elem['men'] + elem['women']; 
        var ages=elem['ages'];
        for (var j=0; j < ages.length; j++){
            metrics['total_age'] += ages[j];
            if (ages[j] >= ADULT_AGE){
                metrics['adults'] += 1;
            } else {
                metrics['children'] += 1;
            }
        }
    }
    if (metrics['total_population']>0) {
        metrics['average_age'] = metrics['total_age'] / metrics['total_population'];
        $('#confidentialAvgAge').html('' + metrics['average_age'].toPrecision(4));
    } else {
        $('#confidentialAvgAge').html('n/a');
    }

    //update the other html elements
    $('#confidentialAdults').text('' + metrics['adults']);
    $('#confidentialTotalPopulation').text('' + metrics['total_population']);
    $('#confidentialCountF').text('' + metrics['women']);
    $('#confidentialCountM').text('' + metrics['men']);
    return metrics;
}

// Given count occupied units, give each one a random occupant, and then update the confidential values
function set_occupied_units_count(count) {
    apt_residents = []
    for (i = 0; i < 16; i++) {
        if (i < count) {
            person = getArrayRandomElement(icons)
            apt_residents.push(person);
            emojis = person['html'];
            html   = getArrayRandomElement(emojis)
            if (typeof html != 'undefined') {
                html = "<span class='emoji'>" + html + "</span>";
            }
        } else {
            html = '';
        }
        $('#w' + i).html(html);
    }
    compute_confidential_values()
}


function set_epsilon(value){
    $('#epsilonTable').html(epsilon);
    epsilon = value;
}

// given the current model, update the accuracy cell in the view.
//Accuracy is caluclated by averaging the fraction difference
//the noisy value is away from the confidential value
function update_accuracy(model) {
    confidentialVals = model.counts;

    repVals  = model.noisy_counts;
    accuracy = 0
    for (i = 0; i < confidentialVals.length; i++) {
        if (confidentialVals[i]==0){
            $('#accuracy').html('n/a');
            return;
        }
        accuracy += 1 - Math.abs(repVals[i] - confidentialVals[i]) / confidentialVals[i];
    }

    if (confidentialVals.length<1){
        $('#accuracy').html('n/a');
        return;
    }
    accuracy /= confidentialVals.length;
    accuracy *= 100;
    $('#accuracy').html( accuracy.toPrecision(4) + "%");
}


// update is called by the engine after a differential privacy operation is done.
// We update the screen and recalculate the accuracy
// For some reason, it only works if we bind the nameless function to a defined variable.
var update = function(model) {
    adults   = model.noisy_counts[0];
    children = model.noisy_counts[1];
    $('#publishedTotalPopulation').text('' + (adults+children));
    $('#publishedAdults').text('' + adults);
}

function roll_dp() {
    // Create the differential privacy object
    metrics = compute_confidential_values();
    model = {
        epsilon: epsilon,
        callback: update,
        counts: [ metrics['adults'], metrics['children'] ],
        invariant_counts: 0
    };
    privatize_histogram(model);
}


// All wrapped inside the document.ready() function so that it runs when the document is completely loaded
// We bind the 'input' event because it fires whenever the slider is moved. The 'changed' event only fires
// when the slider is released
$(document).ready(function() {
    draw_houses(1);
    draw_windows(4);

    // Create the sliders
    $('#popSlider').slider({min:0, 
                            max:16, 
                            step:1, 
                            value:4, 
                            slide:function(event,ui){
                                set_occupied_units_count(ui.value);
                                roll_dp();
                            }});

    $('#epsilonSlider').slider({min:.05, 
                                max:5.0, 
                                step:.1, 
                                value:1.0, 
                                slide:function(event,ui){
                                    set_epsilon(ui.value);
                                    roll_dp();
                                }});

    // Establish some reasonable defaults
    set_occupied_units_count(4);
    set_epsilon(1.0);
    roll_dp();
});
