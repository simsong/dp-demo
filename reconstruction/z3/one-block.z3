;; -*- mode: lisp; -*-
;; Define variables and their domains
;; Households (either 1 or 2)
;;
;; HOUSEHOLD  SEX   AGE  RACE  MARITAL   RELATION
;;
;;     1      S=M   A=18 R=W   M=SA        #1        
;;     1      S=F   A=24 R=W   M=SA        SPO       

;;     2      S=M   A=30 R=W   M=MA        #1        
;;     2      S=F   A=36 R=B   M=MA        SPO       
;;     2      S=M   A=84 R=B   M=MA        PAR       
;;     2      S=F   A=8  R=B   M=SC        CHI       
;;     2      S=F   A=66 R=B   M=MA        PAR       

;; But we will report this sorted by age:

;; Problem setup 
#define USE_2A
#define USE_2B
#define USE_2C
#define USE_2D
#define USE_3A
#define USE_3B
#define USE_4A        
;#define USE_SOLUTION   // for debugging

;; Sexes (0:female  1:male)
#define CONST(NAME,VALUE) (declare-const NAME Int) (assert (= NAME VALUE))

CONST(FEMALE, 0)
CONST(MALE, 1)

#define MAKE_SEX(S) (declare-const S Int) (assert (or (= S MALE) (= S FEMALE)))
MAKE_SEX(S1)
MAKE_SEX(S2)
MAKE_SEX(S3)
MAKE_SEX(S4)
MAKE_SEX(S5)
MAKE_SEX(S6)
MAKE_SEX(S7)

;; Ages (between 0 and 115 years old)
#define MAKE_INT(NAME,MIN,MAX) (declare-const NAME Int) (assert (and (>= NAME MIN) (<= NAME MAX)))
#define MIN_AGE 1
#define MAX_AGE 115
#define MAKE_AGE(A) MAKE_INT(A,MIN_AGE,MAX_AGE)

MAKE_AGE(A1)
MAKE_AGE(A2)
MAKE_AGE(A3)
MAKE_AGE(A4)
MAKE_AGE(A5)
MAKE_AGE(A6)
MAKE_AGE(A7)

;; Races (0:black  1:white)
CONST(BLACK, 0)
CONST(WHITE, 1)
#define MAKE_RACE(R) (declare-const R Int) (assert (or (= R WHITE) (= R BLACK)))

MAKE_RACE(R1)
MAKE_RACE(R2)
MAKE_RACE(R3)
MAKE_RACE(R4)
MAKE_RACE(R5)
MAKE_RACE(R6)
MAKE_RACE(R7)


;; Marital Status (0:single  1:married)
CONST(SINGLE, 0)
CONST(MARRIED, 1)
#define MAKE_MS(M) (declare-const M Int) (assert (or (= M SINGLE) (= M MARRIED)))

MAKE_MS(M1)
MAKE_MS(M2)
MAKE_MS(M3)
MAKE_MS(M4)
MAKE_MS(M5)
MAKE_MS(M6)
MAKE_MS(M7)

;; Married people must be over 14
(assert (< (if (= M1 MARRIED) 14 0) A1))
(assert (< (if (= M2 MARRIED) 14 0) A2))
(assert (< (if (= M3 MARRIED) 14 0) A3))
(assert (< (if (= M4 MARRIED) 14 0) A4))
(assert (< (if (= M5 MARRIED) 14 0) A5))
(assert (< (if (= M6 MARRIED) 14 0) A6))
(assert (< (if (= M7 MARRIED) 14 0) A7))


;; Assure that the output is sorted by age. This does a good job 
;; eliminating dupliate answers that simply have swapped records.
;; This is called "breaking symmetry" in the literature. 
(assert (<= A1 A2))
(assert (<= A2 A3))
(assert (<= A3 A4))
(assert (<= A4 A5))
(assert (<= A6 A7))

;; Reported tables

;; Statistic 1A: Total Pop: 7, median=30, mean=38

;; Median age 30
;; The ages are sorted, so A4 must be 30.
(assert
 (= A4 30))

; mean age: 38
(assert
 (= (+ A1 A2 A3 A4 A5 A6 A7)
   (* 7 38)))

;; Statistic 2A: Female:  n=4, median=30, mean=33.5
#ifdef USE_2A
(assert
 (= (+ S1 S2 S3 S4 S5 S6 S7) 3))  ;; 4 female (0=female, 1=male)

;; Median age of female is 30
;;
;; To solve this, we create some temporary variables:
;; FEMALEID1 FEMALEID2 FEMALEID3 FEMALEID4
;;                 - the ID number of each female, in order of ages
;; FEMALE_AGE1 FEMALE_AGE2 FEMALE_AGE3 FEMALE_AGE4 
;;                 - the age of each female, in order of ages 
;;
;; So we kow that the average of FEMALE_AGE2 and FEMALEA3 is 30
;;
;; This is a generic pattern that will be repeated for any cell size of 4

;; this could be redone to use an array of ages

MAKE_INT(FEMALE_ID1,1,4)                     ; must leave room for 5, 6 and 7 to be female
MAKE_INT(FEMALE_ID2,2,5)                     ; must leave room for 1, 6 and 7 to be female
MAKE_INT(FEMALE_ID3,3,6)                     ; must leave room for 1, 2 and 7 to be female
MAKE_INT(FEMALE_ID4,4,7)                     ; must leave room for 1, 2 and 3 to be female

(assert (< FEMALE_ID1 FEMALE_ID2))
(assert (< FEMALE_ID2 FEMALE_ID3))
(assert (< FEMALE_ID3 FEMALE_ID4))

;; Pigeon hole principle. If the IDs are in order, we only need to assure
;; that each ID maps to a female. We add the final equal and a -1 to force 
;; an error if there are not enough females.

(assert
(= FEMALE_ID1
   (if (= S1 FEMALE) 1
     (if (= S2 FEMALE) 2
       (if (= S3 FEMALE) 3
         (if (= S4 FEMALE) 4
           -1))))))

(assert 
(= FEMALE_ID2
   (if (and (= S2 FEMALE) (< FEMALE_ID1 2)) 2
     (if (and (= S3 FEMALE) (< FEMALE_ID1 3)) 3
       (if (and (= S4 FEMALE) (< FEMALE_ID1 4)) 4
         (if (and (= S5 FEMALE) (< FEMALE_ID1 5)) 5
           -1))))))

(assert (= FEMALE_ID3
   (if (and (= S3 FEMALE) (< FEMALE_ID2 3)) 3
     (if (and (= S4 FEMALE) (< FEMALE_ID2 4)) 4
       (if (and (= S5 FEMALE) (< FEMALE_ID2 5)) 5
         (if (and (= S6 FEMALE) (< FEMALE_ID2 6)) 6
           (if (and (= S7 FEMALE) (< FEMALE_ID2 7)) 7
             -1)))))))

(assert 
(= FEMALE_ID4
   (if (and (= S4 FEMALE) (< FEMALE_ID3 4)) 4
     (if (and (= S5 FEMALE) (< FEMALE_ID3 5)) 5
       (if (and (= S6 FEMALE) (< FEMALE_ID3 6)) 6
         (if (and (= S7 FEMALE) (< FEMALE_ID3 7)) 7
           -1))))))

;; Create temporary variables for the ages of these females
;; This uses the Sugar 
MAKE_INT(FEMALE_AGE1,MIN_AGE,MAX_AGE)
MAKE_INT(FEMALE_AGE2,MIN_AGE,MAX_AGE)
MAKE_INT(FEMALE_AGE3,MIN_AGE,MAX_AGE)
MAKE_INT(FEMALE_AGE4,MIN_AGE,MAX_AGE)

(assert (< FEMALE_AGE1 FEMALE_AGE2))
(assert (< FEMALE_AGE2 FEMALE_AGE3))
(assert (< FEMALE_AGE3 FEMALE_AGE4))

;; Fix the female ages to the person ages
(declare-const AGES (Array Int Int))
(assert (= (select AGES 1) A1))
(assert (= (select AGES 2) A2))
(assert (= (select AGES 3) A3))
(assert (= (select AGES 4) A4))
(assert (= (select AGES 5) A5))
(assert (= (select AGES 6) A6))
(assert (= (select AGES 7) A7))

(assert (= (select AGES FEMALE_ID1) FEMALE_AGE1))
(assert (= (select AGES FEMALE_ID2) FEMALE_AGE2))
(assert (= (select AGES FEMALE_ID3) FEMALE_AGE3))
(assert (= (select AGES FEMALE_ID4) FEMALE_AGE4))

;; The average of these is 30, so their sum is 60
(assert (= (+ FEMALE_AGE2 FEMALE_AGE3) 60))

;; end median calculation

;; average female age  = 33.5
(assert (= (+ FEMALE_AGE1 FEMALE_AGE2 FEMALE_AGE3 FEMALE_AGE4) 134)) ; 33.5 * 4)
#endif

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; 2B Male:  n=3, median=30, average=44
;; This is a generic pattern that will be repeated for any cell size of 3
;;

#ifdef USE_2B
;; there are three males
(assert
(= (+ (if (= S1 MALE) 1 0)  
      (if (= S2 MALE) 1 0)
      (if (= S3 MALE) 1 0)
      (if (= S4 MALE) 1 0)
      (if (= S5 MALE) 1 0)
      (if (= S6 MALE) 1 0)
      (if (= S7 MALE) 1 0)
      )
   3) 
)
;; constraints for median. There are only 3 men, so we know that Male #2 is 30
MAKE_INT(MALE_ID1,1,5)                     ; must leave room for 6 and 7 to be male
MAKE_INT(MALE_ID2,2,6)                     ; must leave room for 1 and 7 to be male
MAKE_INT(MALE_ID3,3,7)                     ; must leave room for 1 and 2 to be male

(assert (< MALE_ID1 MALE_ID2))
(assert (< MALE_ID2 MALE_ID3))

;; Pigeon hole principle. If the IDs are in order, we only need to assure
;; that each ID maps to a female. We add the final equal and a -1 to force 
;; an error if there are not enough females.
(assert
(= MALE_ID1
   (if (= S1 MALE) 1
     (if (= S2 MALE) 2
       (if (= S3 MALE) 3
         (if (= S4 MALE) 4
           (if (= S5 MALE) 5
             -1))))))
)

(assert
(= MALE_ID2
   (if (and (= S2 MALE) (< MALE_ID1 2)) 2
     (if (and (= S3 MALE) (< MALE_ID1 3)) 3
       (if (and (= S4 MALE) (< MALE_ID1 4)) 4
         (if (and (= S5 MALE) (< MALE_ID1 5)) 5
           (if (and (= S6 MALE) (< MALE_ID1 6)) 6
             -1))))))
)

(assert
(= MALE_ID3
   (if (and (= S3 MALE) (< MALE_ID2 3)) 3
     (if (and (= S4 MALE) (< MALE_ID2 4)) 4
       (if (and (= S5 MALE) (< MALE_ID2 5)) 5
         (if (and (= S6 MALE) (< MALE_ID2 6)) 6
           (if (and (= S7 MALE) (< MALE_ID2 7)) 7
             -1))))))
)

;; Create temporary variables for the ages of these males
MAKE_INT(MALE_AGE1,MIN_AGE,MAX_AGE)
MAKE_INT(MALE_AGE2,MIN_AGE,MAX_AGE)
MAKE_INT(MALE_AGE3,MIN_AGE,MAX_AGE)

;; make sure they are ordered
(assert (< MALE_AGE1 MALE_AGE2))
(assert (< MALE_AGE2 MALE_AGE3))

;; Fix the male ages to the person ages
(assert (= (select AGES MALE_ID1) MALE_AGE1))
(assert (= (select AGES MALE_ID2) MALE_AGE2))
(assert (= (select AGES MALE_ID3) MALE_AGE3))

;; The median is 30
(assert (= MALE_AGE2 30))

; average male age: 44
(assert (= (+ MALE_AGE1 MALE_AGE2 MALE_AGE3)    ; average male age = 44
   (* 3 44)))

#endif

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; 2C Black.  n=4  median=51  average=48.5
#ifdef USE_2C

;; 4 blacks
(assert (= (+ (if (= R1 BLACK) 1 0)  
      (if (= R2 BLACK) 1 0)
      (if (= R3 BLACK) 1 0)
      (if (= R4 BLACK) 1 0)
      (if (= R5 BLACK) 1 0)
      (if (= R6 BLACK) 1 0)
      (if (= R7 BLACK) 1 0)
      )
   4) )

;;; Median age of blacks is 51
MAKE_INT(BLACK_ID1,1,4)                     ; must leave room for 5, 6 and 7 to be female
MAKE_INT(BLACK_ID2,2,5)                     ; must leave room for 1, 6 and 7 to be female
MAKE_INT(BLACK_ID3,3,6)                     ; must leave room for 1, 2 and 7 to be female
MAKE_INT(BLACK_ID4,4,7)                     ; must leave room for 1, 2 and 3 to be female

(assert (< BLACK_ID1 BLACK_ID2))
(assert (< BLACK_ID2 BLACK_ID3))
(assert (< BLACK_ID3 BLACK_ID4))

;; Pigeon hole principle. If the IDs are in order, we only need to assure
;; that each ID maps to a female. We add the final equal and a -1 to force 
;; an error if there are not enough females.

(assert (= BLACK_ID1
   (if (= R1 BLACK) 1
     (if (= R2 BLACK) 2
       (if (= R3 BLACK) 3
         (if (= R4 BLACK) 4
           -1))))))

(assert (= BLACK_ID2
   (if (and (= R2 BLACK) (< BLACK_ID1 2)) 2
     (if (and (= R3 BLACK) (< BLACK_ID1 3)) 3
       (if (and (= R4 BLACK) (< BLACK_ID1 4)) 4
         (if (and (= R5 BLACK) (< BLACK_ID1 5)) 5
           -1))))))

(assert (= BLACK_ID3
   (if (and (= R3 BLACK) (< BLACK_ID2 3)) 3
     (if (and (= R4 BLACK) (< BLACK_ID2 4)) 4
       (if (and (= R5 BLACK) (< BLACK_ID2 5)) 5
         (if (and (= R6 BLACK) (< BLACK_ID2 6)) 6
           (if (and (= R7 BLACK) (< BLACK_ID2 7)) 7
             -1)))))))

(assert (= BLACK_ID4
   (if (and (= R4 BLACK) (< BLACK_ID3 4)) 4
     (if (and (= R5 BLACK) (< BLACK_ID3 5)) 5
       (if (and (= R6 BLACK) (< BLACK_ID3 6)) 6
         (if (and (= R7 BLACK) (< BLACK_ID3 7)) 7
           -1))))))

;; Create temporary variables for the black ages 
MAKE_INT(BLACK_AGE1,MIN_AGE,MAX_AGE)
MAKE_INT(BLACK_AGE2,MIN_AGE,MAX_AGE)
MAKE_INT(BLACK_AGE3,MIN_AGE,MAX_AGE)
MAKE_INT(BLACK_AGE4,MIN_AGE,MAX_AGE)

(assert (< BLACK_AGE1 BLACK_AGE2))
(assert (< BLACK_AGE2 BLACK_AGE3))
(assert (< BLACK_AGE3 BLACK_AGE4))

;; Fix the black ages to the person ages
(assert (= (select AGES BLACK_ID1) BLACK_AGE1))
(assert (= (select AGES BLACK_ID2) BLACK_AGE2))
(assert (= (select AGES BLACK_ID3) BLACK_AGE3))
(assert (= (select AGES BLACK_ID4) BLACK_AGE4))

;; The median black age is 51. 
;; The average of BLACK_AGE2 and BLACK_AGE3 is 51, so their sum is 51*2
(assert (= (+ BLACK_AGE2 BLACK_AGE3) (* 51 2)))


; average black age = 48.5 (x 4 = 194)
(assert (= (+ (if (= R1 BLACK) A1 0)   
      (if (= R2 BLACK) A2 0)
      (if (= R3 BLACK) A3 0)
      (if (= R4 BLACK) A4 0)
      (if (= R5 BLACK) A5 0)
      (if (= R6 BLACK) A6 0)
      (if (= R7 BLACK) A7 0)
      )
   194))
#endif

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;
;; 2D. White. n=3 median=24, mean=24  (white=1)
#ifdef USE_2D

;; n=3 whites
(assert (= (+ (if (= R1 WHITE) 1 0)
      (if (= R2 WHITE) 1 0)      
      (if (= R3 WHITE) 1 0)      
      (if (= R4 WHITE) 1 0)      
      (if (= R5 WHITE) 1 0)      
      (if (= R6 WHITE) 1 0)      
      (if (= R7 WHITE) 1 0)
      ) 3) )


;; constraints for median. There are only 3 men, so we know that Male #2 is 30
MAKE_INT(WHITE_ID1,1,5)                     ; must leave room for 6 and 7 to be male
MAKE_INT(WHITE_ID2,2,6)                     ; must leave room for 1 and 7 to be male
MAKE_INT(WHITE_ID3,3,7)                     ; must leave room for 1 and 2 to be male

(assert (< WHITE_ID1 WHITE_ID2))
(assert (< WHITE_ID2 WHITE_ID3))

;; Pigeon hole principle. If the IDs are in order, we only need to assure
;; that each ID maps to a female. We add the final equal and a -1 to force 
;; an error if there are not enough females.
(assert (= WHITE_ID1
   (if (= R1 WHITE) 1
     (if (= R2 WHITE) 2
       (if (= R3 WHITE) 3
         (if (= R4 WHITE) 4
           (if (= R5 WHITE) 5
             -1)))))))


(assert (= WHITE_ID2
   (if (and (= R2 WHITE) (< WHITE_ID1 2)) 2
     (if (and (= R3 WHITE) (< WHITE_ID1 3)) 3
       (if (and (= R4 WHITE) (< WHITE_ID1 4)) 4
         (if (and (= R5 WHITE) (< WHITE_ID1 5)) 5
           (if (and (= R6 WHITE) (< WHITE_ID1 6)) 6
             -1)))))))

(assert (= WHITE_ID3
   (if (and (= R3 WHITE) (< WHITE_ID2 3)) 3
     (if (and (= R4 WHITE) (< WHITE_ID2 4)) 4
       (if (and (= R5 WHITE) (< WHITE_ID2 5)) 5
         (if (and (= R6 WHITE) (< WHITE_ID2 6)) 6
           (if (and (= R7 WHITE) (< WHITE_ID2 7)) 7
             -1)))))))

;; Create temporary variables for the ages of these males
MAKE_INT(WHITE_AGE1,MIN_AGE,MAX_AGE)
MAKE_INT(WHITE_AGE2,MIN_AGE,MAX_AGE)
MAKE_INT(WHITE_AGE3,MIN_AGE,MAX_AGE)

;; make sure they are ordered
(assert (< WHITE_AGE1 WHITE_AGE2))
(assert (< WHITE_AGE2 WHITE_AGE3))

;; Fix the male ages to the person ages
(assert (= (select AGES WHITE_ID1) WHITE_AGE1))
(assert (= (select AGES WHITE_ID2) WHITE_AGE2))
(assert (= (select AGES WHITE_ID3) WHITE_AGE3))

;; The median white is 24
(assert (= WHITE_AGE2 24))

; average white age: 24
(assert (= (+ WHITE_AGE1 WHITE_AGE2 WHITE_AGE3)    ; average white age = 24
   (* 3 24)))
#endif

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; 3A. Single Adults.
;; NOTE: THIS STATISTIC IS SUPPRESSED...
;; ... so we know there are 0, 1 or 2 people in this class:
#ifdef USE_3A
MAKE_INT(SINGLE_ADULT_COUNT,0,2)
(assert (= (+ (if (and (= M1 SINGLE) (> A1 17)) 1 0)
      (if (and (= M2 SINGLE) (> A2 17)) 1 0)      
      (if (and (= M3 SINGLE) (> A3 17)) 1 0)      
      (if (and (= M4 SINGLE) (> A4 17)) 1 0)      
      (if (and (= M5 SINGLE) (> A5 17)) 1 0)      
      (if (and (= M6 SINGLE) (> A6 17)) 1 0)      
      (if (and (= M7 SINGLE) (> A7 17)) 1 0)
      )
   SINGLE_ADULT_COUNT
   ))

(assert (>= SINGLE_ADULT_COUNT 0))
(assert (<= SINGLE_ADULT_COUNT 2))
#endif

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; 3B. Married Adults
;;  n=4, median=51 mean=54

;; Count queries

#ifdef USE_3B
(assert (= (+ (if (= M1 MARRIED) 1 0)    ; average age of single adults = 
      (if (= M2 MARRIED) 1 0)
      (if (= M3 MARRIED) 1 0)
      (if (= M4 MARRIED) 1 0)
      (if (= M5 MARRIED) 1 0)
      (if (= M6 MARRIED) 1 0)
      (if (= M7 MARRIED) 1 0)
      )
   4))

;; Median age of married adults is = 51
;; There are 4, so there are 2 less than 51 and 2 more than 51

MAKE_INT(MARRIED_ADULT_ID1,1,4)                     ; must leave room for 5, 6 and 7 to be married adult
MAKE_INT(MARRIED_ADULT_ID2,2,5)                     ; must leave room for 1, 6 and 7 to be married adult
MAKE_INT(MARRIED_ADULT_ID3,3,6)                     ; must leave room for 1, 2 and 7 to be married adult
MAKE_INT(MARRIED_ADULT_ID4,4,7)                     ; must leave room for 1, 2 and 3 to be married adult

(assert (< MARRIED_ADULT_ID1 MARRIED_ADULT_ID2))
(assert (< MARRIED_ADULT_ID2 MARRIED_ADULT_ID3))
(assert (< MARRIED_ADULT_ID3 MARRIED_ADULT_ID4))

;; Pigeon hole principle. If the IDs are in order, we only need to assure
;; that each ID maps to a female. We add the final equal and a -1 to force 
;; an error if there are not enough females.

(assert
(= MARRIED_ADULT_ID1
   (if (= M1 MARRIED) 1
     (if (= M2 MARRIED) 2
       (if (= M3 MARRIED) 3
         (if (= M4 MARRIED) 4
           -1))))))

(assert 
(= MARRIED_ADULT_ID2
   (if (and (= M2 MARRIED) (< MARRIED_ADULT_ID1 2)) 2
     (if (and (= M3 MARRIED) (< MARRIED_ADULT_ID1 3)) 3
       (if (and (= M4 MARRIED) (< MARRIED_ADULT_ID1 4)) 4
         (if (and (= M5 MARRIED) (< MARRIED_ADULT_ID1 5)) 5
           -1))))))

(assert (= MARRIED_ADULT_ID3
   (if (and (= M3 MARRIED) (< MARRIED_ADULT_ID2 3)) 3
     (if (and (= M4 MARRIED) (< MARRIED_ADULT_ID2 4)) 4
       (if (and (= M5 MARRIED) (< MARRIED_ADULT_ID2 5)) 5
         (if (and (= M6 MARRIED) (< MARRIED_ADULT_ID2 6)) 6
           (if (and (= M7 MARRIED) (< MARRIED_ADULT_ID2 7)) 7
             -1)))))))

(assert (= MARRIED_ADULT_ID4
   (if (and (= M4 MARRIED) (< MARRIED_ADULT_ID3 4)) 4
     (if (and (= M5 MARRIED) (< MARRIED_ADULT_ID3 5)) 5
       (if (and (= M6 MARRIED) (< MARRIED_ADULT_ID3 6)) 6
         (if (and (= M7 MARRIED) (< MARRIED_ADULT_ID3 7)) 7
           -1))))))

;; Create temporary variables for the ages of these females
;; This uses the Sugar 
MAKE_INT(MARRIED_ADULT_AGE1,MIN_AGE,MAX_AGE)
MAKE_INT(MARRIED_ADULT_AGE2,MIN_AGE,MAX_AGE)
MAKE_INT(MARRIED_ADULT_AGE3,MIN_AGE,MAX_AGE)
MAKE_INT(MARRIED_ADULT_AGE4,MIN_AGE,MAX_AGE)

(assert (< MARRIED_ADULT_AGE1 MARRIED_ADULT_AGE2))
(assert (< MARRIED_ADULT_AGE2 MARRIED_ADULT_AGE3))
(assert (< MARRIED_ADULT_AGE3 MARRIED_ADULT_AGE4))

;; Fix the female ages to the person ages

(assert (= (select AGES MARRIED_ADULT_ID1) MARRIED_ADULT_AGE1))
(assert (= (select AGES MARRIED_ADULT_ID2) MARRIED_ADULT_AGE2))
(assert (= (select AGES MARRIED_ADULT_ID3) MARRIED_ADULT_AGE3))
(assert (= (select AGES MARRIED_ADULT_ID4) MARRIED_ADULT_AGE4))

;; The median age of the married adults is 51
;; so the average of these is 51, so their sum is 51*2
(assert (= (+ MARRIED_ADULT_AGE2 MARRIED_ADULT_AGE3) (* 51 2)))

;; end median calculation

;; mean married adult age  = 54
(assert (= (+ MARRIED_ADULT_AGE1 MARRIED_ADULT_AGE2 MARRIED_ADULT_AGE3 MARRIED_ADULT_AGE4)
   (* 4 54)))

#endif




;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;
;; 4A. Black Females
;; n=3, median=36, mean=36.7

#ifdef USE_4A
;;; Three black females (R=0, S=0)
;; there are three black females
(assert (= (+ (if (and (= R1 BLACK) (= S1 FEMALE)) 1 0)
      (if (and (= R2 BLACK) (= S2 FEMALE)) 1 0)   
      (if (and (= R3 BLACK) (= S3 FEMALE)) 1 0)   
      (if (and (= R4 BLACK) (= S4 FEMALE)) 1 0)   
      (if (and (= R5 BLACK) (= S5 FEMALE)) 1 0)   
      (if (and (= R6 BLACK) (= S6 FEMALE)) 1 0)
      (if (and (= R7 BLACK) (= S7 FEMALE)) 1 0)
      ) 3))

;; constraints for median. There are only 3 men, so we know that Male #2 is 30
MAKE_INT(BLACK_FEMALE_ID1,1,5)                     ; must leave room for 6 and 7 to be male
MAKE_INT(BLACK_FEMALE_ID2,2,6)                     ; must leave room for 1 and 7 to be male
MAKE_INT(BLACK_FEMALE_ID3,3,7)                     ; must leave room for 1 and 2 to be male

(assert (< BLACK_FEMALE_ID1 BLACK_FEMALE_ID2))
(assert (< BLACK_FEMALE_ID2 BLACK_FEMALE_ID3))

;; Pigeon hole principle. If the IDs are in order, we only need to assure
;; that each ID maps to a female. We add the final equal and a -1 to force 
;; an error if there are not enough females.
(assert (= BLACK_FEMALE_ID1
   (if (and (= R1 BLACK) (= S1 FEMALE)) 1
     (if (and (= R2 BLACK) (= S2 FEMALE)) 2
       (if (and (= R3 BLACK) (= S3 FEMALE)) 3
         (if (and (= R4 BLACK) (= S4 FEMALE)) 4
           (if (and (= R5 BLACK) (= S5 FEMALE)) 5
             -1)))))))


(assert (= BLACK_FEMALE_ID2
   (if (and (= R2 BLACK) (= S2 FEMALE) (< BLACK_FEMALE_ID1 2)) 2
     (if (and (= R3 BLACK) (= S3 FEMALE) (< BLACK_FEMALE_ID1 3)) 3
       (if (and (= R4 BLACK) (= S4 FEMALE) (< BLACK_FEMALE_ID1 4)) 4
         (if (and (= R5 BLACK) (= S5 FEMALE) (< BLACK_FEMALE_ID1 5)) 5
           (if (and (= R6 BLACK) (= S6 FEMALE) (< BLACK_FEMALE_ID1 6)) 6
             -1)))))))

(assert (= BLACK_FEMALE_ID3
   (if (and (= R3 BLACK) (= S3 FEMALE) (< BLACK_FEMALE_ID2 3)) 3
     (if (and (= R4 BLACK) (= S4 FEMALE) (< BLACK_FEMALE_ID2 4)) 4
       (if (and (= R5 BLACK) (= S5 FEMALE) (< BLACK_FEMALE_ID2 5)) 5
         (if (and (= R6 BLACK) (= S6 FEMALE) (< BLACK_FEMALE_ID2 6)) 6
           (if (and (= R7 BLACK) (= S7 FEMALE) (< BLACK_FEMALE_ID2 7)) 7
             -1)))))))

;; Create temporary variables for the ages of these males
MAKE_INT(BLACK_FEMALE_AGE1,MIN_AGE,MAX_AGE)
MAKE_INT(BLACK_FEMALE_AGE2,MIN_AGE,MAX_AGE)
MAKE_INT(BLACK_FEMALE_AGE3,MIN_AGE,MAX_AGE)

;; make sure they are ordered
(assert (< BLACK_FEMALE_AGE1 BLACK_FEMALE_AGE2))
(assert (< BLACK_FEMALE_AGE2 BLACK_FEMALE_AGE3))

;; Fix the male ages to the person ages
(assert (= (select AGES BLACK_FEMALE_ID1) BLACK_FEMALE_AGE1))
(assert (= (select AGES BLACK_FEMALE_ID2) BLACK_FEMALE_AGE2))
(assert (= (select AGES BLACK_FEMALE_ID3) BLACK_FEMALE_AGE3))

;; The median is 36
(assert (= BLACK_FEMALE_AGE2 36))

; media black female age: 36.7
(assert (= (+ BLACK_FEMALE_AGE1 BLACK_FEMALE_AGE2 BLACK_FEMALE_AGE3)    ; 
   110))
#endif

;; Statistic 1A. This is a sugar bug; we should not have to put it here.
;(= A4 30)

;; Solution. To verify constraints, uncomment these and everything should satisfy!
;; female=0        black=0   single=0
;; male  =1        white=1   married=1
;; Note that this is the sorted by age
#ifdef USE_SOLUTION
(assert (= S1 0)) (assert (= A1  8)) (assert (= R1 0)) (assert (= M1 0))
(assert (= S2 1)) (assert (= A2 18)) (assert (= R2 1)) (assert (= M2 0))
(assert (= S3 0)) (assert (= A3 24)) (assert (= R3 1)) (assert (= M3 0))
(assert (= S4 1)) (assert (= A4 30)) (assert (= R4 1)) (assert (= M4 1))
(assert (= S5 0)) (assert (= A5 36)) (assert (= R5 0)) (assert (= M5 1))
(assert (= S6 0)) (assert (= A6 66)) (assert (= R6 0)) (assert (= M6 1))
(assert (= S7 1)) (assert (= A7 84)) (assert (= R7 0)) (assert (= M7 1))
#endif


(check-sat)
(get-value (   S1 A1 R1 M1
               S2 A2 R2 M2
               S3 A3 R3 M3
               S4 A4 R4 M4
               S5 A5 R5 M5
               S6 A6 R6 M6
               S7 A7 R7 M7))
               
