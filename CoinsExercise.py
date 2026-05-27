from itertools import combinations
import math
import numpy as np
import random

def entropy(distribution):
    return -sum(p * math.log2(p) for p in distribution if p != 0)

# Creates all possible weighing options
def create_weighing_options(n):
    coins = range(n)
    weighing_options = []
    for k in range(1, n//2 + 1):
        for left in combinations(coins, k):
            remaining_coins = [c for c in coins if c not in left]
            for right in combinations(remaining_coins, k):
                neither = [c for c in remaining_coins if c not in right]
                weighing_options.append({"left": left, "right": right, "neither": tuple(neither)})
    return weighing_options

# Updates prior and returns posterior and p_outcome
def update_prior(prior, weighing, outcome):
    coins_in_outcome = weighing[outcome]
    posterior = [0]*len(prior)
    p_outcome = sum(prior[i] for i in coins_in_outcome)
    if p_outcome != 0:
        for coin in range(n):
            if coin in coins_in_outcome:
                posterior[coin] = prior[coin]/p_outcome
    return posterior, p_outcome

# Choosing weighing with highest KL divergence
def choose_optimal_weighing(prior, weighing_options):
    n = len(prior)
    expected_information_gains = []
    for weighing in weighing_options:
        expected_information_gain = 0
        for outcome in ["left", "right", "neither"]:
            posterior, p_outcome = update_prior(prior, weighing, outcome)
            kl_divergence = 0
            for coin in range(n):
                if posterior[coin] != 0:
                    kl_divergence += posterior[coin] * math.log2(posterior[coin]/prior[coin])
            expected_information_gain += p_outcome*kl_divergence
        expected_information_gains.append(expected_information_gain)
    optimal_weighing = weighing_options[np.argmax(expected_information_gains)]
    return optimal_weighing

# Determines outcome
def get_outcome(weighing, counterfeit):
    for outcome, coins_in_outcome in weighing.items():
        if counterfeit in coins_in_outcome:
            return outcome

# Checks when we've determined coin
def done(distribution, tol=1e-6):
    return entropy(distribution) < tol
    

# Variables at the beginning
n = 13
prior = [1/n]*n
counterfeit = random.randint(0, n-1)
weighing_options = create_weighing_options(n)

# Keeps finding weighings
distribution = prior
while not done(distribution):
    print("Our current hypothesis is", distribution)
    optimal_weighing = choose_optimal_weighing(distribution, weighing_options)
    print("Our optimal weighing is", optimal_weighing)
    outcome = get_outcome(optimal_weighing, counterfeit)
    print("The outcome is", outcome)
    distribution, _ = update_prior(distribution, optimal_weighing, outcome)
    print("Our new hypothesis is", distribution)
    print("___________")
print("The found counterfeit coin is", np.argmax(distribution))
print("The actual counterfeit coin is", counterfeit)