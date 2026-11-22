# Eval report

Output of `npm run eval` (regenerate with `EVAL_WRITE_REPORT=1 npm run eval`). Deterministic and offline: no network, no model calls.

**Eval pass rate: 52/52 (100%)**

| Category | Passed | Total |
|---|---|---|
| guard: numbers | 12 | 12 |
| guard: claims | 10 | 10 |
| guard: Hindi | 6 | 6 |
| vision validation | 12 | 12 |
| shared links | 6 | 6 |
| offline answers | 6 | 6 |

## Cases

| Id | Category | What must be true | Result |
|---|---|---|---|
| num-01 | guard: numbers | accepted | pass |
| num-02 | guard: numbers | accepted | pass |
| num-03 | guard: numbers | accepted | pass |
| num-04 | guard: numbers | accepted | pass |
| num-05 | guard: numbers | accepted | pass |
| num-06 | guard: numbers | accepted | pass |
| num-07 | guard: numbers | accepted | pass |
| num-08 | guard: numbers | rejected | pass |
| num-09 | guard: numbers | rejected | pass |
| num-10 | guard: numbers | rejected | pass |
| num-11 | guard: numbers | rejected | pass |
| num-12 | guard: numbers | rejected | pass |
| clm-01 | guard: claims | rejected | pass |
| clm-02 | guard: claims | rejected | pass |
| clm-03 | guard: claims | rejected | pass |
| clm-04 | guard: claims | rejected | pass |
| clm-05 | guard: claims | rejected | pass |
| clm-06 | guard: claims | rejected | pass |
| clm-07 | guard: claims | rejected | pass |
| clm-08 | guard: claims | rejected | pass |
| clm-09 | guard: claims | accepted | pass |
| clm-10 | guard: claims | accepted | pass |
| hin-01 | guard: Hindi | accepted | pass |
| hin-02 | guard: Hindi | accepted | pass |
| hin-03 | guard: Hindi | rejected | pass |
| hin-04 | guard: Hindi | rejected | pass |
| hin-05 | guard: Hindi | rejected | pass |
| hin-06 | guard: Hindi | accepted | pass |
| vis-01 | vision validation | status ok with window_gap | pass |
| vis-02 | vision validation | status ok with gas_stove, purifier_seen | pass |
| vis-03 | vision validation | status none | pass |
| vis-04 | vision validation | status not_room | pass |
| vis-05 | vision validation | status none | pass |
| vis-06 | vision validation | status unreadable | pass |
| vis-07 | vision validation | status none | pass |
| vis-08 | vision validation | status ok with window_gap | pass |
| vis-09 | vision validation | status none | pass |
| vis-10 | vision validation | status none | pass |
| vis-11 | vision validation | status ok with gas_stove | pass |
| vis-12 | vision validation | status none | pass |
| lnk-01 | shared links | valid choices decode | pass |
| lnk-02 | shared links | unknown city and values are dropped | pass |
| lnk-03 | shared links | numbers smuggled into a link are ignored | pass |
| lnk-04 | shared links | distance is clamped | pass |
| lnk-05 | shared links | unknown plan ids are dropped | pass |
| lnk-06 | shared links | markup in a value is dropped | pass |
| off-01 | offline answers | mask question mentions N95 | pass |
| off-02 | offline answers | window question names the best hour | pass |
| off-03 | offline answers | Hindi mask answer is Devanagari | pass |
| off-04 | offline answers | general answer is grounded in the engine's facts | pass |
| off-05 | offline answers | Hindi general answer is grounded | pass |
| off-06 | offline answers | no offline answer makes an unsupported attribution | pass |
