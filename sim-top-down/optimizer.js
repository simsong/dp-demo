var debug=false; 

p = console.log;
console.log("hello");

/****************************************************************/
// Privacy Functions
// From wikipedia:
// Lap(X) = mu - b sgn(U) ln (1-2|U|) where U is a random variable between -0.5 and 0.5

/* Sign function */
function sgn(x) {
    return x < 0 ? -1 : 1;
}

/* Laplace distribution */
function laplace(mu, b) {
    let U = Math.random() - 0.5;
    return mu - (b * sgn(U) * Math.log(1 - 2 * Math.abs(U)));
}

/* Laplace noise for a specific privacy budget and sensitivity */
function laplace_noise(budget, sensitivity ) {
    return laplace(0.0, (sensitivity / budget));
}

/* Privatize an array of counts (histogram) exploiting parallel composition */
function privatize_array(vars, epsilon) {
    return vars.map( function(a) {
        return a + laplace_noise(epsilon, 1);
    });
}

/****************************************************************/


function square(x) {
    return x * x;
}

/* Score how close vals is to the goal */
function score(goal, vals) {
    let sum_of_squares = 0.0;
    for ( let i=0 ; i < goal.length ; i++ ){
        sum_of_squares += square(goal[i] - vals[i]);
    }
    return Math.sqrt(sum_of_squares);
}

// concatenate multiple arrays together
function concat() {
    let a = [];
    for (let i=0; i< arguments.length; i++){
        a = a.concat(arguments[i]);
    }
    return a
}

// equal two arrays; python does this for us!
function equal(a,b) {
    if ( a.length !== b.length) return false;
    for (let i=0; i< a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/* Given a goal and a current set of vals, evaluate all possible moves (of 1 person) on vals and return the best new set */
function optimize1(goal, vals) {
    // Start with the current position
    let best_vals  = vals.map( Math.round );
    let best_score = score(goal, best_vals);

    // Evaluate every possible move and find the one that produces the lowest score
	// This is essentially a discrete "gradient descent" move in our discrete space of people-in-blocks/counties/county
    for ( let from_ = 0; from_ < vals.length ; from_++ ) {
        for ( let to_ = 0; to_ < vals.length; to_++ ) {
            if ( from_ === to_ ) continue;   // doesn't move anywhere
            if ( vals[from_] < 1) continue; // none to move (This is the non-negativity constraint)
            let nvals = vals.slice(); // [...vals];              // copy the array, [...vals] is not compatible with IE
            nvals[to_] += 1;                // make the move
            nvals[from_] -= 1;
            const nvals_score = score(goal, nvals); // score it
            if (best_score > nvals_score) {   // found a better score
                best_score = nvals_score;
                best_vals  = nvals;
            }
        }
    }
    return best_vals;
}

/* optimize: Run the count optimizer until the array is unchanged or we run out of steps
 * @param goal - array of goal counts (in most cases, just the noisy counts, right after the noise barrier)
 * @param vals - array of initial values. If it is shorter than goal, it is extended with zeros. 
 */

MAX_STEPS=100000;
function optimize(goal, vals){
    if (debug){
        p(goal,'<-',vals);
    }
    vals = vals.slice(); //[...vals];           // make a local copy, [...vals] is not compatible with IE

    // Make sure both are the same length
    // When optimizing, for example, county-to-county, we start with vals array being of length 1 (we have 1 county), having all the people
    // in the county. We have 2 counties, so add one more cell into the array with push. The starting distribution of people is then everyone
    // in one county and no one in the other. The optimize1 function will move people to that other county until the error stops decreasing
    while (vals.length < goal.length) {
        vals.push(0);
    }

    // with a maximum of MAX_STEPS, iteratively optimize
    for (let i=0; i<MAX_STEPS ; i++) {
        var nvals = optimize1(goal, vals);  // Move one person in a way that decreases error the most ( ~ move a "step" along a "gradient" in this discrete space)
        if (equal(vals,nvals)) {
            break;
        }
        vals = nvals;
    }
    if (debug) {
        p('   -> ', nvals);
    }
    return nvals
}

/* pluck: Given an array, return an array of either the odds or the evens elements */
function pluck(src,offset) {
    let a = [];
    for (let i=0; i< src.length; i+=2){
        a.push( src[i + offset]);
    }
    //p("--PLUCK--");
    //p("src:",src);
    //p("offset:",offset);
    //p("ret:",a);
    return a;
}


/* like the Python zip */
function zip(a,b) {
    let ret = [];
    for (let i = 0; i < a.length; i++) {
        ret.push([a[i],b[i]]);
    }
    return ret;
}



/* like the Python zip followed by a flatten */
function flat_zip(a,b) {
    let ret = [];
    for (let i = 0; i < a.length; i++) {
        ret.push(a[i]);
        ret.push(b[i]);
    }
    return ret;
}

/* zip_optimize: Like optimize above, but process the odd and even elements separately.
 * Odd elements represent male counts, even female counts. This assures that sex won't
 * be changed after the top-level optimization.
 *
 * It is a resourceful way to treat the sex constraint, which otherwise would considerably complicate the optimization problem.
 * (in the real top-down algorithm, there are many constraints, so this trick does not save the day and is not used)
 */

function zip_optimize(goal, vals){
    const male_goal = pluck(goal, 0);
    const female_goal = pluck(goal, 1);
    const male_vals   = pluck(vals, 0);
    const female_vals = pluck(vals, 1);

    const nmale   = optimize(male_goal, male_vals);
    const nfemale = optimize(female_goal, female_vals);
    return flat_zip(nmale, nfemale);
}

function sum_up(vals) {
    let a = 0;
    let b = 0;
    for ( let i=0; i < vals.length; i+=2 ){
        a += vals[i];
        b += vals[i+1];
    }
    return [a,b]
}

function topdown(epsilon,true_blocks) {
    const true_county1 = sum_up(true_blocks.slice(0,6));
    const true_county2 = sum_up(true_blocks.slice(6,12));
    const true_county   = sum_up( concat(true_county1, true_county2) );

    if(debug){
        p("true_blocks:",true_blocks);
        p("county1:", true_county1);
        p("county2:", true_county2);
        p("county:", true_county);
    }

    ///////////////////////////////////////////////
    //////////////// NOISE BARRIER ////////////////
    ///////////////////////////////////////////////
    let pm_blocks  = privatize_array(true_blocks, epsilon * 0.333);
    let pm_county1 = privatize_array(true_county1, epsilon * 0.333); // parallel composition1
    let pm_county2 = privatize_array(true_county2, epsilon * 0.333); // parallel composition2
    let pm_county   = privatize_array(true_county, epsilon * 0.333);
    ///////////////////////////////////////////////
    //////////////// NOISE BARRIER ////////////////
    ///////////////////////////////////////////////

    // Run top-level -> top-level to balance the histogram.
    // This isn't needed with just one set of measurements, but
    // we do it anyway because the real top-down algorithm does.
    let p_county = optimize(pm_county, pm_county);

    // Non-negativity
    for(let i=0;i<2;i++){
        if (p_county[i] < 0 ){
            p_county[i] = 0;
        }
    }

    if(debug){
        p("\nStarting county: ", true_county);
        p("Ending county: ", p_county);
    }

    // Distribute from the county to the two counties:
    let p_county12 = zip_optimize( concat(pm_county1,pm_county2), p_county);
    let p_county1  = p_county12.slice(0,2);
    let p_county2  = p_county12.slice(2,4);

    // distribute from each county to the blocks
    let p_block123 = zip_optimize( pm_blocks.slice(0,6),  p_county1 );
    let p_block456 = zip_optimize( pm_blocks.slice(6,12), p_county2 );
    let p_blocks   = concat(p_block123, p_block456);

    if (debug) {
        p("p_county12:",p_county12);
        p("\nStarting blocks: ",true_blocks);
        p("Ending blocks:   ",p_blocks);
    }

    let total_error = 0;
    for(let i=0;i< true_blocks.length; i++){
        if(debug){
            p(true_blocks[i],"-->",p_blocks[i]);
        }
        total_error += Math.abs( true_blocks[i] - p_blocks[i] );
    }
    if (debug) {
        p("\nTotal error:",total_error);
    }
    return p_blocks;

    //goal = [1,2,3,4,5,6];
    //v1 = [3,2,1,0,3,6];

    //vn = optimize(goal, [99,0,0,0,0,0]);
    //vn = optimize(goal, [0,0,10,0,0,0]);
    //vn = optimize(goal, [0,0,0,0,0,10]);

    //optimize1(goal, v1);
}


// This function is not needed for the web simulator and is only used to test that topdown algorithm works
function main() {
    // True measures
    let true_blocks = [1,2, 2,4, 5,10, 1000,1010, 1500,1060, 1800,1100];
    let private_blocks = topdown(true_blocks)
}
