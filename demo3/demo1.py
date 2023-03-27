import numpy as np
#import matplotlib as mp
#import matplotlib.pylab as pylab
#import matplotlib.pyplot as plot
import sys

sys.path.append("/Users/simsong/gits/stats_2010")
import ctools.tydoc as tydoc
from tydoc import tytable

MAX_AGE = 110
def get_range(frac, vals):
    ct = len(vals)
    vals = list(sorted(vals))
    delta = (1-frac)/2
    v1 = vals[int( ct * delta ) ]
    v2 = vals[int( ct * (1-delta))]
    return (v1,v2)

def print_stats(desc,vals):
    ct = len(vals)
    vals = list(sorted(vals))
    for frac in [.25, .95, .99]:
        (v1,v2) = get_range(frac, vals)
        print("v1:",v1)
        print("v2:",v2)
        print(f"{desc} {frac*100}%: {v1:.02f} → {v2:.02f}  "
              f"(median: {(v2+v1)/2:.02f} range: {v2-v1:.02f})")

def print_experiment_stats(epsilon,n,avg,counts,ages):
    print(f"Epsilon: {epsilon}")
    print(f"Num people: {n} all of age: {avg}")
    print_stats("private count of people:", counts)
    print_stats("private average ages", ages)
    print("")

    
def naive_stats(epsilon, n, age, verbose=False):
    # Differentially private count and average where people all have the same value
    n_sensitivity = 1 
    n_noise    = np.random.laplace(scale=([n_sensitivity/(epsilon*.5)]))[0]
    private_num = n + n_noise
    age_sensitivity = 110 
    age_noise = np.random.laplace(scale=([age_sensitivity/(epsilon*.5)]))[0]
    private_sum_ages = (age*n) + age_noise
    private_average_age = private_sum_ages / private_num
    return {'private_num':private_num,'private_average_age':private_average_age}

    
def dp_age_histogram(epsilon, npeople, age, verbose=False):
    # Given a value of epsilon, and a count of people all the same age
    # create a histogram and then calc average age and the like
    NUM_AGES = MAX_AGE+1
    bins      = np.zeros(NUM_AGES)
    bins[age] = npeople
    noises    = np.random.laplace(scale= np.resize( 1.0/epsilon, NUM_AGES ))
    private_bins = bins + noises
    private_num  = private_bins.sum()
    total_age    = (private_bins * np.arange(NUM_AGES)).sum()
    private_average_age  = total_age / private_num
    if verbose:
        print(f"Epsilon: {epsilon}")
        print(f"Num people: {npeople} age: {age}")
        print(f"Real histogram: ")
        for i in range(NUM_AGES):
            print(f"{i}:{bins[i]:0.1f} ",end='')
        print(f"\nNoises:")
        for i in range(NUM_AGES):
            print(f"{i}:{noises[i]:0.1f} ",end='')
        print(f"\nPrivate histogram:")
        for i in range(NUM_AGES):
            print(f"{i}:{private_bins[i]:0.1f} ",end='')
        print(f"\nprivate[{age}] = {private_bins[age]}")
        total_people = 0
        total_age = 0
        for i in range(NUM_AGES):
            total_people += private_bins[i]
            total_age += i * private_bins[i]
            print(f" {i} * {private_bins[i]} = {i * private_bins[i]}  total_people:{total_people} total_age:{total_age}")
        print(f"Private people: {private_num} Total age: {total_age} Average age: {private_average_age}")
        print("")
    return {'private_num':private_num,'private_average_age':private_average_age}

def run_histogram_experiment(dp_mechanism, epsilon,n,age,trials, verbose=False):
    results        = [dp_mechanism(epsilon,n,age, verbose=verbose) for i in range(trials)]
    private_num    = [result['private_num'] for result in results]
    private_average_ages = [result['private_average_age'] for result in results]
    print_experiment_stats(epsilon, n, age, private_num, private_average_ages)
    return {'epsilon':epsilon,
            'n':n,
            'age':age,
            'trials':trials,
            'private_num':private_num,
            'private_avgage-.95'   : get_range(.95, private_average_ages),
            'private_num-.95'   : get_range(.95, private_num),
            'private_avgage-.25'   : get_range(.25, private_average_ages),
            'private_num-.25'   : get_range(.25, private_num)}

TRIALS=10000
VERBOSE=False
# https://matplotlib.org/gallery/api/agg_oo_sgskip.html
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from matplotlib.figure import Figure
def demo():
    for n in [1,2,3,4,5]:
        labels = []
        ages25 = []
        ages75 = []
        age = 22
        #for n in [1, 10, 100, 1000, 10000]:
        # for n in range(2,30,2):
        for epsilon in range(1,20):
            obj = run_histogram_experiment(dp_age_histogram, epsilon, n, age, trials=TRIALS, verbose=VERBOSE)
            #obj = run_histogram_experiment(naive_stats, epsilon, n, age, trials=TRIALS, verbose=VERBOSE)
            # labels.append(str(n))
            labels.append(str(epsilon))
            p25 = obj['private_avgage-.25'][0]
            p75 = obj['private_avgage-.25'][1]
            ages25.append(p25)
            ages75.append(p75)
            print(f"n:{n}    1q: {p25:.02f}   3q: {p75:02f}")

        ages25 = np.array(ages25)
        ages75 = np.array(ages75)

        print("ages25:",ages25)
        print("ages75:",ages75)

        fig = Figure()
        FigureCanvas(fig)
        ax = fig.add_subplot(111)
        ymin = min(ages25.min()-5, 0)
        ymax = max(ages75.max()+5, 30)
        ax.bar(x=labels,bottom=ages25, height=ages75-ages25, linewidth=1, edgecolor='green', color='green', alpha=0.5)
        ax.set_ylim(bottom=ymin, top=ymax)
        ax.axhline( y = age, linewidth=1, color='red')
        ax.set_title(f"age range: 25th to 75th percentile ({TRIALS:,} trials; n={n})")
        ax.set_ylabel("average age")
        ax.set_xlabel("ϵ")
        fig.savefig(f"demo_n={n}.pdf")
        fig.savefig(f"demo_n={n}.png")

if __name__=="__main__":
    demo()
