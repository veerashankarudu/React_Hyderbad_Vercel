import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';

/**
 * Custom hook for connecting to the Live Quiz Battle WebSocket.
 *
 * @param {number|null} sessionId  - Live session ID to subscribe to
 * @param {Object} handlers        - { onEvent, onQuestion, onQuestionResult }
 * @returns {{ isConnected, sendMessage }}
 */
export function useLiveSession(sessionId, handlers = {}) {
  const clientRef = useRef(null);
  const isConnectedRef = useRef(false);
  const handlersRef = useRef(handlers);

  // Keep handlers ref fresh on every render without recreating subscriptions
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!sessionId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      onConnect: () => {
        isConnectedRef.current = true;

        // Subscribe to general session events
        client.subscribe(`/topic/session/${sessionId}/events`, (message) => {
          try {
            const event = JSON.parse(message.body);
            handlersRef.current.onEvent?.(event);
          } catch (e) {
            console.error('Failed to parse session event', e);
          }
        });

        // Subscribe to question broadcasts
        client.subscribe(`/topic/session/${sessionId}/question`, (message) => {
          try {
            const question = JSON.parse(message.body);
            handlersRef.current.onQuestion?.(question);
          } catch (e) {
            console.error('Failed to parse question', e);
          }
        });

        // Subscribe to question result broadcasts
        client.subscribe(`/topic/session/${sessionId}/question-result`, (message) => {
          try {
            const result = JSON.parse(message.body);
            handlersRef.current.onQuestionResult?.(result);
          } catch (e) {
            console.error('Failed to parse question result', e);
          }
        });
      },
      onDisconnect: () => {
        isConnectedRef.current = false;
        handlersRef.current.onDisconnect?.();
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
        handlersRef.current.onError?.(frame);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      isConnectedRef.current = false;
      client.deactivate();
    };
  }, [sessionId]);

  const sendMessage = useCallback((destination, body) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body),
      });
    }
  }, []);

  return { sendMessage };
}
