# dp-demos
Differential Privacy Demos

This git repository is designed to be checked out in the root directory of a webserver directory.

A collection of scripts and web-based demos designed to help explain
how differential privacy works.  Welcome to the web demo for
differential privacy.

# The Web Simulator

The web-based simulator runs locally in the user's browser. It consists of the following parts:

* HTML file which displays the tutorial and houses the JavaScript glue.
* JavaScript differential privacy engine.
* CSS Responsive Framework --- We currently use Skeleton

## The DP Engine

We implement a traditional model-view-controller architecture.

* Model - The model stores the current differential privacy problem, including the private data, the privitized data, and the parameters. The model is kept in the browser's memory as a JavaScript dictionary. It is loaded from the HTML page. The design of the system allows multiple models to co-exist.

* View - This is the section of the browser's DOM object where the model is displayed. Typically this will be a DIV.

* Controller - The JavaScript that gets called when the user updates the View, or when an experiment is running. The Controller updates the model, sends the model to the Differential Privacy Engine, gets the response from the engine, and then updates the view.

The DP engine implements a simple privitized histogram. That is, it is given an array of counts, and it adds Laplace noise to each slot in the array. The sensitivity is therefore 1. After it runs, negative counts are rounded up. 

* Inputs - A JavaScript dictionary that contains:
  * epsilon:float --- Value of Epsilon
  * callback:func --- A function to call when the values are updated. The function is called with the Outputs dictionary (see below) as its sole argument.
  * counts:array (of integers) --- The input counts
  * labels:array (of strings) --- optional - the labels for the counts.
  * invariant_counts:int --- A flag (0 or 1) of whether or not to preserve the total number of counts. If invariant_counts is 1, then the total counts are preserved.
  * other values may be present; they are ignored.

* Outputs - The JavaScript input directory, with the following additional properties:
  * all input values, including those that are ignored.
  * noises:array --- The noise that was added to each slot in the array.  
  * noisy_counts:array --- A new array, with the final values.  Note that the post-processing optimizer may prevent counts + noise from equalling noisy_counts

## DP Experiments
For advanced users, it is useful to see how multiple runs on the DP engine result in different values, but that those values produce a distribution. The simulator does this by running multiple runs of the DP engine and presenting the results as a table and a graph.

# Development Notes

Notes from when we developed this system...

## Requirements

Requirements for a differential privacy demo:

1. Must run in a browser. This means we have the following development options:
   * Some JavaScript-based framework.
   * processing.js
   * p5js.org
   * https://jqueryui.com/slider/#range

Demos:
  * https://www.openprocessing.org/sketch/115256

  * http://materializecss.com/
  * https://krescruz.github.io/angular-materialize/
  * http://foundation.zurb.com
  * http://foundation.zurb.com/sites/docs/slider.html
  * http://foundation.zurb.com/sites/docs/v/5.5.3/components/range_slider.html

2. Must show a simple query and how differential privacy generates results.

   - Show number of people on a block.
   - Click a button to compute again
   - Allow it to run over time and build up a distribution.

3. Must be mathematically correct.
So we need a laplace in JavaScript:
* https://www.npmjs.com/package/probability-distributions

4. Must use a responsive framework.

We decided to code this in small responsive framework, but we wanted slides are well.  So we tried to use a combination of a tiny responsible CSS style and a slider. We considered the following frameworks and sources:

* https://minicss.org/
* https://www.webpagefx.com/blog/web-design/small-css-frameworks/
* https://milligram.io/
* https://purecss.io/tools/
* http://getskeleton.com/
* https://materializecss.com/p

We decided to use the following tools with the following Google hosting service points. [Learn more about about Google Hosted Libraries](https://developers.google.com/speed/libraries/)

* (Skeleton 2.0.4)[http://getskeleton.com/]:

Skeleton is so small that we self-host it. Yea!


* (JQuery user interface version 1.12.1)[http://jqueryui.com/]: 

    <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>

* JQuery version 3:

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>

We have a demo at demo.html. Because JavaScript libraries need to be fetched by https://, rather than by file://, you can find a copy at https://demo.dpwiki.org/

## Graphing
Earlier versions of this program made it possible to create accuracy/privacy loss graphs. Those are kind of neat. Here are some references we looked at:

* http://www.jscharts.com/how-to-use-line-graphs
* https://plot.ly/javascript/
* https://stackoverflow.com/questions/13300501/how-to-draw-a-plot-from-array-of-numbers-that-updates-every-sec-in-html-5
* https://stackoverflow.com/questions/36113789/how-to-draw-a-line-graph-from-an-array-using-javascript
* http://jsfiddle.net/3T6qc/
* https://stackoverflow.com/questions/18294300/flot-bar-graph-align-bars-with-x-axis-labels
* https://stackoverflow.com/questions/33629003/flotcharts-barchart-first-and-last-bar-cut-off
