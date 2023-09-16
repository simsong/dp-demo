#include <cstdio>
#include <iostream>
int a,b,c,d,e,f,g,h,i,j;
int sum;

void all()
{
    std::cout << a << ' ' << b << ' ' << c << ' ' << d << ' ' << e << ' ' << f << ' ' << g << ' ' << h << ' ' << i << " " << j << " sum=" << sum << "\n";
}

int main(int argc,char **argv)
{
    int count = 0;
    a = 80;
    for(b=60;b<=105;b++){
        std::cout << "b="<< b<<"\n";
        for(c=b;c<=105;c++){
            //std::cout << "b="<< b << "c=" << c << "\n";
            for(d=c;d<=105;d++){
                for(e=d;e<=105;e++){
                    for(f=e;f<=105;f++){
                        for(g=f;g<=105;g++){
                            for(h=g;h<=105;h++){
                                for(i=h;i<105;i++){
                                    for(j=i;j<105;j++){
                                        sum = a+b+c+d+e+f+g+h+i+j;
                                        if (sum==980){
                                            all();
                                            count+=1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    std::cout << "cout=" << count << "\n";
    exit(0);
}
