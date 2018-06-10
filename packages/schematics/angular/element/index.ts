/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Rule,
  SchematicsException,
  Tree,
  branchAndMerge,
  chain
} from '@angular-devkit/schematics';
import createComponent, { buildSelector } from '../component';
import { Schema as CreateComponentSchema } from '../component/schema';
import createModule from '../module';
import { getWorkspace } from '../utility/config';
import { findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath } from '../utility/project';
import { validateHtmlSelector, validateName } from '../utility/validation';
import { Schema as ElementOptions } from './schema';

export default function(options: ElementOptions): Rule {
  return (host: Tree) => {
    const workspace = getWorkspace(host);
    if (!options.project) {
      throw new SchematicsException('Option (project) is required.');
    }
    const project = workspace.projects[options.project];

    if (options.path === undefined) {
      options.path = buildDefaultPath(project);
    }

    options.module = findModuleFromOptions(host, options);

    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;

    options.selector = options.selector || buildSelector(options, project.prefix);
    validateName(options.name);
    validateHtmlSelector(options.selector);

    // create module if neccessary
    const createModuleIfNeccessary = (): Rule =>
      (tree) => {
        if (options.module !== undefined) {
          return tree;
        }

        return createModule({
          name: options.name,
          path: options.path,
          project: options.project
        });
      };

    // options for component schematic
    const createComponentOptions: CreateComponentSchema = {
      ...options,
      entryComponent: true
    };

    // TODO: add element to bootstrap code
    const addBootstrapCode = (options: ElementOptions): Rule =>
      (tree, context) => {
        // TODO...

        return tree;
      };

    return chain([
      branchAndMerge(chain([
        createModuleIfNeccessary(),
        createComponent(createComponentOptions),
        addBootstrapCode(options)
      ])),
    ]);
  };
}
