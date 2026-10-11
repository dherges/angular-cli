/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// Benchmarks `@angular/build:library`'s cold build time across a sweep of library sizes.
//

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type FixtureOptions, type Layout, type Style, generateFixture } from './fixtures.mts';

export interface LibraryBuilderBenchmarkOptions {
  layout?: Layout;
  style?: Style;
  count?: number[];
  depth?: number[];
  iterations?: number;
  json?: boolean;
}

export interface BuildMeasurement {
  layout: Layout;
  style: Style;
  entryPoints: number;
  iteration: number;
  durationMs: number;
  status: 'ok' | 'fail';
}

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scratchRoot = path.join(repoRoot, 'dist', '.library-benchmark-fixtures');

function checkBuilderIsBuilt(
  logger: Console,
): { buildPkg: string; architectPkg: string; architectCli: string } | undefined {
  const buildPkg = path.join(repoRoot, 'dist', '@angular', 'build');
  const architectPkg = path.join(repoRoot, 'dist', '@angular-devkit', 'architect');
  const architectCli = path.join(architectPkg, 'bin', 'cli.js');

  if (!fs.existsSync(path.join(buildPkg, 'package.json')) || !fs.existsSync(architectCli)) {
    logger.error(
      'Error: @angular/build and/or @angular-devkit/architect have not been built yet.\n' +
        'Run "pnpm build" (or "pnpm admin build --local" for a faster local build) first.',
    );

    return undefined;
  }

  return { buildPkg, architectPkg, architectCli };
}

function buildOnce(
  projectDir: string,
  architectCli: string,
): { durationMs: number; status: 'ok' | 'fail' } {
  // XX... skipped for debugging
  return { durationMs: 0, status: 'fail' };

  /*
  const start = performance.now();
  // "@angular/build:library"
  // "@angular/build:ng-packagr"
  // "@angular-devkit/build-angular:ng-packagr"

  const result = spawnSync(process.execPath, [architectCli, 'lib:build'], {
    cwd: projectDir,
    stdio: 'pipe',
    maxBuffer: Infinity,
  });
  const durationMs = performance.now() - start;
  const status = result.status === 0 ? 'ok' : 'fail';
  if (status === 'fail') {
    if (result.error) {
      // eslint-disable-next-line no-console
      console.error(result.error);
    }
    // eslint-disable-next-line no-console
    console.error(result.stdout?.toString());
    // eslint-disable-next-line no-console
    console.error(result.stderr?.toString());
  }

  return { durationMs, status };
  */
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function runLibraryBuilderBenchmarks(
  options: LibraryBuilderBenchmarkOptions = {},
): Promise<{ measurements: BuildMeasurement[]; exitCode: number }> {
  const builder = checkBuilderIsBuilt(console);
  if (!builder) {
    return { measurements: [], exitCode: 1 };
  }
  // XX disabled for now as it is not working in the CI environment. The builder is already built at this point, so this should not be necessary.
  // ensureBuilderDepsLinkedAtRepoRoot(console, builder);

  const layout = options.layout ?? 'flat';
  const style = options.style ?? 'inline';
  const iterations = options.iterations ?? 3;
  const sizes =
    layout === 'flat'
      ? (options.count ?? [10, 50, 300, 1000, 2000])
      : (options.depth ?? [2, 5, 8, 11]);

  fs.mkdirSync(scratchRoot, { recursive: true });
  const measurements: BuildMeasurement[] = [];

  try {
    for (const sizeOrDepth of sizes) {
      const label =
        layout + '-' + style + '-' + (layout === 'deep' ? 'depth' + sizeOrDepth : sizeOrDepth);
      const projectDir = path.join(scratchRoot, label);

      const fixtureOptions: FixtureOptions =
        layout === 'flat'
          ? { layout, style, count: sizeOrDepth }
          : { layout, style, depth: sizeOrDepth };
      const entryPoints = generateFixture(projectDir, fixtureOptions);

      if (!options.json) {
        // eslint-disable-next-line no-console
        console.log('\n[library-builder] ' + label + ' (' + entryPoints + ' entry points)');
      }

      const durations: number[] = [];
      for (let i = 1; i <= iterations; i++) {
        const { durationMs, status } = buildOnce(projectDir, builder.architectCli);
        if (!options.json) {
          // eslint-disable-next-line no-console
          console.log(
            '  run ' +
              i +
              '/' +
              iterations +
              ': ' +
              (status === 'ok' ? 'done' : 'FAILED') +
              ' in ' +
              (durationMs / 1000).toFixed(2) +
              's',
          );
        }
        if (status === 'ok') {
          durations.push(durationMs);
        }
        measurements.push({ layout, style, entryPoints, iteration: i, durationMs, status });
      }

      if (!options.json && durations.length > 0) {
        const medianMs = median(durations);
        // eslint-disable-next-line no-console
        console.log(
          '  median: ' +
            (medianMs / 1000).toFixed(2) +
            's  (' +
            (medianMs / entryPoints).toFixed(2) +
            'ms/entry)',
        );
      }

      // XX disabled for fixture analysis
      // fs.rmSync(projectDir, { recursive: true, force: true });
    }
  } finally {
    // XX disabled for fixture analysis
    // fs.rmSync(scratchRoot, { recursive: true, force: true });
  }

  const anyFailed = measurements.some((m) => m.status === 'fail');
  if (options.json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(measurements, null, 2));
  }

  return { measurements, exitCode: anyFailed ? 1 : 0 };
}
