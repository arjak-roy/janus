import React, { useEffect, useRef, useCallback } from 'react';
import { Excalidraw, CaptureUpdateAction } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const sceneCache = new Map();

function getCachedScene(roomId) {
  return sceneCache.get(String(roomId)) || {
    elements: [],
    files: {},
    appState: { viewBackgroundColor: '#ffffff' }
  };
}

function cloneFiles(files = {}) {
  return Object.fromEntries(Object.entries(files));
}

function extractSharedAppState(appState) {
  return {
    viewBackgroundColor: appState?.viewBackgroundColor || '#ffffff'
  };
}

function buildElementMap(elements = []) {
  return new Map(elements.map((element) => [element.id, element]));
}

function mergeElements(localElements = [], incomingElements = []) {
  const merged = buildElementMap(localElements);

  for (const incoming of incomingElements || []) {
    const current = merged.get(incoming.id);
    if (!current) {
      merged.set(incoming.id, incoming);
      continue;
    }

    const isNewer = incoming.version > current.version
      || (incoming.version === current.version && incoming.versionNonce !== current.versionNonce);

    if (isNewer) {
      merged.set(incoming.id, incoming);
    }
  }

  return Array.from(merged.values());
}

function getChangedElements(previousElements = [], nextElements = []) {
  const previousMap = buildElementMap(previousElements);
  const changed = [];

  for (const nextElement of nextElements) {
    const previousElement = previousMap.get(nextElement.id);
    if (!previousElement) {
      changed.push(nextElement);
      continue;
    }

    const hasChanged = previousElement.version !== nextElement.version
      || previousElement.versionNonce !== nextElement.versionNonce
      || previousElement.isDeleted !== nextElement.isDeleted;

    if (hasChanged) {
      changed.push(nextElement);
    }
  }

  return changed;
}

function getReferencedFiles(elements, files) {
  const referencedFiles = {};

  for (const element of elements) {
    if (element.fileId && files[element.fileId]) {
      referencedFiles[element.fileId] = files[element.fileId];
    }
  }

  return referencedFiles;
}

export default function WhiteboardSync({ roomId, sendSignal, signalBus }) {
  const excalidrawApiRef = useRef(null);
  const isApplyingRemote = useRef(false);
  const pendingElements = useRef(new Map());
  const pendingFiles = useRef({});
  const pendingAppState = useRef(null);
  const lastScene = useRef(getCachedScene(roomId));
  const rafRef = useRef(null);
  const hasRequestedSnapshot = useRef(false);
  const lastSnapshotAtRef = useRef(0);

  const syncCacheFromApi = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) return;

    const snapshot = {
      elements: api.getSceneElementsIncludingDeleted(),
      files: cloneFiles(api.getFiles()),
      appState: extractSharedAppState(api.getAppState())
    };

    lastScene.current = snapshot;
    sceneCache.set(String(roomId), snapshot);
  }, [roomId]);

  const flushChanges = useCallback(() => {
    rafRef.current = null;
    if (
      pendingElements.current.size === 0
      && Object.keys(pendingFiles.current).length === 0
      && !pendingAppState.current
    ) {
      return;
    }

    const elements = Array.from(pendingElements.current.values());
    const files = cloneFiles(pendingFiles.current);
    const appState = pendingAppState.current;

    pendingElements.current.clear();
    pendingFiles.current = {};
    pendingAppState.current = null;

    sendSignal({
      type: 'wb-delta',
      elements,
      files,
      appState
    });

    // Periodic full snapshots help late joiners converge even if only deltas were emitted.
    const now = Date.now();
    if (now - lastSnapshotAtRef.current >= 2000) {
      const api = excalidrawApiRef.current;
      if (api) {
        sendSignal({
          type: 'wb-snapshot',
          elements: api.getSceneElementsIncludingDeleted(),
          files: cloneFiles(api.getFiles()),
          appState: extractSharedAppState(api.getAppState())
        });
        lastSnapshotAtRef.current = now;
      }
    }
  }, [sendSignal]);

  const applyRemoteScene = useCallback((incomingElements = [], incomingFiles = {}, incomingAppState = {}) => {
    const api = excalidrawApiRef.current;
    if (!api) return;

    const mergedElements = mergeElements(api.getSceneElementsIncludingDeleted(), incomingElements);
    const mergedFiles = {
      ...cloneFiles(api.getFiles()),
      ...cloneFiles(incomingFiles)
    };

    isApplyingRemote.current = true;
    if (Object.keys(mergedFiles).length > 0) {
      api.addFiles(mergedFiles);
    }
    api.updateScene({
      elements: mergedElements,
      appState: {
        ...extractSharedAppState(api.getAppState()),
        ...incomingAppState
      },
      captureUpdate: CaptureUpdateAction.NEVER
    });
    isApplyingRemote.current = false;

    const snapshot = {
      elements: mergedElements,
      files: mergedFiles,
      appState: {
        ...extractSharedAppState(api.getAppState()),
        ...incomingAppState
      }
    };

    lastScene.current = snapshot;
    sceneCache.set(String(roomId), snapshot);
  }, [roomId]);

  const handleRemoteSignal = useCallback((signal) => {
    if (signal.type === 'wb-delta') {
      if (!excalidrawApiRef.current) return;
      applyRemoteScene(signal.elements, signal.files, signal.appState);
      return;
    }

    if (signal.type === 'wb-snapshot') {
      if (!excalidrawApiRef.current) return;
      applyRemoteScene(signal.elements, signal.files, signal.appState);
      return;
    }

    if (signal.type === 'wb-request-snapshot') {
      const api = excalidrawApiRef.current;
      const source = api
        ? {
            elements: api.getSceneElementsIncludingDeleted(),
            files: cloneFiles(api.getFiles()),
            appState: extractSharedAppState(api.getAppState())
          }
        : lastScene.current;

      const elements = source?.elements || [];
      const files = cloneFiles(source?.files || {});
      if (elements.length === 0 && Object.keys(files).length === 0) return;

      sendSignal({
        type: 'wb-snapshot',
        elements,
        files,
        appState: source?.appState || { viewBackgroundColor: '#ffffff' }
      });
    }
  }, [applyRemoteScene, sendSignal]);

  useEffect(() => {
    lastScene.current = getCachedScene(roomId);
    hasRequestedSnapshot.current = false;
  }, [roomId]);

  useEffect(() => {
    if (signalBus) {
      signalBus.current = handleRemoteSignal;
    }
    return () => {
      if (signalBus) signalBus.current = null;
    };
  }, [signalBus, handleRemoteSignal]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleApiReady = useCallback((api) => {
    excalidrawApiRef.current = api;
    syncCacheFromApi();

    if (!hasRequestedSnapshot.current) {
      hasRequestedSnapshot.current = true;
      sendSignal({ type: 'wb-request-snapshot' });
    }
  }, [sendSignal, syncCacheFromApi]);

  const handleChange = useCallback((_elements, appState) => {
    if (isApplyingRemote.current || !excalidrawApiRef.current) return;

    const api = excalidrawApiRef.current;
    const nextElements = api.getSceneElementsIncludingDeleted();
    const nextFiles = cloneFiles(api.getFiles());
    const nextSharedAppState = extractSharedAppState(appState);
    const changedElements = getChangedElements(lastScene.current.elements, nextElements);
    const hasAppStateChange = lastScene.current.appState.viewBackgroundColor !== nextSharedAppState.viewBackgroundColor;

    lastScene.current = {
      elements: nextElements,
      files: nextFiles,
      appState: nextSharedAppState
    };
    sceneCache.set(String(roomId), lastScene.current);

    if (changedElements.length === 0 && !hasAppStateChange) return;

    for (const element of changedElements) {
      pendingElements.current.set(element.id, element);
    }

    pendingFiles.current = {
      ...pendingFiles.current,
      ...getReferencedFiles(changedElements, nextFiles)
    };
    if (hasAppStateChange) {
      pendingAppState.current = nextSharedAppState;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(flushChanges);
  }, [flushChanges, roomId]);

  const initialScene = getCachedScene(roomId);

  return (
    <div className="whiteboard-canvas">
      <Excalidraw
        excalidrawAPI={handleApiReady}
        initialData={initialScene}
        isCollaborating
        onChange={handleChange}
      />
    </div>
  );
}
