POSSIBLE_AGES=1024
POSSIBLE_RACES=59049

def over18(i,person):
    return 1 if (i & 1<<person)!=0 else 0

def race(i,person):
    return ((i // (3**person)) % 3)

def correct_count_over_18(i):
    return sum( [over18(i, person) for person in range(10)] ) == 6

def correct_count_of_races(i):
    races = [race(i,person) for person in range(10)]
    return races.count(0)==4 and races.count(1)==4 and races.count(2)==2
    
correct_ages = []
for age in range(0,POSSIBLE_AGES):
    if correct_count_over_18(age):
        correct_ages.append(age)
print("Total of correct age combinations:",len(correct_ages))
      
correct_races = []
for r in range(0,POSSIBLE_RACES):
    if correct_count_of_races(r):
        correct_races.append(r)
print("total of correct race combinations:",len(correct_races))

      
