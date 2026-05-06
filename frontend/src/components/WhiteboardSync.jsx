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
      || previousElement.isDeleted !== nextElement.isDeleted
      || previousElement.updated !== nextElement.updated
      || (previousElement.points?.length || 0) !== (nextElement.points?.length || 0)
      || previousElement.width !== nextElement.width
      || previousElement.height !== nextElement.height;

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
  const lastSentElements = useRef(new Map());
  const lastScene = useRef(getCachedScene(roomId));
  const pollIntervalRef = useRef(null);
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
    const api = excalidrawApiRef.current;
    if (!api || isApplyingRemote.current) return;

    const nextElements = api.getSceneElementsIncludingDeleted();
    const nextFiles = cloneFiles(api.getFiles());
    const nextAppState = extractSharedAppState(api.getAppState());

    // Detect changes by comparing serialized element snapshots
    const changedElements = [];
    for (const el of nextElements) {
      const prev = lastSentElements.current.get(el.id);
      const serialized = JSON.stringify(el);
      if (prev !== serialized) {
        changedElements.push(el);
        lastSentElements.current.set(el.id, serialized);
      }
    }

    const hasAppStateChange = lastScene.current.appState?.viewBackgroundColor !== nextAppState.viewBackgroundColor;

    if (changedElements.length === 0 && !hasAppStateChange) return;

    lastScene.current = { elements: nextElements, files: nextFiles, appState: nextAppState };
    sceneCache.set(String(roomId), lastScene.current);

    sendSignal({
      type: 'wb-delta',
      elements: changedElements,
      files: getReferencedFiles(changedElements, nextFiles),
      appState: hasAppStateChange ? nextAppState : undefined
    });

    // Periodic full snapshots for late joiners
    const now = Date.now();
    if (now - lastSnapshotAtRef.current >= 2000) {
      sendSignal({
        type: 'wb-snapshot',
        elements: nextElements,
        files: nextFiles,
        appState: nextAppState
      });
      lastSnapshotAtRef.current = now;
    }
  }, [sendSignal, roomId]);

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
      captureUpdate: CaptureUpdateAction.IMMEDIATELY
    });

    // Update lastSentElements so the poller doesn't echo back remote changes
    for (const el of mergedElements) {
      lastSentElements.current.set(el.id, JSON.stringify(el));
    }

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
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleApiReady = useCallback((api) => {
    excalidrawApiRef.current = api;
    syncCacheFromApi();

    // Initialize lastSentElements from current scene
    const els = api.getSceneElementsIncludingDeleted();
    for (const el of els) {
      lastSentElements.current.set(el.id, JSON.stringify(el));
    }

    // Start polling for changes every 50ms
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(flushChanges, 50);

    if (!hasRequestedSnapshot.current) {
      hasRequestedSnapshot.current = true;
      sendSignal({ type: 'wb-request-snapshot' });
    }
  }, [sendSignal, syncCacheFromApi, flushChanges]);

  const handleChange = useCallback((_elements, _appState) => {
    // The polling interval handles all sync; onChange just updates cache
    if (isApplyingRemote.current || !excalidrawApiRef.current) return;
    const api = excalidrawApiRef.current;
    lastScene.current = {
      elements: api.getSceneElementsIncludingDeleted(),
      files: cloneFiles(api.getFiles()),
      appState: extractSharedAppState(_appState)
    };
    sceneCache.set(String(roomId), lastScene.current);
  }, [roomId]);

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
