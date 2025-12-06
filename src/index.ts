import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

import {
  CompleteOption,
  CompleteResult,
  ExtensionContext,
  sources,
  workspace
} from 'coc.nvim';

const execFileAsync = promisify(execFile);

export const activate = async (context: ExtensionContext): Promise<void> => {
  const config = workspace.getConfiguration('coc-zshell');
  const enabled = config.get<boolean>('enabled', true);

  if (!enabled) return;

  context.subscriptions.push(
    sources.createSource({ name: 'zsh', doComplete: getZshCompletions })
  );
};

const getZshCompletions = async (
  opt: CompleteOption
): Promise<CompleteResult> => {
  try {
    const scriptPath = join(__dirname, '../bin/capture.zsh');
    const line = opt.line;

    const { stdout } = await execFileAsync(scriptPath, [line], {
      timeout: 5000,
      maxBuffer: 1024 * 1024
    });

    const rawCompletions = stdout
      .trim()
      .split('\n')
      .filter(l => l.length > 0)
      .map(l => l.trim());

    const items = rawCompletions.map(parseCompletion);

    return { items, startcol: getStartColumn(opt) };
  } catch (error) {
    return { items: [] };
  }
};

const parseCompletion = (raw: string) => {
  const parts = raw.split(' -- ');
  const word = parts[0];
  const menu = parts.length === 2 ? parts[1] : undefined;

  return menu
    ? { word, menu, filterText: parts[0] }
    : { word, filterText: word };
};

const getStartColumn = (opt: CompleteOption): number | undefined => {
  const { col, line } = opt;

  if (col > 0 && line[col - 1] === '$') return col - 1;

  let startCol = col;
  while (startCol > 0) {
    const prevChar = line[startCol - 1];
    if (prevChar === ' ' || prevChar === '\t') break;
    startCol--;
  }

  if (startCol < col) return startCol;

  return undefined;
};
