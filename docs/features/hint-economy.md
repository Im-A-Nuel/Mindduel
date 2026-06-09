# Free Hints

Hints in MindDuel are **completely free**. There is no hint store, no prices, and nothing is paid or split. You simply get a limited number of hints per match to help you through tough questions.

## The budget

Each player gets **3 free hints per match** (`FREE_HINTS_PER_MATCH`). Spend them however you like across the available hint types — once you have used all three, you are on your own for the rest of the match.

## The hints

| Hint | Effect |
|---|---|
| **Eliminate 2** | Two wrong answer indices are removed in the UI, leaving a 50/50 |
| **Category** | The question's category is revealed |
| **Extra Time** | Adds 8 seconds to the answer timer |
| **First Letter** | The first letter of the correct answer is revealed |
| **Skip** | Treats the current question as a skip; the turn passes without placing a piece |

## How they work

Hints are resolved server-side through the trivia session (for example, `GET /api/trivia/peek` returns the partial reveal for `eliminate2` or `first-letter`). The backend tracks how many of your 3 free hints you have used in the current match and refuses any beyond the limit.

Because hints are free and capped, they are a tactical aid, not a pay-to-win lever — every player gets the same 3, regardless of wallet.

## When to use them

Some patterns:

- **Eliminate 2 on a hard question.** Turns a guess into a coin flip.
- **First Letter on a fact-recall question.** Often enough to jog memory.
- **Extra Time in Blitz.** Buys breathing room when the 5-second window is brutal.
- **Skip when you genuinely have no idea.** Better than committing a wrong answer and handing the turn over anyway.

Use your three wisely — there is no way to get more in the same match.
