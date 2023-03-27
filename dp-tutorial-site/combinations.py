import statistics

count = 0
for a in range(1,120):
    for b in range(a,120):
        for c in range(b,120):
            v = [a,b,c]
            if statistics.median(v)==31 and statistics.mean(v)==42:
                print(v)
                count += 1
                    
print("combinations: ",count)
