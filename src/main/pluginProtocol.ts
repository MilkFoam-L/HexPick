import { net, protocol } from 'electron';
import { pathToFileURL } from 'node:url';
import { PLUGIN_SCHEME } from '../shared/ipc';
import { resolvePluginFile } from './pluginPath';

/** 必须在 app ready 之前调用 */
export function registerPluginScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: PLUGIN_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

export function handlePluginScheme(root: () => string): void {
  protocol.handle(PLUGIN_SCHEME, async (req) => {
    const file = await resolvePluginFile(root(), req.url);
    if (!file) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}
