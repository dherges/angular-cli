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
| `--deep=<n>`                              | Tree depth (for `layout=deep`)        | `2`      |
| `--iterations=<n>`                        | Measured iterations per size          | `2`      |
| `--json`                                  | Output raw measurements as JSON       | N/A      |

### Example

Sweep the external-style variant using the flat layout with 500 entry points:

```sh
pnpm admin benchmark library-builder --layout=flat --count=500 --style=external
```
