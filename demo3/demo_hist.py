import numpy as np
import matplotlib as mp
import matplotlib.pylab as pylab
import matplotlib.pyplot as plot
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
    for frac in [.95, .99]:
        (v1,v2) = get_range(frac, vals)
        print(f"{desc} {frac*100}%: {v1:.02f} → {v2:.02f}  "
              f"(median: {(v2+v1)/2:.02f} range: {v2-v1:.02f})")

def print_experiment_stats(epsilon,n,avg,counts,ages):
    print(f"Epsilon: {epsilon}")
    print(f"Num people: {n} all of age: {avg}")
    print_stats("count of people:", counts)
    print_stats("average ages", ages)
    print("")

    
def naive_stats(epsilon, n, age):
    # Differentially private count and average where people all have the same value
    n_sensitivity = 1 
    n_noise    = np.random.laplace(scale=([n_sensitivity/(epsilon*.5)]))
    private_n = n + n_noise
    age_sensitivity = 110 
    age_noise = np.random.laplace(scale=([age_sensitivity/(epsilon*.5)]))
    private_sum_ages = (age*n) + age_noise
    private_average_age = private_sum_ages / private_n
    return {'num_private':private_n,'average_age':average_age}

    
def dp_age_histogram(epsilon, npeople, age, verbose=False):
    # Given a value of epsilon, and a count of people all the same age
    # create a histogram and then calc average age and the like
    NUM_AGES = MAX_AGE+1
    bins      = np.zeros(NUM_AGES)
    bins[age] = npeople
    noises    = np.random.laplace(scale= np.resize( 1.0/epsilon, NUM_AGES ))
    private_bins = bins + noises
    num_private  = private_bins.sum()
    total_age    = (private_bins * np.arange(NUM_AGES)).sum()
    average_age  = total_age / num_private
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
        print(f"Private people: {num_private} Total age: {total_age} Average age: {average_age}")
        print("")
    return {'num_private':num_private,'average_age':average_age}

def run_histogram_experiment(epsilon,n,age,trials, verbose=False):
    results        = [dp_age_histogram(epsilon,n,age, verbose=verbose) for i in range(trials)]
    private_counts = [result['num_private'] for result in results]
    private_average_ages = [result['average_age'] for result in results]
    print_experiment_stats(epsilon, n, age, private_counts, private_average_ages)
    return {'epsilon':epsilon,
            'n':n,
            'age':age,
            'trials':trials,
            'private_avgage-.95'   : get_range(.95, private_average_ages),
            'private_counts-.95'   : get_range(.95, private_counts),
            'private_avgage-.25'   : get_range(.25, private_average_ages),
            'private_counts-.25'   : get_range(.25, private_counts)}

TRIALS=100000
VERBOSE=False
EPSILON=100
def demo():
    labels   = []
    ages25 = []
    ages75 = []
    age = 22
    #for n in [1, 10, 100, 1000, 10000]:
    for n in [10]:
        obj = run_histogram_experiment(EPSILON, n, age, trials=TRIALS, verbose=VERBOSE)
        labels.append(str(n))
        ages25.append(obj['private_avgage-.25'][0])
        ages75.append(obj['private_avgage-.25'][1])

    ax = plot.subplot(111)
    ax.bar(x=labels,bottom=ages25, height=ages75, color='green', alpha=0.5)
    ax.set_ylim(bottom=-10,top=100)


if __name__=="__main__":
    demo()
