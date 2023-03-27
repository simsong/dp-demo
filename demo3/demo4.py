"""Simulation of the impact of differential privacy on a block that has
N people all the same age (22)."""

BLOCK_AGE=22
MAX_AGE=110
NUM_TRIALS=10000
TRIALS='trials'
PRIVATIZED_AVERAGE_AGE='privatized_average_age'
PRIVATIZED_AVERAGE_AGES='privatized_average_ages'
PRIVATIZED_COUNT='privatized_count'
PRIVATIZED_COUNTS='privatized_counts'
PRIVATIZED_MEDIAN_AGE='privatized_median_age'
PRIVATIZED_MEDIAN_AGES='privatized_median_ages'

EPSILON='ε'
NPEOPLE='npeople'
PERCENTILES=[5, 25, 50, 75, 95]
import numpy as np
import matplotlib.pyplot as plot

def privitize_block(epsilon, npeople):
    """Given a block of npeople all the same age, return the private value of
    (averageAge, count)
    """
    hist = np.resize(0,MAX_AGE)
    hist[BLOCK_AGE] = npeople
    private_hist = hist + np.random.laplace(loc=0,
                                            scale=np.resize(1/epsilon,MAX_AGE))
    private_count = private_hist.sum()
    private_average_age = (private_hist * np.arange(MAX_AGE)).sum() / private_count

    # Compute the median age by performing a linear interpolation
    # to 0.5 over the cumulative probability function
    # c.f. https://stackoverflow.com/questions/43992223/compute-median-for-numpy-histogram2d-data
    normalized_private_histogram = private_hist / private_hist.sum()
    private_median_age = np.interp(.5, np.cumsum(normalized_private_histogram), np.arange(MAX_AGE))

    return {PRIVATIZED_COUNT:private_count,
            PRIVATIZED_AVERAGE_AGE:private_average_age,
            PRIVATIZED_MEDIAN_AGE:private_median_age}

def run_experiment(epsilon, npeople, num_trials=NUM_TRIALS):
    """Repeatedly run the experiment and report back the average ages and average counts."""
    runs = [privitize_block(epsilon, npeople) for i in range(num_trials)]
    private_counts         = np.array([o[PRIVATIZED_COUNT] for o in runs])
    private_average_ages   = np.array([o[PRIVATIZED_AVERAGE_AGE] for o in runs])
    private_median_ages    = np.array([o[PRIVATIZED_MEDIAN_AGE] for o in runs])
    return {EPSILON:epsilon,
            NPEOPLE:npeople,
            TRIALS:NUM_TRIALS,
            PRIVATIZED_COUNTS:private_counts,
            PRIVATIZED_AVERAGE_AGES:private_average_ages,
            PRIVATIZED_MEDIAN_AGES:private_median_ages }

if __name__=="__main__":
    data = []
    labels = []
    for epsilon in [1]:
        for num_people in [1,10,100]:
            expdata = run_experiment(epsilon, npeople=num_people, num_trials=NUM_TRIALS)
            print(f"epsilon: {epsilon}   num_people: {num_people}")

            count_per = np.percentile(expdata[PRIVATIZED_COUNTS],[25,75,2.5,97.5])
            print(f"count 25%-75% percentiles: ", count_per[0],count_per[1])
            print(f"count 95% percentiles: ", count_per[2],count_per[3])

            median_per = np.percentile(expdata[PRIVATIZED_MEDIAN_AGES],[25,75,2.5,97.5])
            print(f"median 25%-75% percentiles: ", median_per[0],median_per[1])
            print(f"median 95% percentiles: ", median_per[2],median_per[3])

            average_per = np.percentile(expdata[PRIVATIZED_AVERAGE_AGES],[25,75,2.5,97.5])
            print(f"average 25%-75% percentiles: ", average_per[0],average_per[1])
            print(f"average 95% percentiles: ", average_per[2],average_per[3])


            print("")


"""
        labels.append(str(epsilon))
        expdata = run_experiment(epsilon, npeople=1, num_trials=NUM_TRIALS)
        data.append( expdata[PRIVATIZED_COUNTS])
        
    fig, ax = plot.subplots()
    fig.set_size_inches(8,6)
    #ax.set_title(f\"average age distribution vs. epsilon for {NUM_TRIALS} trials, n=1\")
    ax.set_title(f\"average count vs. epsilon for {len(data[0])} trials, n=1\")
    ax.boxplot(labels=labels, x=data);
    ax.set_ylim(-20,20)
    ax.set_ylabel(\"average count\")
    ax.set_xlabel(EPSILON)
    plot.show()"
"""
    




