# clcs — Command-Line Calculator \[in java\]Script

[![License: WTFPL](https://img.shields.io/badge/License-WTFPL-9d9f24.svg)](http://www.wtfpl.net/about/)

clcs is a simple command line calculator with limited functionality.

## Syntax

clcs uses a modified version of Polish Notation (PN), sometimes called Zolish Notation (ZN).

Operators are followed by a number of operands (as opposed to PN where there is always two). This means, that nested expressions must be enclosed by parentheses, otherwise all of the remaining operands would be considered part of the inner expression. For example,

`+ 1 2 - 3 4 5 6`

is equivalent to 

`1 + 2 + (3 - 4 - 5 - 6)`

and

`+ 1 2 (- 3 4) 5 6`

is equivalent to

`1 + 2 + (3 - 4) + 5 + 6`.

As a limitation of clcs's implementation, nested parentheses are currently supported, hence your inner expressions cannot themselves have inner exceptions inside. For example

`+ 1 2 (- 3 (* 2 2)) 5 6`

is not a valid expression in clcs, but is would be valid in general ZN and would be the same as

`1 + 2 + (3 - (2 * 2)) + 5 + 6`.

While not part of ZN, operand-inferrance is recommended practice and part of the clcs implementation; if only one operand is provided, the result of the previous operation should be used as the expression's *first operand*. For example if we do the following calculations:

```
+ 1 2
- 4
+ 2
```

the result should be `1`. The first operand in the second and third operation is inferred to be `ans`, which is the conventional name of the previous result:

```
+ 1 2       (=>  3)
- ans 4     (=> -1)
+ ans 2     (=>  1)
```

## GUI

A legends for additional functions is available by pressing `Esc`. Most functions are available by pressing `Alt` and various keys.

## License

Copyright © 2025 ae-dschorsaanjo

This work is free. You can redistribute it and/or modify it under the
terms of the Do What The Fuck You Want To Public License, Version 2,
as published by Sam Hocevar. See the LICENSE file for more details.

The [ANAKRON](https://github.com/molarmanful/ANAKRON) font is licensed under the OFL-1.1 license.
