import numpy as np
import matplotlib.pyplot as plt

#fig, ax = plt.subplots(1, 1)

x = np.linspace(0,10,1000)
plt.plot(x, 1-(1/x)**.05, 'r-', lw=5, label='privacy-loss vs. accuracy')
plt.xlabel("Privacy Loss",fontsize=24)
plt.ylabel("Accuracy",fontsize=24)
plt.tick_params(axis='x',
                which='both',
                bottom=False,
                top=False,
                labelbottom=False)

plt.tick_params(axis='y',
                which='both',
                left=False,
                right=False,
                labelleft=False)

#ax.plot(x, 1-(1/x)**.02, 'b-', lw=5, label='privacy-loss vs. accuracy')
#ax.plot(x, 1-(1/x)**.09, 'g-', lw=5, label='privacy-loss vs. accuracy')

#ax.hist(r, normed=True, histtype='stepfilled', alpha=0.2)
#ax.legend(loc='best', frameon=False)

#plt.show()
plt.savefig("plot.pdf",transparent=True)

