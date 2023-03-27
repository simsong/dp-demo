#!/usr/bin/env python3

"""A variety of differential privacy mechanisms."""

import numpy

def laplace_mechanism(*, true_answer, budget, sensitivity, prng):
    shape = numpy.shape(true_answer)
    return true_answer + prng.laplace(scale=sensitivity/float(budget), size=shape)

def geometric_mechanism(*, true_answer, budget, sensitivity, prng):
    shape = numpy.shape(true_answer)
    epsilon = budget / float(sensitivity)
    p = 1 - numpy.exp(-epsilon)
    x = prng.geometric(p, size = shape)   - 1 # numpy geometrics start with 1
    y = prng.geometric(p, size = shape) - 1
    return x-y + true_answer

def expo_mechanism(*, scores, budget, sensitivity, prng):
    tmp = [x * budget/(2.0*sensitivity) for x in scores]
    noisy = tmp + prng.gumbel(scale=1.0, size=tmp.shape)
    return noisy.argmax()

def geo_mech_prob(low, high, epsilon):
    """ Probability that the geometric mechanism with budget epsilon added
noise between low and high inclusive """

    assert low <= high, "low must be less than high"
    int_high = numpy.floor(high)
    int_low = numpy.ceil(low) 
    normalizing_factor = (1.0 - numpy.exp(-epsilon))/(1.0 + numpy.exp(-epsilon))
    prob = 1.0
    if int_high >= 0:
        prob = prob - numpy.exp(-epsilon * (int_high+1))/(1.0-numpy.exp(-epsilon))*normalizing_factor
    else:
        prob = prob - (1.0 - numpy.exp(-epsilon * abs(int_high))/(1.0-numpy.exp(-epsilon))*normalizing_factor)
    if int_low >= 0:
        prob = prob - (1.0 - numpy.exp(-epsilon * int_low)/(1.0-numpy.exp(-epsilon))*normalizing_factor)
    else:
        prob = prob - numpy.exp(-epsilon * (abs(int_low)+1))/(1.0-numpy.exp(-epsilon))*normalizing_factor
    return pro
