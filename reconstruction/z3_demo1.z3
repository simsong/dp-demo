;;  Pythagorean theorem.
;; Find two numbers a and b such that a^2 + b^2 = c^2 and c = 5.
(declare-const a Int)
(declare-const b Int)
(declare-const c Int)
(assert (> a 0))
(assert (> b 0))
(assert (> c 0))
(assert (= c 5))
(assert (=
         (* c c)
         (+ (* a a) (* b b))))
(check-sat)
(get-model)
