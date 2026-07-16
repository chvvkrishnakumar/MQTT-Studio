import { useEffect } from 'react';
import { useStudio } from './store';

/** Wire the main-process event stream into the store. Mount once, near the root. */
export function useMqttBridge() {
  useEffect(() => {
    const store = useStudio.getState();
    const offDelta = window.api.mqtt.onDelta(store.applyDelta);
    const offStatus = window.api.mqtt.onStatus(store.setStatus);
    window.api.mqtt.statuses().then(store.setStatuses);
    return () => {
      offDelta();
      offStatus();
    };
  }, []);
}
