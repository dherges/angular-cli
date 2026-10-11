# Library Builds Scaling Benchmark

This benchmark measures cold build times for Angular libraries.

## Why / Context

We are in the process of transitioning from `ng-packagr` to Angular CLI's native library builder. This benchmark suite is designed to quantify performance differences and ensure scalability.

### Goals

- Measure the new library builder against itself: How does it scale with the number of entry points?
- Enable A/B benchmarks of the `ng-packagr` builder against the new library builder.

### Previous Benchmarks

For context, when running the benchmarks directly against `ng-packagr`, it hinted at a "U-curve" in build times, where build time per entry point in `ng-packagr` drops until the 200th/300th/500th entry point (initial overhead for small number of entry points as a possible explanation). However, we discovered that `ng-packagr` build time per entry point increases as the number of entry points scale past a certain N (in the test runs N=200+).

In short: we are running explorative research here... :)

## Benchmark Design

This suite supports two primary layouts to test different filesystem and entry-point scaling scenarios:

- **Flat (`--layout=flat`)**: Generates $N$ secondary entry points as direct siblings.
  - Parameter: `--count=N`
  - Design: Each entry point is named `comp-i` (e.g., `comp-0001`, `comp-0002`).

- **Deep (`--layout=deep`)**: Generates $2^N$ secondary entry points in a binary tree structure.
  - Parameter: `--deep=N` (where $N$ is the depth of the tree).
  - Design: Creates a nested directory structure (`sub-a`/`sub-b` at each level).

Each entry point consists of:

- `public-api.ts`
- A component file with three selectable style variants:
  - `inline`: Inline template.
  - `inline-scss`: Inline template with styles.
  - `external`: External template and stylesheet files.

## Running the Benchmarks

```sh
# Ensure the builder is built first
pnpm build

# Run the benchmark
pnpm admin benchmark library-builder [options]
```

### Options

| Option                                    | Description                           | Default  |
| :---------------------------------------- | :------------------------------------ | :------- |
| `--layout=<flat\|deep>`                   | Fixture layout                        | `flat`   |
| `--style=<inline\|inline-scss\|external>` | Component style variant               | `inline` |
| `--count=<n>`                             | Entry-point count (for `layout=flat`) | `10`     |
| `--depth=<n>`                             | Tree depth (for `layout=deep`)        | `2`      |
| `--iterations=<n>`                        | Measured iterations per size          | `2`      |
| `--json`                                  | Output raw measurements as JSON       | N/A      |

### Example

Sweep the external-style variant using the flat layout with 500 entry points:

```sh
pnpm admin benchmark library-builder --layout=flat --count=500 --style=external
```

---

NOTES taking:

- scaling benchmark ... count for flat, depth for deep
- run all counts measure results, rount all depths measure results
- library "taste" is one of:
  - flat <n>
  - deep <n>
  - flat <n> with dependencies / out of scope
  - deep <n> with dependencies / out of scope
  - flat-n-dependencies-shared-scss / out scope
  - deep-n-dependencies-shared-scss / out of scope
  - flat-n-shared-scss / out of scope
  - deep-n-shared-scss / out of scope
- component "flavour" is the combos of:
  - inline
  - inline-css
  - inline-scss
  - external
  - external-css
  - external-scss

==> measurements always run along n... in flat n=200 is component, in deep n=200 it coud be 2^8 depths, cutting off after 200 (so the depths is erived from `2^depth >= n`)
==> sweep rounds need to be like 10, 20, 50, 100, 200, 300, 400, 500, 1000, 2000 --> an array of n

running the benchmarks iterations i=1..3 is like build this library 3 times, measure all 3 rounds
sweep=[n, ..., n] is the number of rounds n

we could say:
the pnpm admin benchmark only takes the scenario and sweeps parameters
-> it will always generate the 6 different "component" tastes as shown below
-> this is a rather mechnical multiplication of the theoretical combinations (out-scoping the interesting dependencies between entry points, and out-scoping the shared stylesheets token)
-> it should take also an argment for the builder to test: `'library'|'ng-packagr'`

1st iteration:

- flat and deep with <n>
- only inline (html template only)

2nd iteration:

- flat and deep with <n>
- inline-css (pure css only, bursting the cache)

3rd iteration:

- flat and deep with <n>
- inline-scss (scss only, bursting the cache)

4th iteration:

- flat and deep with <n>
- external (external html template file)

5th iteration:

- flat and deep with <n>
- external-css (pure css file, bursting the cache)

6th iteration:

- flat and deep with <n>
- external-scss (scss file, bursting the cache)

## Future Work

- Dependencies between entry points
- Shared stylesheet tokens imported by multiple component
- Watch mode
