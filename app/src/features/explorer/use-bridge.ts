import { useEffect } from 'react';
import { useStudio } from './store';
import { useExports } from './exports-store';

/** Wire the main-process event stream into the store. Mount once, near the root. */
export function useMqttBridge() {
  useEffect(() => {
    const store = useStudio.getState();
    const offDelta = window.api.mqtt.onDelta(store.applyDelta);
    const offStatus = window.api.mqtt.onStatus(store.setStatus);
    window.api.mqtt.statuses().then(store.setStatuses);

    // Live exports run in the main process; mirror their status here so the tree
    // and the detail button both reflect what's recording, across tab switches.
    const exports = useExports.getState();
    window.api.export.list().then(exports.hydrate);
    const offExport = window.api.export.onProgress(exports.apply);

    return () => {
      offDelta();
      offStatus();
      offExport();
    };
  }, []);
}
