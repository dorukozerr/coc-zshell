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
    const scriptPath = join(__dirname, '../zpty.zsh');
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

  if (parts.length === 2)
    return { word: parts[0], menu: parts[1], filterText: parts[0] };

  return { word: raw, filterText: raw };
};

const getStartColumn = (opt: CompleteOption): number | undefined => {
  const { col, line, input } = opt;

  if (col > 0 && line[col - 1] === '$') return col - 1;

  if (input.length > 0 && input[0] === '-') return col - input.length;

  return undefined;
};
